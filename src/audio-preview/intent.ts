import type { PreviewEntry } from './catalog';
import type { MusicSpec, MusicTrack } from './music';

export type SimilarityClassification = 'ACCEPTED_EQUIVALENT' | 'EXPECTED_VARIANT' | 'INVALID_COLLISION';
export interface IntentDecision { classification: SimilarityClassification; reason: string; intentRule?: string; renderedDifferences?: string[] }
interface IntentAliasRule {
  id: string;
  category: PreviewEntry['category'];
  instrumentId?: string;
  sources: Array<{ id: string; label: string }>;
  reason: string;
}

// This is a source-intent allowlist, independent of generated family/pattern.
// IDs AND complete descriptions are checked so editing a catalog description
// cannot inherit an old exemption. No group is admitted merely for sounding alike.
export const INTENT_ALIAS_RULES: IntentAliasRule[] = [
  {
    id: 'feather-light-brush-pulse', category: 'behaviour',
    sources: [
      { id: 'brush-drums::a feather-light brushed pulse', label: 'a feather-light brushed pulse' },
      { id: 'acoustic-drums::a feather-light jazz brush pulse with minimal fills and no strong backbeat', label: 'a feather-light jazz brush pulse with minimal fills and no strong backbeat' },
    ],
    reason: 'Both explicitly request a feather-light brush pulse. The acoustic-kit behaviour switches to the Brush preset for that instruction; its minimal-fill/no-strong-backbeat wording is already satisfied by the same soft swirl/tap performance. This exemption applies only to these brush behaviours, never to the two generic instrument tones.',
  },
  {
    id: 'straight-funk-rock-drive', category: 'groove',
    sources: [
      { id: 'funk', label: 'Driving funk-rock pulse' },
      { id: 'fusion', label: 'Precise straight funk-rock fusion drive' },
    ],
    reason: 'Both request the same straight, driving funk-rock rhythm-section reference. Fusion names the style context; neither description adds a different tempo, subdivision, articulation or ensemble role.',
  },
  {
    id: 'gentle-light-swing', category: 'groove',
    sources: [
      { id: 'light-swing', label: 'Light swing feel' },
      { id: 'soft-swing', label: 'Gentle, polished swing feel' },
    ],
    reason: 'Light and gentle specify the same feathered small-combo swing reference, with no different tempo or arrangement instruction. Polished is a production adjective, not a new playing technique.',
  },
  {
    id: 'syncopated-electric-funk-bass', category: 'behaviour', instrumentId: 'electric-bass',
    sources: [
      { id: 'electric-bass::a syncopated electric-bass line locked to straight 16th-note accents', label: 'a syncopated electric-bass line locked to straight 16th-note accents' },
      { id: 'electric-bass::a syncopated electric-bass groove supporting a straight funk-rock pulse', label: 'a syncopated electric-bass groove supporting a straight funk-rock pulse' },
    ],
    reason: 'Both specify the same supporting, syncopated electric-bass pocket locked to a straight funk-rock sixteenth grid; line versus groove does not change its density or role.',
  },
];

const normalize = (text: string): string => text.trim().replace(/\s+/g, ' ').toLowerCase();
export function approvedEquivalentIntent(a: PreviewEntry, b: PreviewEntry): { intentRule: string; reason: string } | undefined {
  if (a.category === 'behaviour' && b.category === 'behaviour' && normalize(a.sourceLabel).length > 0 && normalize(a.sourceLabel) === normalize(b.sourceLabel)) {
    return { intentRule: 'identical-behaviour-description', reason: 'The complete playing-behaviour description is identical; different instrument realizations intentionally illustrate that same instruction.' };
  }
  for (const rule of INTENT_ALIAS_RULES) {
    const matches = (entry: PreviewEntry): boolean => entry.category === rule.category && (!rule.instrumentId || entry.instrumentId === rule.instrumentId)
      && rule.sources.some(source => source.id === entry.sourceCatalogId && normalize(source.label) === normalize(entry.sourceLabel));
    if (a.sourceCatalogId !== b.sourceCatalogId && matches(a) && matches(b)) return { intentRule: rule.id, reason: rule.reason };
  }
  return undefined;
}

