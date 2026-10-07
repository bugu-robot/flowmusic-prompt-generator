import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { INSTRUMENTS } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import type { PreviewInstrument, PreviewGroove } from './music';
import { makeBehaviourSpec, makeGrooveSpec, makeInstrumentSpec, validateMusicSpec } from './music';

function behaviourSpec(instrumentId: string, match: RegExp) {
  const instrument = INSTRUMENTS.find((item) => item.id === instrumentId);
  expect(instrument, instrumentId).toBeDefined();
  const index = instrument!.behaviours.findIndex((behaviour) => match.test(behaviour));
  expect(index, `${instrumentId} behaviour ${match}`).toBeGreaterThanOrEqual(0);
  return makeBehaviourSpec(instrument as PreviewInstrument, instrument!.behaviours[index]!, index);
}

function grooveSpec(grooveId: string) {
  const groove = JAZZ_STYLES.flatMap((style) => style.grooves).find((item) => item.id === grooveId);
  expect(groove, grooveId).toBeDefined();
  return makeGrooveSpec(groove as PreviewGroove);
}

function expectSemanticQcToPass(spec: ReturnType<typeof makeGrooveSpec>) {
  expect(validateMusicSpec(spec).filter((rule) => !rule.ok), spec.source).toEqual([]);
}

