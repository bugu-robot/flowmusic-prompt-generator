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
});
