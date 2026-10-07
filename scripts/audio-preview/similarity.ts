import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPreviewCatalog, type PreviewEntry } from '../../src/audio-preview/catalog';
import { flattenEntries } from '../../src/audio-preview/qc';
import type { MusicEvent, MusicSpec, MusicTrack } from '../../src/audio-preview/music';
import process from 'node:process';

const REPORT_JSON = 'public/audio-previews/audio-preview-similarity.json';
const REPORT_MD = 'public/audio-previews/audio-preview-similarity.md';
const SAMPLE_RATE = 11_025;
const ENVELOPE_BINS = 48;
const AUDIO_NEAR_THRESHOLD = 0.9;

interface AudioFeatures {
  durationSeconds: number;
  rms: number;
  rmsEnvelope: number[];
  onsetDensityPerSecond: number;
  transientDensityPerSecond: number;
  spectralCentroidHzApprox: number;
  lowMidHighEnergy: [number, number, number];
  spectralBandEnergy: number[];
  spectralBandEnvelope: number[];
  zeroCrossingRate: number;
}
interface AuditItem {
  entry: PreviewEntry;
  spec: MusicSpec;
  audio: AudioFeatures;
}
type Classification = 'ACCEPTED_EQUIVALENT' | 'EXPECTED_VARIANT' | 'INVALID_COLLISION';
interface PairRecord {
  a: string;
  b: string;
  classification: Classification;
  reason: string;
  similarity?: Record<string, unknown>;
}
interface SimilarityGroup {
  groupId: string;
  classification: Classification;
  reason: string;
  items: Array<{ previewId: string; sourceLabel: string; instrumentId?: string; category: string; semanticFamily: string; pattern: string; percussionKitFamily?: string; timbreFamily: string }>;
  pairs: PairRecord[];
}
interface SimilarityReportDocument {
  summary: { instrumentTones: number; instrumentToneNearAudioPairs: number; instrumentToneIndistinguishablePairs: number; behaviourPairs: number; grooves: number; totalAssets: number; exactSpecDuplicateGroups: number; nearSpecDuplicateGroups: number; nearAudioSimilarityGroups: number; acceptedEquivalentGroups: number; expectedVariantGroups: number; invalidCollisionGroups: number; invalidCollisionPairs: number; percussionKitFamiliesValidated: number };
  instrumentToneAudit: { comparedPairs: number; distinctFluidR3Presets: number; sharedPresetPairs: Array<{ a: string; b: string; bank: number; program: number; preset: string; classification: Classification }>; nearAudioPairs: PairRecord[]; indistinguishableDecodedPairs: PairRecord[]; documentedApproximations: Array<{ previewId: string; instrument: string; preset: string; reason: string }> };
  percussionIdentities: Array<{ instrument: string; soundFontBank: number; soundFontProgram: number; soundFontPreset: string; articulation: string; valid: boolean }>;
  regressions: Array<{ name: string; pass: boolean; featureSimilarity: Record<string, number>; reason: string }>;
  groups: SimilarityGroup[];
}

function run(command: string, args: string[]): Promise<{ code: number; stdout: Buffer; stderr: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolveRun({ code: code ?? 1, stdout: Buffer.concat(stdout), stderr }));
  });
}

