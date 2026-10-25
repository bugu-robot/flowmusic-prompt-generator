import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MIDNIGHT_COLLECTION, createMidnightConfiguration } from '../data/midnight-collection';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENTS } from '../data/instruments';
import { MOODS } from '../data/options';
import type { MusicConfiguration } from '../models/types';
import { compilePrompt } from './prompt-compiler';
import { compileSunoSimple } from './suno-simple-compiler';
import { describePromptZh } from './prompt-zh-reference';
import { generateSmartPrompts } from './smart-prompt-planner';
import { recommendConfiguration } from './recommendation-engine';
import { checkCompatibility } from './compatibility-engine';
import { normalizeConfiguration, savePreset, exportPresetJson, importPresetJson, listPresets, saveCurrentConfiguration, loadCurrentConfiguration } from '../storage/local-storage';
import type { StorageLike } from '../storage/local-storage';

const CAFE_PRESETS = [
  {
    id: 'warm-acoustic-cafe', name: 'Warm Acoustic Café', styleId: 'cozy-jazz', tempo: 68,
    grooveId: 'soft-straight', sceneId: 'quiet-cafe', moodIds: ['warm', 'cozy', 'peaceful'],
    parts: [['piano', 'lead'], ['nylon-guitar', 'harmony'], ['upright-bass', 'bass'], ['brush-drums', 'rhythm']],
  },
  {
    id: 'coastal-slow-bossa', name: 'Coastal Slow Bossa', styleId: 'slow-bossa', tempo: 64,
    grooveId: 'slow-bossa', sceneId: 'seaside-cafe', moodIds: ['relaxed', 'warm', 'peaceful'],
    parts: [['nylon-guitar', 'lead'], ['piano', 'harmony'], ['upright-bass', 'bass'], ['soft-shaker', 'rhythm']],
  },
] as const;
const LEGACY_IDS = ['midnight-ambient', 'blue-city-lounge', 'rainy-night-mellow', 'silent-minimal', 'moonlit-guitar', 'slow-piano-trio', 'late-night-saxophone'];
const compilers = { flow: compilePrompt, suno: compileSunoSimple };

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function assertCafeSound(prompt: string, id: string): void {
  expect(prompt).toMatch(/piano/i);
  expect(prompt).toMatch(/nylon-string guitar/i);
  expect(prompt).toMatch(/upright bass/i);
  for (const harmony of ['major 7th', 'minor 7th', '6th', 'add9']) expect(prompt).toContain(harmony);
  expect(prompt).toMatch(/very soft/);
  expect(prompt).toMatch(/generous breathing space/);
  expect(prompt).toMatch(/sparse/);
  expect(prompt).toMatch(/no vocals/i);
  expect(prompt).not.toMatch(/\b(?:swing|rhodes|saxophone|vibraphone|felt|Cool Jazz)\b/i);
  expect(prompt).not.toMatch(/[\u3400-\u9fff]/u);
  if (id === 'warm-acoustic-cafe') {
    expect(prompt).toMatch(/68 BPM(?:,| in) 4\/4/);
    expect(prompt).toMatch(/cozy jazz/i);
    expect(prompt).toContain('soft straight-eighth groove');
    expect(prompt).toMatch(/Piano (?:carries the main melodic voice|leads clearly)/);
    expect(prompt).toMatch(/Nylon-string guitar supports the harmony/);
    expect(prompt).toMatch(/very soft brush drums/i);
    expect(prompt).toContain('warm, cozy, peaceful');
    expect(prompt).not.toMatch(/\b(?:bossa|shaker)\b/i);
  } else {
    expect(prompt).toMatch(/64 BPM(?:,| in) 4\/4/);
    expect(prompt).toContain('Slow Bossa Jazz');
    expect(prompt).toContain('straight-eighth bossa groove');
    expect(prompt).toContain('a relaxed, gently syncopated melody');
    expect(prompt).toMatch(/Nylon-string guitar (?:carries the main melodic voice|leads clearly)/);
    expect(prompt).toMatch(/Piano supports the harmony/);
    expect(prompt).toContain('soft, spacious chord voicings');
    expect(prompt).toMatch(/very soft shaker/i);
    expect(prompt).toContain('relaxed, warm, peaceful');
    expect(prompt).toContain('seaside café');
    expect(prompt).not.toMatch(/\bdrums\b/i);
  }
}

