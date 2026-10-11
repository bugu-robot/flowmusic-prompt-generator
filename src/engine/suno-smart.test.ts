import { describe, expect, it } from 'vitest';
import { compilePrompt } from './prompt-compiler';
import { compileSunoSimple } from './suno-simple-compiler';
import { generateSmartPrompts } from './smart-prompt-planner';
import { recommendConfiguration } from './recommendation-engine';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { generateVariations } from './variation-engine';
import { normalizeConfiguration } from '../storage/local-storage';

describe('Suno Simple and smart prompt outputs', () => {
  it('supports all 37 fixed styles and Custom as deterministic, copy-ready English', () => {
    for (const style of JAZZ_STYLES) {
      const config = recommendConfiguration(style.id);
      const prompt = compileSunoSimple(config);
      expect(prompt, style.id).toBe(compileSunoSimple(config));
      expect(prompt, style.id).toContain(style.name);
      expect(prompt, style.id).toContain(config.tempo + ' BPM');
      expect(prompt, style.id).toContain('4 to 5 minutes');
      expect(prompt, style.id).toContain('No vocals or singing');
      expect(prompt, style.id).toContain('No instruments beyond the listed ensemble');
      expect(prompt, style.id).not.toMatch(/[\u3400-\u9fff]/u);
      expect(prompt.length, style.id).toBeLessThan(4200);
      for (const p of config.instruments.filter(x => x.enabled)) {
        expect(prompt, style.id).toContain(INSTRUMENT_BY_ID.get(p.instrumentId)!.wording);
      }
      const a = generateSmartPrompts(config, 'flow');
      const b = generateSmartPrompts(config, 'suno');
      expect(a.prompts, style.id).toHaveLength(3);
      expect(b.prompts, style.id).toHaveLength(3);
      expect(new Set(a.prompts.map(x => x.prompt)).size, style.id).toBe(3);
      expect(new Set(b.prompts.map(x => x.prompt)).size, style.id).toBe(3);
      expect(a.prompts.every(x => x.prompt.startsWith(compilePrompt(config))), style.id).toBe(true);
      expect(b.prompts.every(x => x.prompt.startsWith(prompt)), style.id).toBe(true);
    }
  });

  it('does not mutate user-selected fields, instruments, roles or behaviours across rerolls', () => {
    const config = recommendConfiguration('slow-bossa');
    config.tempo = 54;
    config.grooveId = 'slow-bossa';
    config.trackDurationId = '5-6';
    config.instruments[0]!.prominence = 35;
    const frozen = JSON.stringify(config);
    for (const provider of ['flow', 'suno'] as const) {
      for (const strength of ['conservative', 'balanced', 'creative'] as const) {
        const first = generateSmartPrompts(config, provider, strength, 0);
        const second = generateSmartPrompts(config, provider, strength, 1);
        expect(first.prompts).toHaveLength(3);
        expect(first.prompts.map(p => p.intent)).not.toEqual(second.prompts.map(p => p.intent));
        for (const p of first.prompts) {
          expect(p.prompt).toContain('54 BPM');
          expect(p.prompt).toContain('5 to 6 minutes');
          expect(p.prompt).toContain('No added instruments or vocals');
        }
      }
    }
    expect(JSON.stringify(config)).toBe(frozen);
  });

  it('keeps user-supplied ensemble restrictions for both providers, including disabled parts', () => {
    const config = recommendConfiguration('cozy-jazz');
    config.instruments = [{ ...config.instruments[0]!, enabled: false },
      { ...config.instruments[1]!, enabled: true, role: 'response' }];
    const output = compileSunoSimple(config);
    expect(output).toContain('Use only these instruments:');
    expect(output).not.toContain(INSTRUMENT_BY_ID.get(config.instruments[0]!.instrumentId)!.wording);
    expect(output).toContain(INSTRUMENT_BY_ID.get(config.instruments[1]!.instrumentId)!.wording);
    expect(generateSmartPrompts(config).prompts).toHaveLength(3);
    const none = { ...config, instruments: [] };
    expect(generateSmartPrompts(none).prompts).toHaveLength(0);
    expect(generateSmartPrompts(none).warning).toBeTruthy();
    expect(compileSunoSimple(none)).not.toContain('Use only these instruments:');
  });

  it('keeps style-specific ensemble identities in the Suno output', () => {
    const free = compileSunoSimple(recommendConfiguration('free-jazz'));
    expect(free).toContain('collective improvisation');
    expect(free).toContain('no permanent lead hierarchy');
    expect(free).not.toContain('Only one foreground melodic voice at a time');
    const traditional = compileSunoSimple(recommendConfiguration('new-orleans'));
    expect(traditional).toContain('collective front-line improvisation');
    const big = compileSunoSimple(recommendConfiguration('big-band'));
    expect(big).toContain('coordinated arranged sections');
    const bop = generateSmartPrompts(recommendConfiguration('bebop')).prompts;
    expect(bop[0]?.intent).toContain('bebop');
    const gypsy = generateSmartPrompts(recommendConfiguration('gypsy-jazz')).prompts;
    expect(gypsy[1]?.intent).toContain('la pompe');
  });

  it('inherits all base settings through historical A/B/C arrangement variations', () => {
    for (const style of JAZZ_STYLES) {
      const base = recommendConfiguration(style.id);
      const variations = generateVariations(base);
      expect(variations).toHaveLength(3);
      for (const config of variations) {
        const result = generateSmartPrompts(config, 'suno', 'balanced', 2);
        expect(result.prompts).toHaveLength(3);
        for (const p of result.prompts) {
          expect(p.prompt).toContain(String(config.tempo) + ' BPM');
          expect(p.prompt).toContain('4 to 5 minutes');
          expect(p.prompt).toContain('No instruments beyond the listed ensemble');
        }
      }
    }
  });

  it('migrates legacy presets and handles unusual user choices deterministically', () => {
    const base = recommendConfiguration('jazz-waltz');
    const legacy = { ...base, trackDurationId: undefined, instruments: [] };
    const normalized = normalizeConfiguration(legacy);
    expect(normalized?.trackDurationId).toBe('4-5');
    expect(compileSunoSimple(legacy)).toContain('4 to 5 minutes');
    const single = { ...base, meter: '4/4', instruments: [base.instruments[0]!] };
    expect(generateSmartPrompts(single, 'flow').prompts).toHaveLength(3);
    const twice = generateSmartPrompts(single, 'flow', 'balanced', 7);
    expect(twice).toEqual(generateSmartPrompts(single, 'flow', 'balanced', 7));
  });
});