function decodePcmFeatures(pcm: Buffer): AudioFeatures {
  if (pcm.length < 4 || pcm.length % 4 !== 0) throw new Error('FFmpeg returned empty or malformed float PCM');
  const count = pcm.length / 4;
  const envelopeSquares = Array<number>(ENVELOPE_BINS).fill(0);
  const envelopeCounts = Array<number>(ENVELOPE_BINS).fill(0);
  const spectralBinSquares = Array.from({ length: ENVELOPE_BINS }, () => Array<number>(8).fill(0));
  const spectralTotals = Array<number>(8).fill(0);
  const frameSize = Math.max(1, Math.floor(SAMPLE_RATE * 0.025));
  const frameSquares: number[] = [];
  let frameSquare = 0;
  let frameCount = 0;
  let previousSign = 0;
  let zeroCrossings = 0;
  let sumSquares = 0;
  let low = 0;
  let belowTwoK = 0;
  let lowSquares = 0;
  let midSquares = 0;
  let highSquares = 0;
  const alphaLow = 1 - Math.exp((-2 * Math.PI * 250) / SAMPLE_RATE);
  const alphaTwoK = 1 - Math.exp((-2 * Math.PI * 2_000) / SAMPLE_RATE);
  const cutoffs = [80, 160, 315, 630, 1_250, 2_500, 5_000];
  const spectralAlphas = cutoffs.map((cutoff) => 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE));
  const spectralFilters = Array<number>(cutoffs.length).fill(0);

  for (let index = 0; index < count; index++) {
    const value = pcm.readFloatLE(index * 4);
    const square = value * value;
    sumSquares += square;
    const envelopeBin = Math.min(ENVELOPE_BINS - 1, Math.floor((index * ENVELOPE_BINS) / count));
    envelopeSquares[envelopeBin]! += square;
    envelopeCounts[envelopeBin]!++;
    frameSquare += square;
    frameCount++;

    const sign = value >= 0 ? 1 : -1;
    if (previousSign && sign !== previousSign) zeroCrossings++;
    previousSign = sign;
    low += alphaLow * (value - low);
    belowTwoK += alphaTwoK * (value - belowTwoK);
    const mid = belowTwoK - low;
    const high = value - belowTwoK;
    lowSquares += low * low;
    midSquares += mid * mid;
    highSquares += high * high;

    let previousBandEdge = 0;
    for (let band = 0; band < spectralFilters.length; band++) {
      spectralFilters[band]! += spectralAlphas[band]! * (value - spectralFilters[band]!);
      const bandSample = spectralFilters[band]! - previousBandEdge;
      const bandSquare = bandSample * bandSample;
      spectralBinSquares[envelopeBin]![band]! += bandSquare;
      spectralTotals[band]! += bandSquare;
      previousBandEdge = spectralFilters[band]!;
    }
    const upperBandSample = value - previousBandEdge;
    const upperBandSquare = upperBandSample * upperBandSample;
    spectralBinSquares[envelopeBin]![7]! += upperBandSquare;
    spectralTotals[7]! += upperBandSquare;

    if (frameCount === frameSize || index === count - 1) {
      frameSquares.push(Math.sqrt(frameSquare / frameCount));
      frameSquare = 0;
      frameCount = 0;
    }
  }

  const rms = Math.sqrt(sumSquares / count);
  const rmsEnvelope = envelopeSquares.map((energy, index) => Math.sqrt(energy / Math.max(1, envelopeCounts[index]!)) / Math.max(rms, 1e-9));
  const energyTotal = lowSquares + midSquares + highSquares || 1;
  const lowMidHighEnergy: [number, number, number] = [lowSquares / energyTotal, midSquares / energyTotal, highSquares / energyTotal];
  const spectralTotal = spectralTotals.reduce((sum, energy) => sum + energy, 0) || 1;
  const spectralBandEnergy = spectralTotals.map((energy) => energy / spectralTotal);
  const spectralBandEnvelope = spectralBinSquares.flatMap((bands) => {
    const binTotal = bands.reduce((sum, energy) => sum + energy, 0) || 1;
    return bands.map((energy) => Math.sqrt(energy / binTotal));
  });
  const bandCenters = [40, 113, 224, 446, 885, 1_768, 3_536, 5_250];
  const spectralCentroidHzApprox = spectralBandEnergy.reduce((sum, energy, index) => sum + energy * bandCenters[index]!, 0);
  const maxFrame = Math.max(...frameSquares, 1e-9);
  let onsets = 0;
  let transients = 0;
  for (let index = 1; index < frameSquares.length; index++) {
    const current = frameSquares[index]!;
    const prior = frameSquares[index - 1]!;
    if (current > maxFrame * 0.12 && current - prior > maxFrame * 0.075) onsets++;
    if (current > maxFrame * 0.18 && current > prior * 1.65) transients++;
  }
  const durationSeconds = count / SAMPLE_RATE;
  return {
    durationSeconds,
    rms,
    rmsEnvelope,
    onsetDensityPerSecond: onsets / durationSeconds,
    transientDensityPerSecond: transients / durationSeconds,
    spectralCentroidHzApprox,
    lowMidHighEnergy,
    spectralBandEnergy,
    spectralBandEnvelope,
    zeroCrossingRate: zeroCrossings / count,
  };
}

async function readAudioFeatures(file: string): Promise<AudioFeatures> {
  const decoded = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', '-']);
  if (decoded.code !== 0) throw new Error(`FFmpeg PCM decode failed for ${file}: ${decoded.stderr}`);
  return decodePcmFeatures(decoded.stdout);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let aPower = 0;
  let bPower = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    dot += a[index]! * b[index]!;
    aPower += a[index]! ** 2;
    bPower += b[index]! ** 2;
  }
  if (!aPower || !bPower) return aPower === bPower ? 1 : 0;
  return Math.max(0, Math.min(1, dot / Math.sqrt(aPower * bPower)));
}

function featureSimilarity(a: AudioFeatures, b: AudioFeatures): Record<string, number> {
  const envelope = cosineSimilarity(a.rmsEnvelope, b.rmsEnvelope);
  const spectralEnvelope = cosineSimilarity(a.spectralBandEnvelope, b.spectralBandEnvelope);
  const band = Math.max(0, 1 - 0.5 * a.lowMidHighEnergy.reduce((sum, value, index) => sum + Math.abs(value - b.lowMidHighEnergy[index]!), 0));
  const detailedBand = Math.max(0, 1 - 0.5 * a.spectralBandEnergy.reduce((sum, value, index) => sum + Math.abs(value - b.spectralBandEnergy[index]!), 0));
  const centroid = Math.exp(-Math.abs(Math.log(Math.max(a.spectralCentroidHzApprox, 1) / Math.max(b.spectralCentroidHzApprox, 1))));
  const onset = Math.exp(-Math.abs(a.onsetDensityPerSecond - b.onsetDensityPerSecond) / Math.max(a.onsetDensityPerSecond, b.onsetDensityPerSecond, 1));
  const transient = Math.exp(-Math.abs(a.transientDensityPerSecond - b.transientDensityPerSecond) / Math.max(a.transientDensityPerSecond, b.transientDensityPerSecond, 1));
  const duration = Math.exp(-Math.abs(Math.log(a.durationSeconds / b.durationSeconds)));
  const zeroCrossing = Math.exp(-Math.abs(a.zeroCrossingRate - b.zeroCrossingRate) / Math.max(a.zeroCrossingRate, b.zeroCrossingRate, 0.001));
  const timbre = 0.4 * detailedBand + 0.4 * centroid + 0.2 * zeroCrossing;
  const overall = 0.18 * envelope + 0.08 * spectralEnvelope + 0.12 * band + 0.25 * detailedBand + 0.20 * centroid + 0.06 * onset + 0.05 * transient + 0.03 * duration + 0.03 * zeroCrossing;
  return Object.fromEntries(Object.entries({ overall, timbre, envelope, spectralEnvelope, bandEnergy: band, detailedBandEnergy: detailedBand, spectralBrightness: centroid, onsetDensity: onset, transientDensity: transient, duration, zeroCrossing }).map(([key, value]) => [key, Number(value.toFixed(5))]));
}