function mapping(track: MusicTrack): string {
  return [track.percussionMapping?.soundFontBank ?? 0, track.percussionMapping?.soundFontProgram ?? track.program].join('|');
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

// Evidence comes from musical events and parameters, never a generated pattern
// name. Uniform MIDI velocity gain is ignored because loudness normalization
// can erase it. Likewise a transposed melodic copy alone does not establish new
// intent. Percussion pitches select different samples rather than transposing.
export function renderedIntentDifferences(a: MusicSpec, b: MusicSpec): string[] {
  const differences: string[] = [];
  if (a.meter.join('/') !== b.meter.join('/')) differences.push(`Meter ${a.meter.join('/')} versus ${b.meter.join('/')}.`);
  if (Math.abs(a.bpm - b.bpm) >= 6) differences.push(`Tempo ${a.bpm} versus ${b.bpm} BPM.`);
  const left = a.tracks.filter(track => track.notes.length > 0).sort((x, y) => mapping(x).localeCompare(mapping(y)));
  const right = b.tracks.filter(track => track.notes.length > 0).sort((x, y) => mapping(x).localeCompare(mapping(y)));
  if (left.length !== right.length || left.some((track, index) => mapping(track) !== (right[index] && mapping(right[index]!)))) {
    differences.push('Different sounding instrument/preset or populated ensemble-voice inventory.');
    return differences;
  }
  for (let index = 0; index < left.length; index++) {
    const x = left[index]!, y = right[index]!;
    const xNotes = [...x.notes].sort((p, q) => p.beat - q.beat || p.pitch - q.pitch);
    const yNotes = [...y.notes].sort((p, q) => p.beat - q.beat || p.pitch - q.pitch);
    const xAttacks = [...new Set(xNotes.map(event => event.beat))];
    const yAttacks = [...new Set(yNotes.map(event => event.beat))];
    if (x.role === 'rhythm' && [...new Set(xNotes.map(event => event.pitch))].sort().join(',') !== [...new Set(yNotes.map(event => event.pitch))].sort().join(',')) differences.push('rhythm: different percussion sample/articulation pitches.');
    const unmatched = xAttacks.filter(beat => !yAttacks.some(other => Math.abs(beat - other) <= .025)).length
      + yAttacks.filter(beat => !xAttacks.some(other => Math.abs(beat - other) <= .025)).length;
    if (unmatched >= 2) differences.push(`${x.role}: different attack timing/spacing (${unmatched} unmatched attacks).`);
    if (Math.abs(xNotes.length - yNotes.length) >= 2) differences.push(`${x.role}: different note/chord density (${xNotes.length} versus ${yNotes.length} events).`);
    if (Math.abs(median(xNotes.map(n => n.duration)) - median(yNotes.map(n => n.duration))) >= .15) differences.push(`${x.role}: different sustained versus clipped articulation.`);
    if (xNotes.length === yNotes.length && xNotes.length > 0) {
      const pitchDeltas = xNotes.map((n, i) => n.pitch - yNotes[i]!.pitch);
      const commonDelta = median(pitchDeltas);
      if (x.role !== 'rhythm' && pitchDeltas.filter(delta => delta !== commonDelta).length >= Math.max(2, xNotes.length * .15)) differences.push(`${x.role}: different melodic contour or chord voicing.`);
      const velocityDeltas = xNotes.map((n, i) => n.velocity - yNotes[i]!.velocity);
      const gain = velocityDeltas.reduce((sum, delta) => sum + delta, 0) / velocityDeltas.length;
      if (velocityDeltas.reduce((sum, delta) => sum + Math.abs(delta - gain), 0) / velocityDeltas.length >= 5) differences.push(`${x.role}: different relative accent dynamics after excluding uniform gain.`);
    }
  }
  return differences;
}

export function classifyIntentSimilarity(a: PreviewEntry, b: PreviewEntry, aSpec: MusicSpec, bSpec: MusicSpec): IntentDecision {
  const equivalent = approvedEquivalentIntent(a, b);
  if (equivalent) return { classification: 'ACCEPTED_EQUIVALENT', ...equivalent };
  const renderedDifferences = renderedIntentDifferences(aSpec, bSpec);
  if (renderedDifferences.length) return { classification: 'EXPECTED_VARIANT', reason: 'No equivalent-intent exemption applies. The preview retains measurable musical differences: ' + renderedDifferences.join(' '), renderedDifferences };
  return { classification: 'INVALID_COLLISION', reason: 'Different source instructions have no approved equivalent intent and no meaningful rendered tempo, articulation, density, arrangement or role difference. Shared generated family/pattern is not an exemption.' };
}
