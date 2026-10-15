import { describe, expect, it } from 'vitest';
import { MIDNIGHT_COLLECTION, createMidnightConfiguration } from '../data/midnight-collection';
import { STYLE_BY_ID } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { compilePrompt } from './prompt-compiler';
import { compileSunoSimple } from './suno-simple-compiler';
import { describePromptZh } from './prompt-zh-reference';
import { generateSmartPrompts } from './smart-prompt-planner';
import { recommendConfiguration } from './recommendation-engine';
import { generateVariations } from './variation-engine';
import { normalizeConfiguration, savePreset, exportPresetJson, importPresetJson, listPresets, saveCurrentConfiguration, loadCurrentConfiguration } from '../storage/local-storage';
import type { StorageLike } from '../storage/local-storage';
import { analyzeMusicalGuidance } from './musical-guidance';
import { flowOmittedOptions } from './flow-overflow';
import { savePromptSnapshot, saveTrackFeedback, listPromptSnapshots, listTrackFeedback } from '../storage/track-feedback';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('Ambient Jazz and the explicit Midnight Collection', () => {
  it('defines a modern ambient direction with sparse jazz harmony and no default percussion', () => {
    expect(STYLE_BY_ID.get('ambient-jazz')!.classification).toBe('modern-descriptor');
    const config = recommendConfiguration('ambient-jazz');
    expect(config.tempo).toBe(58);
    for (const compile of [compilePrompt, compileSunoSimple]) {
      expect(compile(config)).toContain('Ambient Jazz');
      expect(compile(config)).toContain('slow harmonic changes');
      expect(compile(config)).toMatch(/very soft|nearly unchanged/);
      expect(compile(config)).not.toMatch(/\b(?:swing|historical|modern-descriptor)\b/i);
    }
    expect(config.instruments.some(x => INSTRUMENT_BY_ID.get(x.instrumentId)?.category === 'percussion')).toBe(false);
    expect(generateVariations(config)).toHaveLength(3);
  });

  it.each(MIDNIGHT_COLLECTION.map(x => [x.id] as const))('%s has valid, deterministic and independently editable settings', id => {
    const config = createMidnightConfiguration(id)!;
    expect(normalizeConfiguration(config)).toEqual(config);
    expect(analyzeMusicalGuidance(config)).toEqual([]);
    expect(flowOmittedOptions(config)).toEqual([]);
    for (const part of config.instruments) {
      const instrument = INSTRUMENT_BY_ID.get(part.instrumentId)!;
      expect(instrument.roles).toContain(part.role);
      expect(instrument.behaviours).toContain(part.behaviour);
    }
    expect(new Set(config.instruments.map(x => x.instrumentId)).size).toBe(config.instruments.length);
    expect(config.instruments.filter(x => x.role === 'lead')).toHaveLength(1);
    const frozen = JSON.stringify(config);
    for (const compile of [compilePrompt, compileSunoSimple]) {
      expect(compile(config)).toBe(compile(config));
      expect(compile(config)).not.toMatch(/[\u3400-\u9fff]/u);
    }
    for (const provider of ['flow', 'suno'] as const) {
      for (const strength of ['conservative', 'balanced', 'creative'] as const) {
        const variants = generateSmartPrompts(config, provider, strength, 1).prompts;
        expect(variants).toHaveLength(3);
        expect(new Set(variants.map(x => x.prompt)).size).toBe(3);
        for (const variant of variants) {
          expect(variant.prompt).toContain(config.tempo + ' BPM');
          expect(variant.intentZh).toMatch(/[\u3400-\u9fff]/u);
        }
      }
    }
    expect(JSON.stringify(config)).toBe(frozen);
    config.instruments[0]!.prominence = 1;
    config.moodIds.push('energetic');
    expect(JSON.stringify(createMidnightConfiguration(id))).toBe(frozen);
  });

  it('provides nine musical identities instead of relabeling the same setup', () => {
    expect(MIDNIGHT_COLLECTION).toHaveLength(9);
    expect(new Set(MIDNIGHT_COLLECTION.map(x => x.id)).size).toBe(9);
    const identities = MIDNIGHT_COLLECTION.map(x => JSON.stringify({ tempo: x.configuration.tempo,
      groove: x.configuration.grooveId, density: x.configuration.melodyDensity, parts: x.configuration.instruments }));
    expect(new Set(identities).size).toBe(9);
    for (const id of ['midnight-ambient', 'rainy-night-mellow', 'silent-minimal']) {
      expect(createMidnightConfiguration(id)!.instruments.some(x => INSTRUMENT_BY_ID.get(x.instrumentId)?.category === 'percussion')).toBe(false);
    }
    expect(createMidnightConfiguration('silent-minimal')!.instruments).toHaveLength(2);
    expect(createMidnightConfiguration('blue-city-lounge')!.grooveId).toBe('soft-straight');
    expect(createMidnightConfiguration('moonlit-guitar')!.instruments[0]!.instrumentId).toBe('nylon-guitar');
    expect(createMidnightConfiguration('unknown')).toBeUndefined();
  });

  it('does not overwrite user presets and preserves v1 export/import and reload', () => {
    const storage = new MemoryStorage();
    const legacy = savePreset('My existing Bossa', recommendConfiguration('slow-bossa'), storage);
    for (const item of MIDNIGHT_COLLECTION) {
      const config = createMidnightConfiguration(item.id)!;
      saveCurrentConfiguration(config, storage);
      expect(loadCurrentConfiguration(storage)).toEqual(config);
      expect(listPresets(storage)).toEqual([legacy]);
      const preset = savePreset(item.name, config, new MemoryStorage());
      const exported = exportPresetJson(preset);
      expect(JSON.parse(exported).version).toBe(1);
      expect(importPresetJson(exported, new MemoryStorage())?.configuration).toEqual(config);
    }
  });
});

