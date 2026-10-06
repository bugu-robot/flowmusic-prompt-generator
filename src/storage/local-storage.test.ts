import { describe, expect, it } from 'vitest';
import { deletePreset, importPresetJson, listPresets, loadCurrentConfiguration, normalizeConfiguration, saveCurrentConfiguration, savePreset, exportPresetJson } from './local-storage';
import { recommendConfiguration } from '../engine/recommendation-engine';
import type { StorageLike } from './local-storage';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('local preset serialization', () => {
  it('saves and reloads the current configuration', () => {
    const storage = new MemoryStorage();
    const configuration = recommendConfiguration('slow-bossa');
    saveCurrentConfiguration(configuration, storage);
    expect(loadCurrentConfiguration(storage)).toEqual(configuration);
  });

  it('round-trips named presets through portable JSON', () => {
    const storage = new MemoryStorage();
    const configuration = recommendConfiguration('cool-jazz');
    const saved = savePreset('Quiet Library', configuration, storage);
    const imported = importPresetJson(exportPresetJson(saved), storage);
    expect(imported?.name).toBe('Quiet Library');
    expect(imported?.configuration).toEqual(configuration);
    expect(listPresets(storage)).toHaveLength(2);
  });

  it('rejects malformed and unknown-style configuration JSON', () => {
    expect(normalizeConfiguration(null)).toBeUndefined();
    expect(normalizeConfiguration({ tempo: 58 })).toBeUndefined();
    expect(importPresetJson('{"format":"unknown","version":1,"preset":{}}', new MemoryStorage())).toBeUndefined();
  });

  it('bounds editable numeric values on import', () => {
    const config = normalizeConfiguration({ ...recommendConfiguration('slow-bossa'), tempo: 900, energy: -5 });
    expect(config?.tempo).toBe(400);
    expect(config?.energy).toBe(0);
  });

  it('replaces non-finite instrument prominence with a safe default', () => {
    const configuration = recommendConfiguration('cool-jazz');
    const normalized = normalizeConfiguration({
      ...configuration,
      instruments: [{ ...configuration.instruments[0], prominence: Number.NaN }],
    });
    expect(normalized?.instruments[0]?.prominence).toBe(50);
  });

  it('normalizes unsupported imported roles to a supported instrument role', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    const normalized = normalizeConfiguration({
      ...configuration,
      instruments: [
        { instrumentId: 'soft-shaker', enabled: true, role: 'lead', prominence: 80, behaviour: 'a soft, even rhythmic texture' },
        { instrumentId: 'upright-bass', enabled: true, role: 'countermelody', prominence: 50, behaviour: 'a soft, even walking pulse' },
      ],
    });
    expect(normalized?.instruments.map((part) => part.role)).toEqual(['rhythm', 'bass']);
  });

  it('replaces zero numerator or denominator in meter values', () => {
    const configuration = recommendConfiguration('slow-bossa');
    const normalized = normalizeConfiguration({ ...configuration, meter: '0/4', customMeter: '4/0' });
    expect(normalized?.meter).toBe('4/4');
    expect(normalized?.customMeter).toBe('4/4');
  });

  it('renames an existing preset and removes it by ID', () => {
    const storage = new MemoryStorage();
    const saved = savePreset('Before', recommendConfiguration('cozy-jazz'), storage);
    savePreset('After', saved.configuration, storage, saved.id);
    expect(listPresets(storage)[0]?.name).toBe('After');
    deletePreset(saved.id, storage);
    expect(listPresets(storage)).toHaveLength(0);
  });

  it('discards unsupported instrument behavior and unsafe prompt selectors on import', () => {
    const configuration = recommendConfiguration('slow-bossa');
    const normalized = normalizeConfiguration({
      ...configuration,
      grooveId: '<script>舞</script>',
      key: '不用中文',
      meter: '<script>',
      instruments: [{ ...configuration.instruments[0], behaviour: '不要用這段' }],
    });
    expect(normalized?.grooveId).toBe('open');
    expect(normalized?.key).toBe('auto');
    expect(normalized?.meter).toBe('4/4');
    expect(normalized?.instruments[0]?.behaviour).not.toContain('中文');
  });

  it('filters and deduplicates shared option IDs from imported JSON', () => {
    const configuration = {
      ...recommendConfiguration('slow-bossa'),
      harmonyIds: ['maj7', 'missing-harmony', 'maj7', 'maj6'],
      moodIds: ['warm', 'missing-mood', 'warm', 'energetic'],
      productionIds: ['clean', 'modern-clean', 'clean', 'round-bass'],
      constraintIds: ['bright-brass', 'vocals', 'scat', 'missing-constraint', 'bright-brass'],
      sceneId: 'missing-scene',
    };
    const preset = savePreset('Canonical import', configuration, new MemoryStorage());
    const imported = importPresetJson(exportPresetJson(preset), new MemoryStorage());
    expect(imported?.configuration.harmonyIds).toEqual(['maj7', 'maj6']);
    expect(imported?.configuration.moodIds).toEqual(['warm', 'energetic']);
    expect(imported?.configuration.productionIds).toEqual(['clean', 'round-bass']);
    expect(imported?.configuration.constraintIds).toEqual(['bright-brass']);
    expect(imported?.configuration.sceneId).toBe('quiet-cafe');
  });

  it('preserves globally valid grooves, tonalities and custom scenes after a style change', () => {
    const configuration = { ...recommendConfiguration('slow-bossa'), styleId: 'cool-jazz', tonalityId: 'relative-minor', sceneId: 'custom', customSceneName: 'A quiet studio' };
    const preset = savePreset('Retained settings', configuration, new MemoryStorage());
    const imported = importPresetJson(exportPresetJson(preset), new MemoryStorage());
    expect(imported?.configuration).toEqual(configuration);
    expect(imported?.configuration.grooveId).toBe('slow-bossa');
    expect(imported?.configuration.tonalityId).toBe('relative-minor');
  });

  it('replaces unknown groove, tonality and scene IDs with valid defaults', () => {
    const normalized = normalizeConfiguration({ ...recommendConfiguration('cozy-jazz'), grooveId: 'missing-groove', tonalityId: 'missing-tonality', sceneId: 'missing-scene' });
    expect(normalized?.grooveId).toBe('open');
    expect(normalized?.tonalityId).toBe('warm-major');
    expect(normalized?.sceneId).toBe('quiet-cafe');
  });

  it('replaces unknown dynamics and structure IDs with valid defaults', () => {
    const normalized = normalizeConfiguration({ ...recommendConfiguration('cozy-jazz'), dynamics: 'missing-dynamics', structure: 'missing-structure' });
    expect(normalized?.dynamics).toBe('stable');
    expect(normalized?.structure).toBe('continuous');
  });

  it('rejects non-string selections that stringify to valid option IDs', () => {
    const normalized = normalizeConfiguration({
      ...recommendConfiguration('cozy-jazz'), tempoFeelId: ['fast'], foregroundRule: ['collective'],
      phraseLength: ['long'], breathingSpace: ['low'], melodyComplexity: ['virtuosic'],
      dynamics: ['dynamic'], structure: ['custom'],
    });
    expect(normalized).toMatchObject({
      tempoFeelId: 'auto', foregroundRule: 'single', phraseLength: 'medium', breathingSpace: 'medium',
      melodyComplexity: 'moderate', dynamics: 'stable', structure: 'continuous',
    });
  });
});
