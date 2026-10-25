import { describe, expect, it } from 'vitest';
import { OPENING_MODES, resolveOpening, smartOpeningConfiguration } from '../data/opening-variation';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { MIDNIGHT_COLLECTION } from '../data/midnight-collection';
import { TRACK_DURATIONS, DEFAULT_TRACK_DURATION } from '../data/track-duration';
import { recommendConfiguration } from './recommendation-engine';
import { compilePrompt } from './prompt-compiler';
import { compileSunoSimple } from './suno-simple-compiler';
import { generateSmartPrompts } from './smart-prompt-planner';
import { describePromptZh } from './prompt-zh-reference';
import { normalizeConfiguration, savePreset, exportPresetJson, importPresetJson, saveCurrentConfiguration, loadCurrentConfiguration } from '../storage/local-storage';
import { savePromptSnapshot, listPromptSnapshots, saveTrackFeedback, listTrackFeedback } from '../storage/track-feedback';
import type { StorageLike } from '../storage/local-storage';
class MemoryStorage implements StorageLike {
  values = new Map<string,string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string,value: string) { this.values.set(key,value); }
  removeItem(key: string) { this.values.delete(key); }
}
const compilers = [compilePrompt, compileSunoSimple];
describe('Opening variation and 7–8 minute defaults', () => {
  it('defaults only new configurations, preserving built-ins and missing legacy settings', () => {
    expect(DEFAULT_TRACK_DURATION).toBe('7-8');
    expect(TRACK_DURATIONS).toHaveLength(9);
    for (const style of JAZZ_STYLES) {
      const config = recommendConfiguration(style.id);
      expect(config).toMatchObject({trackDurationId:'7-8',openingMode:'auto',openingSeed:0});
      for (const compile of compilers) expect(compile(config)).toContain('Target a total track duration of approximately 7 to 8 minutes.');
      const legacy = {...config}; delete legacy.openingMode; delete legacy.openingSeed;
      for (const compile of compilers) expect(compile(legacy)).not.toContain('Opening:');
      const original = {...config,openingMode:'original' as const};
      for (const compile of compilers) expect(compile(original)).toBe(compile(legacy));
    }
    for (const preset of MIDNIGHT_COLLECTION) {
      expect(preset.configuration.trackDurationId).toBe('4-5');
      expect(preset.configuration.openingMode).toBeUndefined();
    }
  });
  it.each(OPENING_MODES)('$id is deterministic, bilingual and bounded to the configured music', mode => {
    for (const style of JAZZ_STYLES) {
      const config = {...recommendConfiguration(style.id),openingMode:mode.id};
      const before = structuredClone(config);
      const plan = resolveOpening(config);
      expect(resolveOpening(config)).toEqual(plan);
      if (mode.id !== 'original') {
        expect(plan.instruction).toContain('Opening:');
        expect(plan.descriptionZh).toMatch(/[\u3400-\u9fff]/u);
        for (const compile of compilers) {
          const text = compile(config);
          expect(text).toContain(plan.instruction);
          expect(text).toContain(config.tempo + ' BPM');
          expect(text).not.toMatch(/[\u3400-\u9fff]/u);
        }
        expect(describePromptZh(config)).toContain(plan.descriptionZh);
      }
      expect(config).toEqual(before);
    }
  });
  it('cycles compatible approaches, varies manual openings and gives Smart A/B/C distinct approaches', () => {
    const config = recommendConfiguration('slow-bossa');
    const plans = Array.from({length:5},(_,openingSeed)=>resolveOpening({...config,openingSeed}).id);
    expect(new Set(plans).size).toBe(5);
    for (const provider of ['flow','suno'] as const) {
      const before = structuredClone(config);
      const smart = generateSmartPrompts(config,provider);
      expect(new Set(smart.prompts.map(p=>p.openingZh)).size).toBe(3);
      expect(generateSmartPrompts(config,provider)).toEqual(smart);
      expect(generateSmartPrompts(config,provider,'balanced',1)).not.toEqual(smart);
      smart.prompts.forEach((p,index)=>expect(p.prompt).toContain(resolveOpening(smartOpeningConfiguration(config,0,index)).instruction));
      expect(config).toEqual(before);
    }
    expect(resolveOpening({...config,openingMode:'chord',openingSeed:0}).instruction).not.toBe(resolveOpening({...config,openingMode:'chord',openingSeed:1}).instruction);
  });
  it('does not introduce missing/disabled instruments or change assigned roles', () => {
    const config = recommendConfiguration('slow-bossa');
    config.instruments = config.instruments.filter(p=>p.instrumentId==='nylon-guitar');
    for (const mode of OPENING_MODES) {
      const plan = resolveOpening({...config,openingMode:mode.id});
      expect(plan.instruction).not.toMatch(/piano|bass|shaker|drums|chord|percussion/i);
    }
    const bass = recommendConfiguration('slow-bossa').instruments.find(p=>p.role==='bass')!;
    config.instruments.push({...bass,enabled:false});
    expect(resolveOpening({...config,openingMode:'bass'}).id).not.toBe('bass');
    config.instruments = [{...bass,role:'lead'}]; // invalid role must not leak into planning
    expect(resolveOpening(config).instruction).toBe('');
    config.instruments = recommendConfiguration('slow-bossa').instruments.filter(p=>p.role==='rhythm');
    expect(resolveOpening({...config,openingMode:'chord'}).instruction).toContain('do not add melodic or chordal parts');
    config.instruments=[];
    for (const compile of compilers) expect(compile(config)).not.toContain('Opening:');
  });
  it('roundtrips all modes and durations through reload, v1 export and snapshots without rewriting legacy input', () => {
    for (const mode of OPENING_MODES) for (const duration of TRACK_DURATIONS) {
      const storage = new MemoryStorage();
      const config = {...recommendConfiguration('slow-bossa'),openingMode:mode.id,openingSeed:23,trackDurationId:duration.id};
      saveCurrentConfiguration(config,storage);
      expect(loadCurrentConfiguration(storage)).toEqual(config);
      const json = exportPresetJson(savePreset('Opening',config,storage));
      expect(JSON.parse(json).version).toBe(1);
      expect(importPresetJson(json,new MemoryStorage())!.configuration).toEqual(config);
    }
    const storage = new MemoryStorage();
    const config = recommendConfiguration('slow-bossa');
    const smart = generateSmartPrompts(config,'suno','creative',4).prompts[1]!;
    const exact = {...config,openingSeed:smart.openingSeed};
    const snapshot = savePromptSnapshot({provider:'suno',kind:'B',promptText:smart.prompt,configuration:config,resolvedOpeningSeed:smart.openingSeed,smartSeed:4,smartStrength:'creative'},storage);
    config.openingSeed=50;
    saveTrackFeedback({promptSnapshotId:snapshot.id,ratings:{style:5,instruments:5,mood:5,recording:5,overall:5},note:''},storage);
    expect(listPromptSnapshots(storage)[0]!.promptText).toBe(smart.prompt);
    const captured = listTrackFeedback(storage)[0]!.snapshot!;
    expect(captured.resolvedOpeningSeed).toBe(smart.openingSeed);
    expect(generateSmartPrompts(captured.configuration,'suno','creative',4).prompts[1]!.prompt).toBe(smart.prompt);
    expect(smart.prompt).toContain(resolveOpening(exact).instruction);
    expect(normalizeConfiguration({...config,openingMode:'bad',openingSeed:-1})!.openingMode).toBeUndefined();
    expect(normalizeConfiguration({...config,openingSeed:Number.MAX_VALUE})!.openingSeed).toBe(0);
  });
});