describe('Warm Acoustic Café and Coastal Slow Bossa built-in presets', () => {
  it('adds exactly the two requested presets, retaining all seven existing IDs', () => {
    expect(MIDNIGHT_COLLECTION.map(item => item.id)).toEqual([...LEGACY_IDS, ...CAFE_PRESETS.map(item => item.id)]);
    expect(MOODS.find(item => item.id === 'relaxed')).toEqual({ id: 'relaxed', label: '放鬆 Relaxed', prompt: 'relaxed' });
  });

  it.each(CAFE_PRESETS)('$name keeps its specified ensemble, groove and restrained performance', item => {
    const config = createMidnightConfiguration(item.id)!;
    expect(config).toMatchObject({ styleId: item.styleId, tempo: item.tempo, meter: '4/4', grooveId: item.grooveId,
      sceneId: item.sceneId, moodIds: item.moodIds, harmonyIds: ['maj7', 'min7', 'sixth', 'add9'],
      foregroundRule: 'single', breathingSpace: 'high', melodyComplexity: 'simple', dynamics: 'very-stable', structure: 'continuous' });
    expect(config.instruments.map(part => [part.instrumentId, part.role])).toEqual(item.parts);
    expect(config.instruments.every(part => part.enabled && !part.timbreId)).toBe(true);
    expect(config.instruments.find(part => part.role === 'rhythm')!.prominence).toBeLessThan(20);
    expect(config.energy).toBeLessThanOrEqual(25);
    expect(config.melodyDensity).toBeLessThanOrEqual(25);
    expect(config.improvisation).toBeLessThanOrEqual(25);
    expect(config.secondaryStyleId).toBeUndefined();
    expect(checkCompatibility(config).messages.filter(message => message.category !== 'info')).toEqual([]);
  });

  for (const provider of ['flow', 'suno'] as const) {
    it.each(CAFE_PRESETS)(provider + ': $name renders the requested music and matching Traditional Chinese', item => {
      const config = createMidnightConfiguration(item.id)!;
      assertCafeSound(compilers[provider](config), item.id);
      const zh = describePromptZh(config);
      for (const wording of ['鋼琴', '尼龍弦結他', '低音大提琴', '充足留白', '旋律密度低', '非常柔和而穩定']) expect(zh).toContain(wording);
      for (const mood of item.moodIds) expect(zh).toContain(MOODS.find(option => option.id === mood)!.label);
      const preset = MIDNIGHT_COLLECTION.find(preset => preset.id === item.id)!;
      expect(preset.name).toBe(item.name);
      expect(preset.nameZh).toMatch(/[\u3400-\u9fff]/u);
      expect(preset.descriptionZh).toContain(item.tempo + ' BPM');
      expect(zh).not.toMatch(/略帶|Felt/);
      if (item.id === 'warm-acoustic-cafe') {
        expect(zh).toContain('鋼琴（主奏');
        expect(zh).toContain('尼龍弦結他（和聲');
        expect(zh).toContain('刷鼓');
      } else {
        expect(zh).toContain('尼龍弦結他（主奏');
        expect(zh).toContain('鋼琴（和聲');
        expect(zh).toContain('輕微切分');
        expect(zh).toContain('柔和沙槌');
      }
    });

    for (const strength of ['conservative', 'balanced', 'creative'] as const) {
      it.each(CAFE_PRESETS)(provider + '/' + strength + ': $name keeps the full configuration in Smart A/B/C', item => {
        const config = createMidnightConfiguration(item.id)!;
        const before = structuredClone(config);
        const result = generateSmartPrompts(config, provider, strength, 2);
        expect(result.warning).toBeUndefined();
        expect(result.prompts.map(prompt => prompt.id)).toEqual(['A', 'B', 'C']);
        expect(new Set(result.prompts.map(prompt => prompt.prompt)).size).toBe(3);
        for (const variant of result.prompts) {
          assertCafeSound(variant.prompt, item.id);
          const zh = describePromptZh(config, variant.intentZh);
          expect(zh).toContain(variant.intentZh);
          expect(variant.intentZh).toMatch(/[\u3400-\u9fff]/u);
        }
        expect(generateSmartPrompts(config, provider, strength, 2)).toEqual(result);
        expect(config).toEqual(before);
      });
    }
  }

  it.each(CAFE_PRESETS)('$name survives v1 export/import and reload without modifying existing user presets', item => {
    const storage = new MemoryStorage();
    const original = recommendConfiguration('slow-bossa');
    original.tempo = 73;
    original.instruments.find(part => part.instrumentId === 'piano')!.timbreId = 'felt';
    const userPreset = savePreset('Existing custom preset', original, storage);
    const savedBytes = storage.getItem('flowmusic.promptGenerator.presets.v1');
    const config = createMidnightConfiguration(item.id)!;
    saveCurrentConfiguration(config, storage);
    expect(loadCurrentConfiguration(storage)).toEqual(config);
    expect(storage.getItem('flowmusic.promptGenerator.presets.v1')).toBe(savedBytes);
    expect(listPresets(storage)).toEqual([userPreset]);
    const exported = exportPresetJson(savePreset(item.name, config, new MemoryStorage()));
    expect(JSON.parse(exported).version).toBe(1);
    expect(importPresetJson(exported, new MemoryStorage())!.configuration).toEqual(config);
    for (const compile of Object.values(compilers)) {
      expect(compile(loadCurrentConfiguration(storage)!)).toBe(compile(config));
      assertCafeSound(compile(importPresetJson(exported, new MemoryStorage())!.configuration), item.id);
    }
    config.tempo = 90;
    config.instruments[0]!.role = 'harmony';
    expect(createMidnightConfiguration(item.id)!.tempo).toBe(item.tempo);
    expect(createMidnightConfiguration(item.id)!.instruments[0]!.role).toBe('lead');
    expect(listPresets(storage)[0]!.configuration).toEqual(original);
  });

  it('retains selected secondary influences but does not restore an absent one after reload', () => {
    const original = recommendConfiguration('slow-bossa');
    const standalone = structuredClone(original);
    delete standalone.secondaryStyleId;
    const reloaded = normalizeConfiguration(JSON.parse(JSON.stringify(standalone)))!;
    for (const compile of Object.values(compilers)) {
      expect(compile(original)).toMatch(/Cool Jazz influence/);
      expect(compile(standalone)).not.toMatch(/influence/);
      expect(compile(reloaded)).toBe(compile(standalone));
    }
  });
});

