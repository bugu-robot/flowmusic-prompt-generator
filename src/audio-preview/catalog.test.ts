import { describe, expect, it } from 'vitest';
import { INSTRUMENTS } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { compilePrompt } from '../engine/prompt-compiler';
import { recommendConfiguration } from '../engine/recommendation-engine';
import { buildPreviewCatalog, behaviorKey } from './catalog';
import { encodeMidi, validateMusicSpec } from './music';

describe('catalog-driven audio previews', () => {
  it('covers the repository instrument, behaviour-pair, and groove catalog dynamically', () => {
    const { manifest } = buildPreviewCatalog();
    const grooves = new Set(JAZZ_STYLES.flatMap((style) => style.grooves.map((groove) => groove.id)));
    const behaviourPairs = INSTRUMENTS.flatMap((instrument) => instrument.behaviours.map((behaviour) => behaviorKey(instrument.id, behaviour)));

    expect(Object.keys(manifest.instruments)).toEqual(INSTRUMENTS.map((instrument) => instrument.id));
    expect(Object.keys(manifest.behaviours).sort()).toEqual(behaviourPairs.sort());
    expect(Object.keys(manifest.grooves).sort()).toEqual([...grooves].sort());
    expect(manifest.coverage.instruments).toEqual({ expected: INSTRUMENTS.length, mapped: INSTRUMENTS.length });
    expect(manifest.coverage.behaviours.behaviourPairsExpected).toBe(behaviourPairs.length);
    expect(manifest.coverage.behaviours.mapped).toBe(behaviourPairs.length);
    expect(manifest.coverage.behaviours.uniqueExpected).toBe(new Set(INSTRUMENTS.flatMap((instrument) => instrument.behaviours)).size);
    expect(manifest.coverage.grooves).toEqual({ expected: grooves.size, mapped: grooves.size });
  });

  it('validates every catalog specification and produces deterministic MIDI bytes', () => {
    const catalog = buildPreviewCatalog();
    for (const entry of [...Object.values(catalog.manifest.instruments), ...Object.values(catalog.manifest.behaviours), ...Object.values(catalog.manifest.grooves)]) {
      const spec = catalog.specs[entry.previewId];
      expect(spec, entry.previewId).toBeDefined();
      expect(validateMusicSpec(spec!).every((rule) => rule.ok), entry.previewId).toBe(true);
      expect([...encodeMidi(spec!)]).toEqual([...encodeMidi(spec!)]);
    }
  });

  it('leaves prompt output and saved configuration semantics untouched', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    const originalConfiguration = structuredClone(configuration);
    const originalPrompt = compilePrompt(configuration);

    buildPreviewCatalog();

    expect(configuration).toEqual(originalConfiguration);
    expect(compilePrompt(configuration)).toBe(originalPrompt);
  });
});
