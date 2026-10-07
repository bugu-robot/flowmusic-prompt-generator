import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildPreviewCatalog, makeRuntimeIndex, type PreviewEntry, type PreviewManifest } from '../../src/audio-preview/catalog';
import { previewRuntimeIndex } from '../../src/audio-preview/generated-index';
import { flattenEntries, inspectAudio, type TechnicalResult } from '../../src/audio-preview/qc';
import process from 'node:process';
import { approvedEquivalentIntent, INTENT_ALIAS_RULES } from '../../src/audio-preview/intent';

async function files(dir: string): Promise<string[]> {
  let all: string[] = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) all = all.concat(await files(path));
    else all.push(path);
  }
  return all;
}

function assert(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortKeys(item)]));
  }
  return value;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  const expected = buildPreviewCatalog();
  const manifestPath = join(root, 'public/audio-previews/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PreviewManifest;
  const expectedEntries = flattenEntries(expected.manifest);
  const categories: Array<keyof Pick<PreviewManifest, 'instruments' | 'behaviours' | 'grooves'>> = ['instruments', 'behaviours', 'grooves'];

  for (const category of categories) {
    assert(sameJson(Object.keys(manifest[category]).sort(), Object.keys(expected.manifest[category]).sort()), `${category} coverage differs from the current catalog`);
    for (const [key, wanted] of Object.entries(expected.manifest[category])) {
      const actual = manifest[category][key] as PreviewEntry | undefined;
      assert(Boolean(actual), `manifest entry missing for ${category}:${key}`);
      assert(actual.previewId === wanted.previewId, `preview ID differs for ${category}:${key}`);
      assert(actual.sourceCatalogId === wanted.sourceCatalogId, `catalog source differs for ${category}:${key}`);
      assert(actual.sourceLabel === wanted.sourceLabel, `catalog label differs for ${category}:${key}`);
      assert(actual.semanticFamily === wanted.semanticFamily, `semantic family differs for ${category}:${key}`);
      assert(actual.pattern === wanted.pattern, `semantic pattern differs for ${category}:${key}`);
      assert(actual.bpm === wanted.bpm && actual.meter === wanted.meter && actual.durationSeconds === wanted.durationSeconds, `rendered tempo/meter/duration metadata is stale for ${category}:${key}`);
      assert(actual.articulationFamily === wanted.articulationFamily, `articulation metadata is stale for ${category}:${key}`);
      assert(actual.audioPath === wanted.audioPath, `audio path differs for ${category}:${key}`);
      assert(actual.musicQcPassed && actual.musicQc.every((rule) => rule.ok), `semantic rules failed for ${actual.previewId}`);
    }
  }

  assert(sameJson(manifest.coverage, expected.manifest.coverage), 'manifest coverage counters do not match the live catalog');
  const expectedIndex = makeRuntimeIndex(expected.manifest);
  assert(sameJson(previewRuntimeIndex, expectedIndex), 'generated runtime audio index is stale or inconsistent with the catalog');

  const expectedPaths = expectedEntries.map((entry) => join(root, 'public', entry.audioPath)).sort();
  const actualFiles = (await files(join(root, 'public/audio-previews'))).filter((path) => path.toLowerCase().endsWith('.mp3')).sort();
  assert(sameJson(actualFiles, expectedPaths), `committed audio files differ from catalog paths; expected ${expectedPaths.length}, found ${actualFiles.length}`);

  for (const wanted of expectedEntries) {
    const categoryManifest = wanted.category === 'instrument' ? manifest.instruments : wanted.category === 'behaviour' ? manifest.behaviours : manifest.grooves;
    const actual = categoryManifest[wanted.sourceCatalogId] as PreviewEntry;
    const file = join(root, 'public', wanted.audioPath);
    const fresh = await inspectAudio(file, wanted);
    assert(fresh.ok, `committed MP3 failed independent decode/technical QC: ${wanted.previewId}: ${fresh.errors.join(', ')}`);
    const committedHash = (actual.technicalQc as TechnicalResult | undefined)?.sha256;
    assert(typeof committedHash === 'string' && /^[a-f0-9]{64}$/.test(committedHash), `SHA-256 is missing from manifest for ${wanted.previewId}`);
    assert(fresh.sha256 === committedHash, `committed MP3 SHA-256 mismatch for ${wanted.previewId}`);
  }

  const qcPath = join(root, 'public/audio-previews/audio-preview-qc.json');
  const qc = JSON.parse(await readFile(qcPath, 'utf8')) as {
    technical: { checked: number; passed: number; failed: number; sha256Checked: number; missingHashes: string[]; manifestErrors: number };
    musicRules: { failed: number };
  };
  assert(qc.technical.checked === expectedEntries.length, 'QC report asset count differs from catalog');
  assert(qc.technical.passed === expectedEntries.length && qc.technical.failed === 0, 'QC report contains technical failures');
  assert(qc.technical.sha256Checked === expectedEntries.length && qc.technical.missingHashes.length === 0, 'QC report has incomplete SHA-256 coverage');
  assert(qc.technical.manifestErrors === 0, 'QC report contains manifest errors or orphan files');
  assert(qc.musicRules.failed === 0, 'QC report contains semantic/music-rule failures');

  const similarity = JSON.parse(await readFile(join(root, 'public/audio-previews/audio-preview-similarity.json'), 'utf8')) as {
    version: number;
    intentPolicy: { aliasRules: typeof INTENT_ALIAS_RULES };
    summary: { totalAssets: number; invalidCollisionGroups: number; invalidCollisionPairs: number; percussionKitFamiliesValidated: number };
    regressions: Array<{ name: string; pass: boolean; featureSimilarity: { overall: number } }>;
    intentRegressions: Array<{ pass: boolean; classification: string; renderedDifferences: string[] }>;
    assets: Array<{ previewId: string; sourceLabel: string; pattern: string; soundFontBank: number; soundFontProgram: number; percussionKitFamily?: string }>;
    exactSpecDuplicateGroups: Array<{ pairs: Array<{ a: string; b: string; classification: string; intentRule?: string }> }>;
    nearSpecDuplicateGroups: Array<{ pairs: Array<{ a: string; b: string; classification: string; intentRule?: string }> }>;
    nearAudioSimilarityGroups: Array<{ pairs: Array<{ a: string; b: string; classification: string; intentRule?: string }> }>;
  };
  assert(similarity.version === 2 && sameJson(similarity.intentPolicy.aliasRules, INTENT_ALIAS_RULES), 'similarity report has a stale source-intent policy');
  assert(similarity.summary.totalAssets === expectedEntries.length, 'similarity audit asset count differs from catalog');
  assert(similarity.assets.length === expectedEntries.length, 'similarity feature signatures do not cover every preview');
  assert(similarity.summary.invalidCollisionGroups === 0 && similarity.summary.invalidCollisionPairs === 0, 'similarity audit contains invalid collisions');
  assert(similarity.summary.percussionKitFamiliesValidated === 8, 'percussion semantic audit did not validate all eight identities');
  assert(similarity.regressions.length === 3 && similarity.regressions.every(item => item.pass && item.featureSimilarity.overall < 0.9), 'percussion PCM regression comparison failed');
  assert(similarity.intentRegressions.length === 17 && similarity.intentRegressions.every(pair => pair.pass && pair.classification === 'EXPECTED_VARIANT' && pair.renderedDifferences.length > 0), 'reviewed swing/Big Band/Vibraphone intent regression failed');
  const expectedById = new Map(expectedEntries.map(entry => [entry.previewId, entry]));
  for (const group of [...similarity.exactSpecDuplicateGroups, ...similarity.nearSpecDuplicateGroups, ...similarity.nearAudioSimilarityGroups]) for (const pair of group.pairs) {
    const a = expectedById.get(pair.a), b = expectedById.get(pair.b);
    assert(Boolean(a && b), 'similarity pair references a missing preview');
    assert(pair.classification !== 'INVALID_COLLISION', `invalid pair is hidden by report summary: ${pair.a} / ${pair.b}`);
    if (pair.classification === 'ACCEPTED_EQUIVALENT') {
      const approval = approvedEquivalentIntent(a!, b!);
      assert(Boolean(approval) && approval!.intentRule === pair.intentRule, `unjustified semantic equivalence: ${pair.a} / ${pair.b}`);
    }
  }
  const similarityById = new Map(similarity.assets.map(item => [item.previewId, item]));
  for (const wanted of expectedEntries) {
    const actual = similarityById.get(wanted.previewId);
    assert(Boolean(actual), `similarity metadata missing for ${wanted.previewId}`);
    assert(actual.sourceLabel === wanted.sourceLabel && actual.pattern === wanted.pattern, `similarity metadata is stale for ${wanted.previewId}`);
    assert(actual.soundFontBank === wanted.soundFontBank && actual.soundFontProgram === wanted.soundFontProgram, `timbre mapping differs in similarity report for ${wanted.previewId}`);
    assert(actual.percussionKitFamily === wanted.percussionKitFamily, `percussion kit family differs in similarity report for ${wanted.previewId}`);
  }

  for (const path of [join(root, 'public/audio-preview-review.zip'), join(root, 'dist/audio-preview-review.zip')]) {
    try {
      await stat(path);
      throw new Error(`review ZIP must stay out of production files: ${path}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('review ZIP must stay')) throw error;
    }
  }

  console.log(`Instrument tone previews: ${manifest.coverage.instruments.mapped}/${manifest.coverage.instruments.expected}`);
  console.log(`Instrument behaviour pairs: ${manifest.coverage.behaviours.mapped}/${manifest.coverage.behaviours.behaviourPairsExpected} (${manifest.coverage.behaviours.uniqueExpected} unique English behaviour strings)`);
  console.log(`Grooves: ${manifest.coverage.grooves.mapped}/${manifest.coverage.grooves.expected}`);
  console.log(`Audio assets decoded and SHA-256 checked: ${expectedEntries.length}; semantic families, catalog paths, runtime index, QC report, percussion fidelity, PCM similarity and orphan checks passed.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
