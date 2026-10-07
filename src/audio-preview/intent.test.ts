import { describe, expect, it } from 'vitest';
import { buildPreviewCatalog, type PreviewEntry } from './catalog';
import { approvedEquivalentIntent, classifyIntentSimilarity, INTENT_ALIAS_RULES } from './intent';
import { flattenEntries } from './qc';
import { nearSpecMetrics, reasonAndClassify, serializeSpec } from '../../scripts/audio-preview/similarity';
import { validateMusicSpec, type MusicSpec } from './music';
import { readFile } from 'node:fs/promises';

const catalog = buildPreviewCatalog();
const entries = flattenEntries(catalog.manifest);
const spec = (entry: PreviewEntry): MusicSpec => catalog.specs[entry.previewId]!;
const bySource = (id: string): PreviewEntry => entries.find(entry => entry.sourceCatalogId === id)!;
const unknown = (entry: PreviewEntry, label: string): PreviewEntry => ({ ...entry, sourceCatalogId: `unreviewed-${label}`, sourceLabel: label });

describe('source-intent similarity policy', () => {
  it('rejects unknown semantic reuse even when generated family and pattern are identical or renamed', () => {
    for (const id of ['medium-swing', 'vibraphone::delicate, widely spaced notes']) {
      const a = unknown(bySource(id), 'Sparse open phrases');
      const b = unknown(a, 'Dense arranged punches');
      const identical = structuredClone(spec(bySource(id)));
      expect(classifyIntentSimilarity(a, b, identical, structuredClone(identical)).classification).toBe('INVALID_COLLISION');
      expect(reasonAndClassify({ entry: a, spec: identical }, { entry: b, spec: structuredClone(identical) }, 'spec').classification).toBe('INVALID_COLLISION');
      b.pattern = 'a-new-pattern-name';
      expect(classifyIntentSimilarity(a, b, identical, structuredClone(identical)).classification).toBe('INVALID_COLLISION');
      expect(reasonAndClassify({ entry: a, spec: identical }, { entry: b, spec: structuredClone(identical) }, 'spec').classification).toBe('INVALID_COLLISION');
    }
  });

  it('re-audits every same-family/same-pattern pair and permits acceptance only with source intent', () => {
    let matchingPairs = 0;
    for (let left = 0; left < entries.length; left++) for (let right = left + 1; right < entries.length; right++) {
      const a = entries[left]!, b = entries[right]!;
      if (a.semanticFamily !== b.semanticFamily || a.pattern !== b.pattern) continue;
      matchingPairs++;
      const decision = reasonAndClassify({ entry: a, spec: spec(a) }, { entry: b, spec: spec(b) }, 'spec');
      if (decision.classification === 'ACCEPTED_EQUIVALENT') {
        expect(approvedEquivalentIntent(a, b), `${a.sourceLabel} / ${b.sourceLabel}`).toBeDefined();
        expect(decision.intentRule).toBe(approvedEquivalentIntent(a, b)?.intentRule);
      }
    }
    expect(matchingPairs).toBeGreaterThan(0);
  });

  it('accepts only reviewed source aliases and invalidates an exemption when its description or ID changes', () => {
    for (const rule of INTENT_ALIAS_RULES) {
      const [a, b] = rule.sources.map(source => bySource(source.id));
      expect(a, rule.id).toBeDefined();
      expect(b, rule.id).toBeDefined();
      expect(approvedEquivalentIntent(a!, b!)?.intentRule).toBe(rule.id);
      expect(classifyIntentSimilarity(a!, b!, spec(a!), spec(b!)).classification).toBe('ACCEPTED_EQUIVALENT');
      expect(approvedEquivalentIntent(a!, { ...b!, sourceLabel: 'Fast dense foreground solo with heavy accents' })).toBeUndefined();
      expect(approvedEquivalentIntent(a!, { ...b!, sourceCatalogId: 'new-catalog-entry' })).toBeUndefined();
    }
  });

  it('allows identical behaviour instructions across instruments without allowing instrument-tone or category reuse', () => {
    const a = bySource('trumpet::measured melodic improvisation');
    const b = bySource('tenor-sax::measured melodic improvisation');
    expect(approvedEquivalentIntent(a, b)?.intentRule).toBe('identical-behaviour-description');
    expect(approvedEquivalentIntent({ ...a, category: 'instrument' }, b)).toBeUndefined();
    expect(approvedEquivalentIntent({ ...a, category: 'groove' }, { ...b, category: 'groove' })).toBeUndefined();
    expect(approvedEquivalentIntent({ ...a, sourceLabel: '' }, { ...b, sourceLabel: '' })).toBeUndefined();
  });

  it('requires rendered differences for EXPECTED_VARIANT; gain, transposition and metadata alone do not qualify', () => {
    const entry = bySource('medium-swing');
    const a = unknown(entry, 'One source intent'), b = unknown(entry, 'Another source intent');
    const changed = structuredClone(spec(entry));
    changed.bpm += 2;
    changed.semanticFamily = 'different-family';
    changed.source = 'renamed-pattern';
    for (const track of changed.tracks) track.role = 'renamed-role';
    for (const track of changed.tracks) for (const event of track.notes) { event.velocity += 10; if (!track.percussionMapping) event.pitch += 12; }
    expect(classifyIntentSimilarity(a, b, spec(entry), changed).classification).toBe('INVALID_COLLISION');
    changed.bpm += 10;
    const decision = classifyIntentSimilarity(a, b, spec(entry), changed);
    expect(decision.classification).toBe('EXPECTED_VARIANT');
    expect(decision.renderedDifferences?.some(detail => detail.includes('Tempo'))).toBe(true);
  });

  it('audits every exact/near event-spec pair rather than hard-coding the reported examples', () => {
    expect(entries).toHaveLength(242);
    let compared = 0;
    for (let left = 0; left < entries.length; left++) for (let right = left + 1; right < entries.length; right++) {
      const a = entries[left]!, b = entries[right]!, aSpec = spec(a), bSpec = spec(b);
      if (serializeSpec(aSpec) !== serializeSpec(bSpec) && !nearSpecMetrics(aSpec, bSpec)) continue;
      compared++;
      const decision = reasonAndClassify({ entry: a, spec: aSpec }, { entry: b, spec: bSpec }, 'spec');
      expect(decision.classification, `${a.sourceLabel} / ${b.sourceLabel}`).not.toBe('INVALID_COLLISION');
      if (decision.classification === 'ACCEPTED_EQUIVALENT') expect(decision.intentRule).toBe(approvedEquivalentIntent(a, b)?.intentRule);
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('keeps every reviewed swing tempo and arrangement intent distinct', () => {
    const swing = ['bebop-swing', 'big-band-medium', 'medium-swing', 'brisk-swing', 'swing', 'up-tempo'].map(bySource);
    expect(new Set(swing.map(entry => serializeSpec(spec(entry)))).size).toBe(swing.length);
    expect(spec(swing[0]!).bpm).toBeGreaterThan(spec(swing[1]!).bpm);
    expect(spec(swing[5]!).bpm).toBeGreaterThan(spec(swing[2]!).bpm);
    for (let left = 0; left < swing.length; left++) for (let right = left + 1; right < swing.length; right++) {
      const a = swing[left]!, b = swing[right]!;
      expect(classifyIntentSimilarity(a, b, spec(a), spec(b)).classification).toBe('EXPECTED_VARIANT');
    }
    const band = spec(bySource('big-band-medium'));
    const calls = band.tracks.find(track => track.role === 'section-call')!;
    const answers = band.tracks.find(track => track.role === 'section-answer')!;
    expect(calls.notes.filter(event => event.beat < 4).every(event => event.beat < 2)).toBe(true);
    expect(answers.notes.filter(event => event.beat < 4).every(event => event.beat >= 2)).toBe(true);
  });

  it('uses real horn-section punches for Big Band and a small-combo rhythm section for Hard Bop', () => {
    const a = bySource('big-band-swing'), b = bySource('hard-swing');
    expect(spec(a).tracks.filter(track => track.role === 'ensemble-punches')).toHaveLength(2);
    expect(spec(b).tracks.some(track => track.role.startsWith('section') || track.role === 'ensemble-punches')).toBe(false);
    expect(classifyIntentSimilarity(a, b, spec(a), spec(b)).classification).toBe('EXPECTED_VARIANT');
  });

  it('keeps every ensemble channel tied to one preset and rejects overwritten section timbres', () => {
    for (const entry of entries) {
      const channels = new Map<number, Set<string>>();
      for (const track of spec(entry).tracks) {
        const patches = channels.get(track.channel) ?? new Set<string>();
        patches.add(`${track.percussionMapping?.soundFontBank ?? 0}/${track.program}`);
        channels.set(track.channel, patches);
      }
      expect([...channels.values()].every(patches => patches.size === 1), entry.sourceLabel).toBe(true);
    }
    const band = structuredClone(spec(bySource('big-band-medium')));
    for (const track of band.tracks) if (track.role.startsWith('section')) track.channel = 0;
    expect(validateMusicSpec(band).some(rule => rule.rule === 'channel-preset-consistency' && !rule.ok)).toBe(true);
  });

  it('retains swung cafe time below the piano and sufficient listening time for fast Bebop', () => {
    const swing = spec(bySource('cafe-piano-swing')), straight = spec(bySource('cafe-piano-straight'));
    const swingDrums = swing.tracks.find(track => track.role === 'rhythm')!;
    const straightDrums = straight.tracks.find(track => track.role === 'rhythm')!;
    expect(swingDrums.notes.some(event => Math.abs(event.beat % 1 - 2 / 3) < .01)).toBe(true);
    expect(straightDrums.notes.every(event => Number.isInteger(event.beat))).toBe(true);
    expect(swingDrums.notes.every(event => event.velocity < Math.min(...swing.tracks.find(track => track.role === 'lead')!.notes.map(event => event.velocity)))).toBe(true);
    expect(classifyIntentSimilarity(bySource('cafe-piano-swing'), bySource('cafe-piano-straight'), swing, straight).classification).toBe('EXPECTED_VARIANT');
    const bebop = spec(bySource('bebop-swing'));
    expect(bebop.bpm).toBeGreaterThanOrEqual(168);
    expect(bebop.bars * bebop.meter[0] * 60 / bebop.bpm).toBeGreaterThanOrEqual(5.5);
  });

  it('plays occasional replies more sparsely than regular short conversational responses', () => {
    const occasional = bySource('flugelhorn::occasional soft melodic replies');
    const regular = bySource('trumpet::short, warm responses');
    expect(spec(occasional).tracks[0]!.notes.length).toBeLessThan(spec(regular).tracks[0]!.notes.length);
    expect(spec(occasional).tracks[0]!.notes.slice(1).every((event, index) => event.beat - spec(occasional).tracks[0]!.notes[index]!.beat >= 5)).toBe(true);
    expect(classifyIntentSimilarity(occasional, regular, spec(occasional), spec(regular)).classification).toBe('EXPECTED_VARIANT');
  });

  it('separates Vibraphone sparse single notes from sustained polyphonic chord colours', () => {
    const a = bySource('vibraphone::delicate, widely spaced notes'), b = bySource('vibraphone::soft shimmering chord colours');
    const single = spec(a).tracks[0]!, chords = spec(b).tracks[0]!;
    expect(single.role).toBe('lead');
    expect(single.notes.length).toBeLessThanOrEqual(8);
    expect(new Set(single.notes.map(event => event.beat)).size).toBe(single.notes.length);
    expect(single.notes.slice(1).every((event, index) => event.beat - single.notes[index]!.beat >= 2)).toBe(true);
    expect(chords.role).toBe('harmony');
    expect(chords.notes.filter(event => event.beat === 0)).toHaveLength(4);
    expect(chords.notes.every(event => event.duration >= 3)).toBe(true);
    expect(classifyIntentSimilarity(a, b, spec(a), spec(b)).classification).toBe('EXPECTED_VARIANT');
  });

  it('records an independently valid intent rule for every committed accepted-equivalent pair', async () => {
    const report = JSON.parse(await readFile(new URL('../../public/audio-previews/audio-preview-similarity.json', import.meta.url), 'utf8')) as {
      intentRegressions: Array<{ pass: boolean; classification: string; renderedDifferences: string[]; featureSimilarity: { overall: number } }>;
      exactSpecDuplicateGroups: Array<{ pairs: Array<{ a: string; b: string; classification: string; intentRule?: string }> }>;
      nearSpecDuplicateGroups: Array<{ pairs: Array<{ a: string; b: string; classification: string; intentRule?: string }> }>;
      nearAudioSimilarityGroups: Array<{ pairs: Array<{ a: string; b: string; classification: string; intentRule?: string }> }>;
    };
    const byId = new Map(entries.map(entry => [entry.previewId, entry]));
    for (const group of [...report.exactSpecDuplicateGroups, ...report.nearSpecDuplicateGroups, ...report.nearAudioSimilarityGroups]) for (const pair of group.pairs) {
      expect(pair.classification).not.toBe('INVALID_COLLISION');
      if (pair.classification === 'ACCEPTED_EQUIVALENT') {
        const approval = approvedEquivalentIntent(byId.get(pair.a)!, byId.get(pair.b)!);
        expect(approval, `${pair.a} / ${pair.b}`).toBeDefined();
        expect(pair.intentRule).toBe(approval!.intentRule);
      }
    }
    expect(report.intentRegressions).toHaveLength(17);
    for (const pair of report.intentRegressions) {
      expect(pair.pass).toBe(true);
      expect(pair.classification).toBe('EXPECTED_VARIANT');
      expect(pair.renderedDifferences.length).toBeGreaterThan(0);
      expect(pair.featureSimilarity.overall).toBeGreaterThanOrEqual(0);
      expect(pair.featureSimilarity.overall).toBeLessThanOrEqual(1);
    }
  });
});