function trackMapping(track: MusicTrack): string {
  const percussion = track.percussionMapping;
  return [track.instrumentId, track.role, track.channel, percussion?.percussionKitFamily ?? '', percussion?.soundFontBank ?? 0, percussion?.soundFontProgram ?? track.program, track.program].join('|');
}

function serializeSpec(spec: MusicSpec): string {
  const tracks = spec.tracks.map((track) => ({ mapping: trackMapping(track), events: track.notes.map((event) => [event.beat, event.pitch, event.duration, event.velocity]).sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1]) - Number(b[1])) })).sort((a, b) => a.mapping.localeCompare(b.mapping));
  return JSON.stringify({ bpm: spec.bpm, meter: spec.meter, bars: spec.bars, tracks });
}

function eventPattern(spec: MusicSpec): Array<{ mapping: string; events: MusicEvent[] }> {
  return spec.tracks.map((track) => ({ mapping: trackMapping(track), events: [...track.notes].sort((a, b) => a.beat - b.beat || a.pitch - b.pitch) })).sort((a, b) => a.mapping.localeCompare(b.mapping));
}

function nearSpecMetrics(a: MusicSpec, b: MusicSpec): { eventPatternSimilarity: number; velocityMeanAbsDiff: number; bpmDelta: number; trackPatternSimilarity: Array<{ mapping: string; score: number }> } | undefined {
  if (a.meter.join('/') !== b.meter.join('/') || Math.abs(a.bpm - b.bpm) > 2 || a.tracks.length !== b.tracks.length) return undefined;
  const aTracks = eventPattern(a);
  const bTracks = eventPattern(b);
  if (aTracks.some((track, index) => track.mapping !== bTracks[index]?.mapping)) return undefined;
  const trackPatternSimilarity: Array<{ mapping: string; score: number }> = [];
  let velocityDelta = 0;
  let velocityMatches = 0;
  for (let trackIndex = 0; trackIndex < aTracks.length; trackIndex++) {
    const left = aTracks[trackIndex]!.events;
    const right = bTracks[trackIndex]!.events;
    let matched = 0;
    const used = new Set<number>();
    for (const event of left) {
      const index = right.findIndex((other, candidate) => !used.has(candidate) && other.pitch === event.pitch && Math.abs(other.beat - event.beat) <= 0.025 && Math.abs(other.duration - event.duration) <= 0.08);
      if (index < 0) continue;
      used.add(index);
      matched++;
      velocityDelta += Math.abs(event.velocity - right[index]!.velocity);
      velocityMatches++;
    }
    const totalEvents = left.length + right.length;
    trackPatternSimilarity.push({ mapping: aTracks[trackIndex]!.mapping, score: totalEvents ? (2 * matched) / totalEvents : 1 });
  }
  const eventPatternSimilarity = trackPatternSimilarity.reduce((sum, track) => sum + track.score, 0) / Math.max(1, trackPatternSimilarity.length);
  if (eventPatternSimilarity < 0.86 || velocityMatches === 0) return undefined;
  return { eventPatternSimilarity: Number(eventPatternSimilarity.toFixed(5)), velocityMeanAbsDiff: Number((velocityDelta / velocityMatches).toFixed(3)), bpmDelta: Math.abs(a.bpm - b.bpm), trackPatternSimilarity: trackPatternSimilarity.map(track => ({ ...track, score: Number(track.score.toFixed(5)) })) };
}