const digest = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function snapshot(input: MusicConfiguration) {
  const configuration = structuredClone(input);
  delete configuration.openingMode; delete configuration.openingSeed; configuration.trackDurationId = '4-5';
  return { configuration: normalizeConfiguration(configuration), flow: compilePrompt(configuration), suno: compileSunoSimple(configuration),
    zh: describePromptZh(normalizeConfiguration(configuration)!), smart: (['flow', 'suno'] as const).map(provider => generateSmartPrompts(configuration, provider)) };
}

describe('latest main 47c12cc preservation regressions', () => {
  it('preserves every style, instrument and style-default main/Smart/Chinese output', () => {
    expect(digest([JAZZ_STYLES, INSTRUMENTS])).toBe('782d933d823135164332f92de496814160d732f359939c9621eb521ef7ea5714');
    expect(digest(JAZZ_STYLES.map(style => snapshot(recommendConfiguration(style.id))))).toBe('5e84e9433e65fada23a5b05f284df24fef5f5164ff04bff7285ac2da2bfac4cf');
  });

  it('preserves all seven previous presets, their persisted configuration and every prompt output', () => {
    expect(digest(LEGACY_IDS.map(id => [id, snapshot(createMidnightConfiguration(id)!)]))).toBe('9e09cca8e6b3453e08256d870107b8708ea510f730feda6ff69a85dcc0efa71f');
  });
});