describe('audio preview semantic mapping and QC', () => {
  it('classifies melodic and modal instrument behaviours before applying category fallbacks', () => {
    const melodicPiano = behaviourSpec('piano', /understated melodic phrases/);
    expect(melodicPiano.source).toBe('lyrical-phrase');
    expect(melodicPiano.tracks.some((track) => track.role === 'lead')).toBe(true);

    const quartalPiano = behaviourSpec('piano', /open quartal voicings/);
    expect(quartalPiano.source).toBe('quartal-voicing');
    expect(quartalPiano.semanticFamily).toBe('quartal-harmony');

    const modalBass = behaviourSpec('upright-bass', /a repeating modal ostinato/);
    expect(modalBass.source).toBe('modal-ostinato');
    expect(modalBass.semanticFamily).toBe('modal-bass-ostinato');

    for (const spec of [melodicPiano, quartalPiano, modalBass]) {
      expect(validateMusicSpec(spec).filter((rule) => !rule.ok), spec.source).toEqual([]);
    }
  });

  it('keeps the catalogued three-beat bass line in 3/4', () => {
    const bass = behaviourSpec('upright-bass', /across three beats/);
    expect(bass.source).toBe('jazz-waltz');
    expect(bass.meter).toEqual([3, 4]);
    expect(validateMusicSpec(bass).some((rule) => rule.rule === 'jazz-waltz-bass-three-beats' && rule.ok)).toBe(true);

    const groove = grooveSpec('jazz-waltz-three');
    expect(groove.meter).toEqual([3, 4]);
    expectSemanticQcToPass(groove);

    const chamberWaltz = grooveSpec('waltz');
    expect(chamberWaltz.source).toBe('jazz-waltz');
    expect(chamberWaltz.meter).toEqual([3, 4]);
    expectSemanticQcToPass(chamberWaltz);
  });

  it('keeps Contemporary Jazz flexible eighths in 4/4 with asymmetrical accents', () => {
    const spec = grooveSpec('contemporary-flex');
    expect(spec.source).toBe('contemporary-flex');
    expect(spec.semanticFamily).toBe('contemporary-flexible-eighths');
    expect(spec.meter).toEqual([4, 4]);
    expectSemanticQcToPass(spec);
  });

  it('separates Neo-Soul pocket, Boom-Bap, and its half-time variant', () => {
    const neoSoul = grooveSpec('neo-soul-pocket');
    expect(neoSoul.source).toBe('neo-soul');
    expect(neoSoul.semanticFamily).toBe('neo-soul-pocket');
    expect(neoSoul.source).not.toBe('straight-16-funk');
    expectSemanticQcToPass(neoSoul);

    const boomBap = grooveSpec('jazz-hop-boombap');
    expect(boomBap.source).toBe('boom-bap');
    expect(boomBap.semanticFamily).toBe('hip-hop-boom-bap');
    expectSemanticQcToPass(boomBap);

    const halfTime = grooveSpec('jazz-hop-half-time');
    expect(halfTime.source).toBe('boom-bap-half-time');
    expect(halfTime.semanticFamily).toBe('hip-hop-half-time');
    expectSemanticQcToPass(halfTime);

    const lofi = grooveSpec('lofi-chill');
    expect(lofi.source).toBe('boom-bap-soft');
    expectSemanticQcToPass(lofi);
  });

  it('uses loose, non-backbeat timing for Free Jazz and sparse brush timing for Noir', () => {
    const free = grooveSpec('free-time');
    expect(free.source).toBe('free-time');
    expect(free.semanticFamily).toBe('free-improvisation');
    expectSemanticQcToPass(free);

    const noir = grooveSpec('noir-slow-brush');
    expect(noir.source).toBe('noir-brushes');
    expect(noir.bpm).toBeLessThanOrEqual(64);
    expectSemanticQcToPass(noir);

    const noirOpen = grooveSpec('noir-open');
    expect(noirOpen.source).toBe('noir-brushes');
    expect(noirOpen.semanticFamily).toBe('noir-sparse-brushes');
    expectSemanticQcToPass(noirOpen);
  });

  it('requires chamber counterline and jazz harmony for Third Stream previews', () => {
    for (const id of ['third-stream-pulse', 'third-stream-light']) {
      const spec = grooveSpec(id);
      expect(spec.source).toBe('third-stream');
      expect(spec.semanticFamily).toBe('third-stream-chamber-jazz');
      expectSemanticQcToPass(spec);
    }
  });

  it('selects distinct FluidR3 kits, articulation events, and hand-percussion note ranges', () => {
    const instrumentById = (id: string) => INSTRUMENTS.find((item) => item.id === id) as PreviewInstrument;
    const toneSpecs = ['acoustic-drums', 'brush-drums', 'heavy-rock-drums'].map((id) => makeInstrumentSpec(instrumentById(id)));
    const kit = (index: number) => toneSpecs[index]!.tracks[0]!.percussionMapping!;
    expect(kit(0)).toMatchObject({ percussionKitFamily: 'acoustic-jazz', soundFontBank: 128, soundFontProgram: 32, soundFontPreset: 'Jazz' });
    expect(kit(1)).toMatchObject({ percussionKitFamily: 'brush', soundFontBank: 128, soundFontProgram: 40, soundFontPreset: 'Brush' });
    expect(kit(2)).toMatchObject({ percussionKitFamily: 'power-rock', soundFontBank: 128, soundFontProgram: 16, soundFontPreset: 'Power' });
    const eventSignatures = toneSpecs.map((spec) => JSON.stringify(spec.tracks[0]!.notes));
    expect(new Set(eventSignatures).size).toBe(3);
    for (const spec of toneSpecs) expectSemanticQcToPass(spec);

    const acousticBrushBehaviour = behaviourSpec('acoustic-drums', /feather-light jazz brush pulse/);
    expect(acousticBrushBehaviour.tracks[0]!.percussionMapping).toMatchObject({ percussionKitFamily: 'brush', soundFontBank: 128, soundFontProgram: 40 });
    expect(acousticBrushBehaviour.tracks[0]!.notes.some((event) => event.pitch === 40)).toBe(true);
    expectSemanticQcToPass(acousticBrushBehaviour);

    const expectedPitches: Record<string, number[]> = { congas: [62, 63, 64], bongos: [60, 61], timbales: [65, 66], 'soft-shaker': [70], 'brazilian-percussion': [36, 38, 67, 68, 70] };
    for (const [id, pitches] of Object.entries(expectedPitches)) {
      const spec = makeInstrumentSpec(instrumentById(id));
      const actual = new Set(spec.tracks[0]!.notes.map((event) => event.pitch));
      for (const pitch of pitches) expect(actual, id).toContain(pitch);
      expectSemanticQcToPass(spec);
    }

    const shakerBehaviour = behaviourSpec('soft-shaker', /broken-beat pulse/);
    expect(shakerBehaviour.tracks[0]!.notes.every((event) => event.velocity >= 30 && event.velocity <= 32)).toBe(true);
    expectSemanticQcToPass(shakerBehaviour);
  });

  it('keeps the main swing, bass, keyboard, and guitar behaviour concepts audibly separate in their event specs', () => {
    const drumBehaviours = [
      behaviourSpec('acoustic-drums', /light, controlled swing/),
      behaviourSpec('acoustic-drums', /restrained ride-cymbal timekeeping/),
      behaviourSpec('acoustic-drums', /clear swing eighths/),
      behaviourSpec('acoustic-drums', /hard-bop accents/),
      behaviourSpec('acoustic-drums', /buoyant two-beat/),
    ];
    expect(drumBehaviours.map((spec) => spec.source)).toEqual(['swing-light', 'swing-restrained-ride', 'swing-clear-eighth', 'hard-bop-ride', 'two-beat-early-swing']);
    expect(new Set(drumBehaviours.map((spec) => JSON.stringify(spec.tracks[0]!.notes))).size).toBe(drumBehaviours.length);

    const bassBehaviours = [
      behaviourSpec('upright-bass', /simple, warm and restrained foundation/),
      behaviourSpec('upright-bass', /soft, even walking pulse/),
      behaviourSpec('upright-bass', /gentle two-feel support/),
      behaviourSpec('upright-bass', /grounded modal pedal/),
      behaviourSpec('upright-bass', /repeating modal ostinato/),
      behaviourSpec('upright-bass', /tumbao-style/),
    ];
    expect(new Set(bassBehaviours.map((spec) => spec.source)).size).toBe(bassBehaviours.length);
    expect(new Set(bassBehaviours.map((spec) => JSON.stringify(spec.tracks[0]!.notes))).size).toBe(bassBehaviours.length);

    const keyboardBehaviours = [
      behaviourSpec('piano', /understated melodic phrases/),
      behaviourSpec('piano', /soft, spacious chord voicings/),
      behaviourSpec('piano', /light melodic comping/),
      behaviourSpec('piano', /crisp syncopated comping/),
      behaviourSpec('piano', /open quartal voicings/),
      behaviourSpec('piano', /montuno-style/),
    ];
    expect(new Set(keyboardBehaviours.map((spec) => spec.source)).size).toBe(keyboardBehaviours.length);

    const guitarBehaviours = [
      behaviourSpec('acoustic-guitar', /warm fingerstyle/),
      behaviourSpec('acoustic-guitar', /steady la pompe/),
      behaviourSpec('nylon-guitar', /gently syncopated melody/),
      behaviourSpec('jazz-electric-guitar', /tight offbeat funk comping/),
      behaviourSpec('manouche-guitar', /short, nimble melodic responses/),
    ];
    expect(new Set(guitarBehaviours.map((spec) => spec.source)).size).toBe(guitarBehaviours.length);
    expect(new Set(guitarBehaviours.map((spec) => JSON.stringify(spec.tracks.flatMap((track) => track.notes)))).size).toBe(guitarBehaviours.length);
    for (const spec of [...drumBehaviours, ...bassBehaviours, ...keyboardBehaviours, ...guitarBehaviours]) expectSemanticQcToPass(spec);
  });

  it('maps every catalogued groove explicitly and reserves identical patterns for related concepts', () => {
    const grooves = JAZZ_STYLES.flatMap((style) => style.grooves);
    const unique = new Map(grooves.map((groove) => [groove.id, groove]));
    const specs = [...unique.values()].map((groove) => makeGrooveSpec(groove));
    expect(specs).toHaveLength(unique.size);
    expect(new Set(specs.map((spec) => spec.source)).size).toBeGreaterThan(25);
    const byId = new Map(specs.map((spec) => [spec.id.replace('groove-', ''), spec]));
    expect(byId.get('relaxed-swing')!.source).toBe('swing-light');
    expect(byId.get('walking-swing')!.source).toBe('swing-restrained-ride');
    expect(byId.get('medium-swing')!.source).toBe('swing-medium-open');
    expect(byId.get('hard-swing')!.source).toBe('hard-bop-ride');
    expect(byId.get('two-beat')!.source).toBe('two-beat-early-swing');
    expect(byId.get('son')!.source).toBe('son-clave');
    expect(byId.get('mambo')!.source).toBe('mambo-bell');
    expect(byId.get('samba-soft')!.source).not.toBe(byId.get('samba-drive')!.source);
    expect(byId.get('lofi-chill')!.source).toBe('boom-bap-soft');
    expect(byId.get('lofi-straight')!.source).toBe('soft-straight');
    for (const spec of specs) expectSemanticQcToPass(spec);
  });

  it('checks the committed decoded-PCM kit regressions and rejects all invalid collisions', async () => {
    const report = JSON.parse(await readFile(new URL('../../public/audio-previews/audio-preview-similarity.json', import.meta.url), 'utf8')) as {
      summary: { instrumentTones: number; instrumentToneNearAudioPairs: number; instrumentToneIndistinguishablePairs: number; invalidCollisionGroups: number; invalidCollisionPairs: number; percussionKitFamiliesValidated: number };
      instrumentToneAudit: { comparedPairs: number; distinctFluidR3Presets: number; nearAudioPairs: unknown[]; indistinguishableDecodedPairs: unknown[]; documentedApproximations: Array<{ previewId: string; reason: string }> };
      regressions: Array<{ name: string; pass: boolean; featureSimilarity: { overall: number; timbre: number; envelope: number; bandEnergy: number } }>;
      assets: Array<{ previewId: string; audioFeatures: { rmsEnvelope: number[]; lowMidHighEnergy: number[]; spectralBandEnergy: number[] } }>;
      nearSpecDuplicateGroups: Array<{ pairs: Array<{ similarity?: { eventPatternSimilarity?: number } }> }>;
    };
    expect(report.summary.invalidCollisionGroups).toBe(0);
    expect(report.summary.invalidCollisionPairs).toBe(0);
    expect(report.summary.percussionKitFamiliesValidated).toBe(8);
    expect(report.instrumentToneAudit.comparedPairs).toBe(report.summary.instrumentTones * (report.summary.instrumentTones - 1) / 2);
    expect(report.summary.instrumentToneNearAudioPairs).toBe(report.instrumentToneAudit.nearAudioPairs.length);
    expect(report.summary.instrumentToneIndistinguishablePairs).toBe(report.instrumentToneAudit.indistinguishableDecodedPairs.length);
    expect(report.instrumentToneAudit.distinctFluidR3Presets).toBeGreaterThan(0);
    expect(report.instrumentToneAudit.documentedApproximations.every((item) => item.reason.length > 0)).toBe(true);
    expect(report.regressions).toHaveLength(3);
    for (const comparison of report.regressions) {
      expect(comparison.pass, comparison.name).toBe(true);
      expect(comparison.featureSimilarity.overall, comparison.name).toBeLessThan(0.9);
      expect(comparison.featureSimilarity.timbre, comparison.name).toBeLessThan(0.9);
      expect(comparison.featureSimilarity.envelope, comparison.name).toBeLessThan(0.98);
    }
    const features = new Map(report.assets.map((item) => [item.previewId, item.audioFeatures]));
    const acoustic = features.get('instrument-acoustic-drums')!;
    const brush = features.get('instrument-brush-drums')!;
    const heavy = features.get('instrument-heavy-rock-drums')!;
    expect(acoustic.rmsEnvelope).not.toEqual(brush.rmsEnvelope);
    expect(acoustic.rmsEnvelope).not.toEqual(heavy.rmsEnvelope);
    expect(brush.rmsEnvelope).not.toEqual(heavy.rmsEnvelope);
    expect(acoustic.lowMidHighEnergy).not.toEqual(brush.lowMidHighEnergy);
    expect(acoustic.lowMidHighEnergy).not.toEqual(heavy.lowMidHighEnergy);
    expect(brush.lowMidHighEnergy).not.toEqual(heavy.lowMidHighEnergy);
    expect(acoustic.spectralBandEnergy).not.toEqual(brush.spectralBandEnergy);
    expect(acoustic.spectralBandEnergy).not.toEqual(heavy.spectralBandEnergy);
    expect(brush.spectralBandEnergy).not.toEqual(heavy.spectralBandEnergy);
    for (const group of report.nearSpecDuplicateGroups) for (const pair of group.pairs) {
      expect(pair.similarity?.eventPatternSimilarity).toBeGreaterThanOrEqual(0.86);
      expect(pair.similarity?.eventPatternSimilarity).toBeLessThanOrEqual(1);
    }
  });
});