describe('optional Piano Felt timbre', () => {
  it('keeps Felt in immutable copied-prompt and linked-feedback snapshots after live edits', () => {
    const storage = new MemoryStorage();
    const config = createMidnightConfiguration('rainy-night-mellow')!;
    const text = compileSunoSimple(config);
    const snapshot = savePromptSnapshot({ provider: 'suno', kind: 'B', promptText: text, configuration: config }, storage);
    delete config.instruments.find(x => x.instrumentId === 'piano')!.timbreId;
    const entry = saveTrackFeedback({ promptSnapshotId: snapshot.id, ratings: { style: 5, instruments: 5, mood: 5, recording: 5, overall: 5 }, note: '' }, storage);
    expect(listPromptSnapshots(storage)[0]!.configuration.instruments.find(x => x.instrumentId === 'piano')!.timbreId).toBe('felt');
    expect(entry.snapshot!.configuration.instruments.find(x => x.instrumentId === 'piano')!.timbreId).toBe('felt');
    expect(listTrackFeedback(storage)[0]!.snapshot!.promptText).toBe(text);
  });
  it('renders Felt consistently in both providers, Chinese and Smart A/B/C', () => {
    const config = createMidnightConfiguration('rainy-night-mellow')!;
    expect(describePromptZh(config)).toContain('氈布柔音鋼琴');
    for (const provider of ['flow', 'suno'] as const) {
      const compile = provider === 'flow' ? compilePrompt : compileSunoSimple;
      expect(compile(config)).toMatch(/soft felt piano/i);
      for (const variant of generateSmartPrompts(config, provider).prompts) expect(variant.prompt).toMatch(/soft felt piano/i);
    }
    delete config.instruments.find(x => x.instrumentId === 'piano')!.timbreId;
    expect(compileSunoSimple(config)).not.toContain('felt');
    expect(compilePrompt(config)).not.toContain('felt');
  });

  it('preserves legacy piano settings and removes unknown or wrong-instrument timbres', () => {
    const config = recommendConfiguration('cozy-jazz');
    const altered = structuredClone(config);
    for (const part of altered.instruments) (part as unknown as Record<string, unknown>).timbreId = 'made-up';
    expect(normalizeConfiguration(altered)).toEqual(config);
    expect(compilePrompt(altered)).toBe(compilePrompt(config));
    expect(compileSunoSimple(altered)).toBe(compileSunoSimple(config));
    altered.instruments.find(x => x.instrumentId !== 'piano')!.timbreId = 'felt';
    expect(normalizeConfiguration(altered)?.instruments.every(x => !x.timbreId)).toBe(true);
  });

  it('preserves selected Felt through ensemble variations without mutating the original', () => {
    for (const styleId of ['cozy-jazz', 'ambient-jazz', 'piano-cafe-jazz']) {
      const config = recommendConfiguration(styleId);
      if (!config.instruments.some(x => x.instrumentId === 'piano')) config.instruments.push({ instrumentId: 'piano', role: 'harmony', enabled: true, prominence: 25, behaviour: 'soft, spacious chord voicings' });
      config.instruments.find(x => x.instrumentId === 'piano')!.timbreId = 'felt';
      const before = JSON.stringify(config);
      for (const variant of generateVariations(config)) {
        const piano = variant.instruments.find(x => x.instrumentId === 'piano');
        if (piano) expect(piano.timbreId).toBe('felt');
      }
      expect(JSON.stringify(config)).toBe(before);
    }
  });
});