function reasonAndClassify(a: PreviewEntry, b: PreviewEntry, context: 'spec'|'audio', eventPatternSimilarity?: number, audioMetrics?: Record<string, number>): { classification: Classification; reason: string } {
  if (a.category === 'instrument' && b.category === 'instrument' && a.instrumentId !== b.instrumentId) {
    const samePatch = a.soundFontBank === b.soundFontBank && a.soundFontProgram === b.soundFontProgram;
    if (samePatch && (a.fidelityStatus === 'TIMBRE_APPROXIMATION' || b.fidelityStatus === 'TIMBRE_APPROXIMATION')) {
      return { classification: 'EXPECTED_VARIANT', reason: `The catalog labels differ but FluidR3 resolves both to the same GM patch; TIMBRE_APPROXIMATION is recorded (${a.soundFontPreset}).` };
    }
    if (samePatch && (a.percussionKitFamily !== b.percussionKitFamily || a.articulationFamily !== b.articulationFamily)) {
      return { classification: 'EXPECTED_VARIANT', reason: 'These hand-percussion tones intentionally share FluidR3 Standard bank/program 128/0; their note-range and articulation-family mappings select the different conga, bongo, timbale, shaker, or Brazilian samples.' };
    }
    if (context === 'audio' && !samePatch && (audioMetrics?.timbre ?? 1) < 0.995) {
      return { classification: 'EXPECTED_VARIANT', reason: 'These instrument tones use different SoundFont presets and have a different decoded spectral timbre signature; the common neutral phrase raises the full-track similarity score.' };
    }
    return { classification: 'INVALID_COLLISION', reason: 'Distinct instrument-tone identities must not share effectively the same decoded audio feature signature.' };
  }
  if (a.semanticFamily === b.semanticFamily && a.pattern === b.pattern) {
    return context === 'spec'
      ? { classification: 'ACCEPTED_EQUIVALENT', reason: 'These entries use the same canonical pattern and semantic family; reuse is intentional.' }
      : { classification: 'ACCEPTED_EQUIVALENT', reason: 'Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.' };
  }
  if (a.semanticFamily === b.semanticFamily) {
    return { classification: 'EXPECTED_VARIANT', reason: 'The previews share a semantic family but use separate canonical patterns; this is an expected family-level variation.' };
  }
  const sameLabel = a.sourceLabel.toLowerCase() === b.sourceLabel.toLowerCase();
  if (sameLabel && a.instrumentId !== b.instrumentId) {
    return { classification: 'ACCEPTED_EQUIVALENT', reason: 'The same behavior description is reused for different instruments; the reference phrase is intentionally shared.' };
  }
  if (context === 'audio' && (eventPatternSimilarity === undefined || eventPatternSimilarity < 0.86)) {
    return { classification: 'EXPECTED_VARIANT', reason: 'The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.' };
  }
  return { classification: 'INVALID_COLLISION', reason: 'The semantic families differ, and no equivalent-pattern policy documents this pair as intentional reuse.' };
}

function approximationReason(instrumentId: string | undefined): string {
  const reasons: Record<string, string> = {
    'flugelhorn': 'GM program 56 is the trumpet patch; FluidR3 has no dedicated flugelhorn patch.',
    'manouche-guitar': 'GM program 26 is the generic jazz electric-guitar patch, not an acoustic Selmer/Manouche sample set.',
    'upright-bass': 'GM program 32 is the general acoustic-bass patch and does not model a specific upright instrument.',
    'soft-shaker': 'MIDI percussion pitch 70 uses FluidR3 maracas samples as a restrained shaker approximation.',
    'brazilian-percussion': 'The standard kit pitches for surdo, caixa, agogo and maracas approximate pandeiro/tamborim ensemble colors.'
  };
  return reasons[instrumentId ?? ''] ?? 'FluidR3 does not provide a dedicated patch or articulation for this catalog identity.';
}

function itemLabel(item: AuditItem): SimilarityGroup['items'][number] {
  return { previewId: item.entry.previewId, sourceLabel: item.entry.sourceLabel, instrumentId: item.entry.instrumentId, category: item.entry.category, semanticFamily: item.entry.semanticFamily, pattern: item.entry.pattern, percussionKitFamily: item.entry.percussionKitFamily, timbreFamily: item.entry.timbreFamily };
}

function connectedGroups(pairs: PairRecord[], itemById: Map<string, AuditItem>, prefix: string): SimilarityGroup[] {
  const adjacency = new Map<string, Set<string>>();
  for (const pair of pairs) {
    if (!adjacency.has(pair.a)) adjacency.set(pair.a, new Set());
    if (!adjacency.has(pair.b)) adjacency.set(pair.b, new Set());
    adjacency.get(pair.a)!.add(pair.b);
    adjacency.get(pair.b)!.add(pair.a);
  }
  const visited = new Set<string>();
  const groups: SimilarityGroup[] = [];
  for (const start of [...adjacency.keys()].sort()) {
    if (visited.has(start)) continue;
    const stack = [start];
    const ids = new Set<string>();
    visited.add(start);
    while (stack.length) {
      const id = stack.pop()!;
      ids.add(id);
      for (const neighbor of adjacency.get(id) ?? []) if (!visited.has(neighbor)) { visited.add(neighbor); stack.push(neighbor); }
    }
    const groupPairs = pairs.filter((pair) => ids.has(pair.a) && ids.has(pair.b));
    const classification: Classification = groupPairs.some((pair) => pair.classification === 'INVALID_COLLISION') ? 'INVALID_COLLISION' : groupPairs.some((pair) => pair.classification === 'EXPECTED_VARIANT') ? 'EXPECTED_VARIANT' : 'ACCEPTED_EQUIVALENT';
    const reasons = [...new Set(groupPairs.map((pair) => pair.reason))];
    groups.push({ groupId: `${prefix}-${String(groups.length + 1).padStart(3, '0')}`, classification, reason: reasons.join(' '), items: [...ids].sort().map((id) => itemLabel(itemById.get(id)!)), pairs: groupPairs });
  }
  return groups;
}

function pairKey(a: string, b: string): string { return [a, b].sort().join('::'); }

async function mapConcurrent<T>(items: T[], count: number, action: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  await Promise.all(Array.from({ length: count }, async () => {
    while (index < items.length) {
      const item = items[index++];
      if (item !== undefined) await action(item);
    }
  }));
}

function roundedFeatures(features: AudioFeatures): AudioFeatures {
  return {
    durationSeconds: Number(features.durationSeconds.toFixed(3)),
    rms: Number(features.rms.toFixed(6)),
    rmsEnvelope: features.rmsEnvelope.map(value => Number(value.toFixed(4))),
    onsetDensityPerSecond: Number(features.onsetDensityPerSecond.toFixed(3)),
    transientDensityPerSecond: Number(features.transientDensityPerSecond.toFixed(3)),
    spectralCentroidHzApprox: Number(features.spectralCentroidHzApprox.toFixed(1)),
    lowMidHighEnergy: features.lowMidHighEnergy.map(value => Number(value.toFixed(5))) as [number, number, number],
    spectralBandEnergy: features.spectralBandEnergy.map(value => Number(value.toFixed(5))),
    spectralBandEnvelope: features.spectralBandEnvelope.map(value => Number(value.toFixed(4))),
    zeroCrossingRate: Number(features.zeroCrossingRate.toFixed(5)),
  };
}

function markdownReport(report: SimilarityReportDocument): string {
  const counts = report.summary;
  const rows = [
    '# Audio Preview Similarity & Fidelity Report',
    '',
    `- Instrument tones: ${counts.instrumentTones}`,
    `- Behavior/instrument pairs: ${counts.behaviourPairs}`,
    `- Grooves: ${counts.grooves}`,
    `- Total MP3 previews: ${counts.totalAssets}`,
    `- Instrument-tone PCM comparisons: ${report.instrumentToneAudit.comparedPairs}`,
    `- Instrument-tone near-audio pairs: ${counts.instrumentToneNearAudioPairs}`,
    `- Instrument tones with indistinguishable decoded timbre signatures: ${counts.instrumentToneIndistinguishablePairs}`,
    `- Distinct FluidR3 presets represented: ${report.instrumentToneAudit.distinctFluidR3Presets}`,
    `- Documented TIMBRE_APPROXIMATION entries: ${report.instrumentToneAudit.documentedApproximations.length}`,
    `- Exact spec duplicate groups: ${counts.exactSpecDuplicateGroups}`,
    `- Near spec duplicate groups: ${counts.nearSpecDuplicateGroups}`,
    `- Near-audio similarity groups (score ≥ ${AUDIO_NEAR_THRESHOLD}): ${counts.nearAudioSimilarityGroups}`,
    `- ACCEPTED_EQUIVALENT groups: ${counts.acceptedEquivalentGroups}`,
    `- EXPECTED_VARIANT groups: ${counts.expectedVariantGroups}`,
    `- INVALID_COLLISION groups: ${counts.invalidCollisionGroups}`,
    `- Percussion kit families validated: ${counts.percussionKitFamiliesValidated}/8`,
    '',
    '## PCM feature method',
    '',
    'MP3 files are decoded by FFmpeg to mono float PCM at 11,025 Hz. The audit compares a 48-bin RMS envelope, 25 ms onset/transient density, zero-crossing rate, duration, low/mid/high energy ratios, and eight one-pole spectral bands split at 80, 160, 315, 630, 1,250, 2,500 and 5,000 Hz. Band energy and per-time-bin band envelopes supply the timbre and spectral-shape measures; scores are deterministic, explainable feature distances, not an ML or perceptual model. MP3 hashes are not used as similarity evidence.',
    '',
    '## Instrument-tone audit',
    '',
    `All ${report.instrumentToneAudit.comparedPairs} instrument-tone pairs are compared using decoded PCM features. The catalog uses ${report.instrumentToneAudit.distinctFluidR3Presets} distinct FluidR3 bank/program selections; ${report.instrumentToneAudit.sharedPresetPairs.length} pairs intentionally share a bank/program, with their note-range or documented approximation recorded below.`,
    `- Near-audio pairs (score ≥ ${AUDIO_NEAR_THRESHOLD}): ${report.instrumentToneAudit.nearAudioPairs.length}`,
    `- Near-identical decoded timbre signatures (overall ≥ 0.99 and timbre ≥ 0.995): ${report.instrumentToneAudit.indistinguishableDecodedPairs.length}`,
    ...report.instrumentToneAudit.documentedApproximations.map(item => `- **TIMBRE_APPROXIMATION · ${item.instrument}** — ${item.preset}: ${item.reason}`),
    '',
    '## Percussion identity',
    '',
    '| Instrument | FluidR3 bank/program | Preset | MIDI articulation / pitch mapping | QC |',
    '|---|---:|---|---|---|',
    ...report.percussionIdentities.map((item) => `| ${item.instrument} | ${item.soundFontBank}/${item.soundFontProgram} | ${item.soundFontPreset} | ${item.articulation} | ${item.valid ? 'PASS' : 'FAIL'} |`),
    '',
    '## Key regression comparisons',
    '',
    ...report.regressions.map((item) => `- **${item.name}: ${item.pass ? 'PASS' : 'FAIL'}** — feature similarity ${item.featureSimilarity.overall}; ${item.reason}`),
    '',
    '## Collision groups',
    '',
    ...report.groups.map((group) => `### ${group.groupId} · ${group.classification}\n\n${group.reason}\n\n${group.items.map(item => `- ${item.sourceLabel} (${item.instrumentId ?? item.category}) · ${item.semanticFamily} / ${item.pattern} · ${item.percussionKitFamily ?? item.timbreFamily}`).join('\n')}\n`),
    '',
    'The JSON report includes per-asset PCM feature signatures, exact/near spec comparisons, pair-level decoded-audio metrics, classifications, and source metadata for the development review filters.',
    '',
  ];
  return rows.join('\n');
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  const catalog = buildPreviewCatalog();
  const entries = flattenEntries(catalog.manifest);
  const itemById = new Map<string, AuditItem>();
  let completed = 0;
  await mapConcurrent(entries, 4, async (entry) => {
    const spec = catalog.specs[entry.previewId];
    if (!spec) throw new Error(`Missing generated specification for ${entry.previewId}`);
    const audio = await readAudioFeatures(join(root, 'public', entry.audioPath));
    itemById.set(entry.previewId, { entry, spec, audio });
    completed++;
    if (completed % 40 === 0) process.stdout.write(`Decoded PCM features ${completed}/${entries.length}\n`);
  });

  const exactBuckets = new Map<string, AuditItem[]>();
  for (const item of itemById.values()) {
    const signature = serializeSpec(item.spec);
    exactBuckets.set(signature, [...(exactBuckets.get(signature) ?? []), item]);
  }
  const exactPairs: PairRecord[] = [];
  for (const group of exactBuckets.values()) {
    if (group.length < 2) continue;
    for (let left = 0; left < group.length; left++) for (let right = left + 1; right < group.length; right++) {
      const a = group[left]!; const b = group[right]!;
      const classification = reasonAndClassify(a.entry, b.entry, 'spec');
      exactPairs.push({ a: a.entry.previewId, b: b.entry.previewId, ...classification });
    }
  }

  const nearSpecPairs: PairRecord[] = [];
  const items = [...itemById.values()];
  for (let left = 0; left < items.length; left++) for (let right = left + 1; right < items.length; right++) {
    const a = items[left]!; const b = items[right]!;
    if (serializeSpec(a.spec) === serializeSpec(b.spec)) continue;
    const metrics = nearSpecMetrics(a.spec, b.spec);
    if (!metrics) continue;
    const classification = reasonAndClassify(a.entry, b.entry, 'spec');
    const variant: PairRecord = { a: a.entry.previewId, b: b.entry.previewId, ...classification, similarity: metrics };
    if (variant.classification === 'ACCEPTED_EQUIVALENT' && metrics.velocityMeanAbsDiff > 0) {
      variant.classification = 'EXPECTED_VARIANT';
      variant.reason = 'The canonical concept is reused with a small event/velocity change; expected variant differences are recorded for review.';
    }
    nearSpecPairs.push(variant);
  }

  const audioPairs: PairRecord[] = [];
  const instrumentToneComparisons: Array<{ a: AuditItem; b: AuditItem; metrics: Record<string, number> }> = [];
  const regressionIds = ['instrument-acoustic-drums', 'instrument-brush-drums', 'instrument-heavy-rock-drums'];
  const regressionPairs = new Map<string, Record<string, number>>();
  for (let left = 0; left < items.length; left++) for (let right = left + 1; right < items.length; right++) {
    const a = items[left]!; const b = items[right]!;
    const metrics = featureSimilarity(a.audio, b.audio);
    const key = pairKey(a.entry.previewId, b.entry.previewId);
    if (a.entry.category === 'instrument' && b.entry.category === 'instrument') instrumentToneComparisons.push({ a, b, metrics });
    if (regressionIds.includes(a.entry.previewId) && regressionIds.includes(b.entry.previewId)) regressionPairs.set(key, metrics);
    if (metrics.overall < AUDIO_NEAR_THRESHOLD) continue;
    const structural = nearSpecMetrics(a.spec, b.spec);
    const classification = reasonAndClassify(a.entry, b.entry, 'audio', structural?.eventPatternSimilarity, metrics);
    audioPairs.push({ a: a.entry.previewId, b: b.entry.previewId, ...classification, similarity: { ...metrics, ...(structural ? { eventPatternSimilarity: structural.eventPatternSimilarity } : {}) } });
  }

  const exactGroups = connectedGroups(exactPairs, itemById, 'spec-exact');
  const nearSpecGroups = connectedGroups(nearSpecPairs, itemById, 'spec-near');
  const nearAudioGroups = connectedGroups(audioPairs, itemById, 'audio-near');
  const groups = [...exactGroups, ...nearSpecGroups, ...nearAudioGroups];
  const uniqueGroupKeys = new Set<string>();
  const uniqueGroups = groups.filter((group) => {
    const key = [...group.items.map(item => item.previewId)].sort().join('|');
    if (uniqueGroupKeys.has(key)) return false;
    uniqueGroupKeys.add(key);
    return true;
  });
  const percussionInstrumentIds = ['acoustic-drums', 'brush-drums', 'heavy-rock-drums', 'congas', 'bongos', 'timbales', 'soft-shaker', 'brazilian-percussion'];
  const percussionIdentities = percussionInstrumentIds.map((id) => {
    const item = itemById.get(`instrument-${id}`)!;
    const spec = item.spec;
    const mapping = spec.tracks.find(track => track.percussionMapping)?.percussionMapping;
    const notes = new Set(spec.tracks.flatMap(track => track.notes.map(event => event.pitch)));
    const rangeChecks: Record<string, boolean> = {
      'acoustic-drums': mapping?.percussionKitFamily === 'acoustic-jazz' && mapping.soundFontBank === 128 && mapping.soundFontProgram === 32 && [36, 38, 51].every(pitch => notes.has(pitch)),
      'brush-drums': mapping?.percussionKitFamily === 'brush' && mapping.soundFontBank === 128 && mapping.soundFontProgram === 40 && notes.has(40) && notes.has(38) && notes.has(39),
      'heavy-rock-drums': mapping?.percussionKitFamily === 'power-rock' && mapping.soundFontBank === 128 && mapping.soundFontProgram === 16 && notes.has(36) && notes.has(38),
      congas: [...notes].some(pitch => pitch >= 62 && pitch <= 64),
      bongos: [...notes].some(pitch => pitch === 60) && [...notes].some(pitch => pitch === 61),
      timbales: notes.has(65) && notes.has(66),
      'soft-shaker': notes.has(70) && item.entry.fidelityStatus === 'TIMBRE_APPROXIMATION',
      'brazilian-percussion': [36, 38, 67, 68, 70].every(pitch => notes.has(pitch)) && item.entry.fidelityStatus === 'TIMBRE_APPROXIMATION',
    };
    return { instrumentId: id, instrument: item.entry.sourceLabel, percussionKitFamily: item.entry.percussionKitFamily, soundFontBank: item.entry.soundFontBank, soundFontProgram: item.entry.soundFontProgram, soundFontPreset: item.entry.soundFontPreset, articulation: item.entry.articulationFamily, fidelityStatus: item.entry.fidelityStatus, notePitches: [...notes].sort((a, b) => a - b), valid: rangeChecks[id] ?? false };
  });
  const acousticVsBrush = regressionPairs.get(pairKey(regressionIds[0]!, regressionIds[1]!));
  const acousticVsHeavy = regressionPairs.get(pairKey(regressionIds[0]!, regressionIds[2]!));
  const brushVsHeavy = regressionPairs.get(pairKey(regressionIds[1]!, regressionIds[2]!));
  const regressions = [
    { name: 'Acoustic vs Brush', a: regressionIds[0], b: regressionIds[1], pass: Boolean(acousticVsBrush && acousticVsBrush.overall < 0.9), featureSimilarity: acousticVsBrush ?? {}, reason: 'Jazz bank 128/program 32 vs Brush bank 128/program 40; Brush Swirl event pitch 40 and brush snares differ from the standard kit phrase.' },
    { name: 'Acoustic vs Heavy Rock', a: regressionIds[0], b: regressionIds[2], pass: Boolean(acousticVsHeavy && acousticVsHeavy.overall < 0.9), featureSimilarity: acousticVsHeavy ?? {}, reason: 'Jazz bank 128/program 32 vs Power bank 128/program 16 with distinct kick/snare/crash articulation.' },
    { name: 'Brush vs Heavy Rock', a: regressionIds[1], b: regressionIds[2], pass: Boolean(brushVsHeavy && brushVsHeavy.overall < 0.9), featureSimilarity: brushVsHeavy ?? {}, reason: 'Brush bank 128/program 40 and Brush Swirl event pitch 40 vs Power bank 128/program 16 and strong kick/snare events.' },
  ];
  const instrumentToneItems = items.filter(item => item.entry.category === 'instrument');
  const instrumentTonePairRecord = ({ a, b, metrics }: (typeof instrumentToneComparisons)[number]): PairRecord => ({ a: a.entry.previewId, b: b.entry.previewId, ...reasonAndClassify(a.entry, b.entry, 'audio', undefined, metrics), similarity: metrics });
  const instrumentToneNearAudioPairs = instrumentToneComparisons.filter(pair => pair.metrics.overall >= AUDIO_NEAR_THRESHOLD).map(instrumentTonePairRecord);
  const instrumentToneIndistinguishablePairs = instrumentToneComparisons.filter(pair => pair.metrics.overall >= 0.99 && pair.metrics.timbre >= 0.995).map(instrumentTonePairRecord);
  const sharedPresetPairs = instrumentToneComparisons.filter(({ a, b }) => a.entry.soundFontBank === b.entry.soundFontBank && a.entry.soundFontProgram === b.entry.soundFontProgram).map((pair) => ({ a: pair.a.entry.previewId, b: pair.b.entry.previewId, bank: pair.a.entry.soundFontBank, program: pair.a.entry.soundFontProgram, preset: pair.a.entry.soundFontPreset, classification: reasonAndClassify(pair.a.entry, pair.b.entry, 'audio', undefined, pair.metrics).classification }));
  const documentedApproximations = instrumentToneItems.filter(item => item.entry.fidelityStatus === 'TIMBRE_APPROXIMATION').map(item => ({ previewId: item.entry.previewId, instrument: item.entry.sourceLabel, preset: item.entry.soundFontPreset, reason: approximationReason(item.entry.instrumentId) }));
  const instrumentToneAudit = { comparedPairs: instrumentToneItems.length * (instrumentToneItems.length - 1) / 2, distinctFluidR3Presets: new Set(instrumentToneItems.map(item => `${item.entry.soundFontBank}/${item.entry.soundFontProgram}`)).size, sharedPresetPairs, nearAudioPairs: instrumentToneNearAudioPairs, indistinguishableDecodedPairs: instrumentToneIndistinguishablePairs, documentedApproximations };
  const classificationCounts = { ACCEPTED_EQUIVALENT: 0, EXPECTED_VARIANT: 0, INVALID_COLLISION: 0 };
  for (const group of uniqueGroups) classificationCounts[group.classification]++;
  const invalidPairs = new Map<string, PairRecord>();
  for (const pair of [...exactPairs, ...nearSpecPairs, ...audioPairs]) if (pair.classification === 'INVALID_COLLISION') invalidPairs.set(pairKey(pair.a, pair.b), pair);
  const instrumentToneCount = entries.filter(entry => entry.category === 'instrument').length;
  const behaviourCount = entries.filter(entry => entry.category === 'behaviour').length;
  const grooveCount = entries.filter(entry => entry.category === 'groove').length;
  const auditAssets = items.map((item) => {
    const flags: string[] = [];
    if (exactPairs.some(pair => pair.a === item.entry.previewId || pair.b === item.entry.previewId)) flags.push('exact-spec-duplicate');
    if (nearSpecPairs.some(pair => pair.a === item.entry.previewId || pair.b === item.entry.previewId)) flags.push('near-spec-duplicate');
    if (audioPairs.some(pair => pair.a === item.entry.previewId || pair.b === item.entry.previewId)) flags.push('near-audio-similarity');
    if ([...exactPairs, ...nearSpecPairs, ...audioPairs].some(pair => pair.classification === 'INVALID_COLLISION' && (pair.a === item.entry.previewId || pair.b === item.entry.previewId))) flags.push('invalid-collision');
    const nearStatuses = [...exactPairs, ...nearSpecPairs, ...audioPairs].filter(pair => pair.a === item.entry.previewId || pair.b === item.entry.previewId).map(pair => pair.classification);
    if (nearStatuses.includes('ACCEPTED_EQUIVALENT')) flags.push('accepted-equivalent');
    if (nearStatuses.includes('EXPECTED_VARIANT')) flags.push('expected-variant');
    return { previewId: item.entry.previewId, sourceLabel: item.entry.sourceLabel, category: item.entry.category, instrumentId: item.entry.instrumentId, instrument: item.entry.instrument, semanticFamily: item.entry.semanticFamily, pattern: item.entry.pattern, percussionKitFamily: item.entry.percussionKitFamily, timbreFamily: item.entry.timbreFamily, articulationFamily: item.entry.articulationFamily, fidelityStatus: item.entry.fidelityStatus, soundFontBank: item.entry.soundFontBank, soundFontProgram: item.entry.soundFontProgram, soundFontPreset: item.entry.soundFontPreset, audioPath: item.entry.audioPath, similarityFlags: flags, audioFeatures: roundedFeatures(item.audio) };
  });
  const report: SimilarityReportDocument & Record<string, unknown> = {
    version: 1,
    method: { decoder: 'FFmpeg', sampleRate: SAMPLE_RATE, channels: 1, sampleFormat: 'float32le', envelopeBins: ENVELOPE_BINS, envelopeWindowSeconds: 0.025, spectralMethod: 'eight one-pole low-pass bands with edges at 80, 160, 315, 630, 1250, 2500 and 5000 Hz; per-bin normalized RMS band envelopes', overallWeights: { rmsEnvelope: 0.18, spectralEnvelope: 0.08, lowMidHighEnergy: 0.12, detailedBandEnergy: 0.25, spectralCentroid: 0.20, onsetDensity: 0.06, transientDensity: 0.05, duration: 0.03, zeroCrossingRate: 0.03 }, timbreWeights: { detailedBandEnergy: 0.4, spectralCentroid: 0.4, zeroCrossingRate: 0.2 }, nearAudioThreshold: AUDIO_NEAR_THRESHOLD, hashesUsedForSimilarity: false },
    summary: { instrumentTones: instrumentToneCount, instrumentToneNearAudioPairs: instrumentToneNearAudioPairs.length, instrumentToneIndistinguishablePairs: instrumentToneIndistinguishablePairs.length, behaviourPairs: behaviourCount, grooves: grooveCount, totalAssets: entries.length, exactSpecDuplicateGroups: exactGroups.length, nearSpecDuplicateGroups: nearSpecGroups.length, nearAudioSimilarityGroups: nearAudioGroups.length, acceptedEquivalentGroups: classificationCounts.ACCEPTED_EQUIVALENT, expectedVariantGroups: classificationCounts.EXPECTED_VARIANT, invalidCollisionGroups: classificationCounts.INVALID_COLLISION, invalidCollisionPairs: invalidPairs.size, percussionKitFamiliesValidated: percussionIdentities.filter(item => item.valid).length },
    instrumentToneAudit,
    percussionIdentities,
    regressions,
    exactSpecDuplicateGroups: exactGroups,
    nearSpecDuplicateGroups: nearSpecGroups,
    nearAudioSimilarityGroups: nearAudioGroups,
    groups: uniqueGroups,
    assets: auditAssets,
    invalidPairs: [...invalidPairs.values()],
  };
  await writeFile(join(root, REPORT_JSON), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(root, REPORT_MD), markdownReport(report));
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
  if (report.summary.invalidCollisionGroups || report.summary.invalidCollisionPairs || percussionIdentities.some(item => !item.valid) || regressions.some(item => !item.pass)) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch(error => { console.error(error); process.exitCode = 1; });
