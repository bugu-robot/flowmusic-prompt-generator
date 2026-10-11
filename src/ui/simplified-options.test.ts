import { describe, expect, it } from 'vitest';
import { HARMONIES, MOODS, PRODUCTION, CONSTRAINTS, SCENES, TONALITIES } from '../data/options';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { recommendConfiguration } from '../engine/recommendation-engine';
import { compilePrompt } from '../engine/prompt-compiler';
import { compileSunoSimple } from '../engine/suno-simple-compiler';
import { PROMINENCE_OPTIONS, prominenceChoice, structureOptions, visibleHarmonyOptions } from './simplified-options';

const compilers = [compilePrompt, compileSunoSimple] as const;

describe('Jazz Prompt Generator: output-effectiveness and simplifying option choices', () => {
  it('maps every legacy numeric instrument prominence to a visible descriptive tier', () => {
    expect(PROMINENCE_OPTIONS).toHaveLength(4);
    expect(new Set(PROMINENCE_OPTIONS.map(x => x.label)).size).toBe(4);
    for (const value of [0, 24, 34]) expect(prominenceChoice(value)).toBe('25');
    for (const value of [35, 40, 64]) expect(prominenceChoice(value)).toBe('50');
    for (const value of [65, 70, 82]) expect(prominenceChoice(value)).toBe('75');
    for (const value of [83, 90, 100]) expect(prominenceChoice(value)).toBe('95');
    const config = recommendConfiguration('cozy-jazz');
    const selected = config.instruments.find(x => x.enabled && x.role === 'lead')!;
    const results = PROMINENCE_OPTIONS.map(x => compileSunoSimple({
      ...config,
      instruments: config.instruments.map(p => p.instrumentId === selected.instrumentId ? { ...p, prominence: Number(x.id) } : p),
    }));
    expect(new Set(results).size).toBe(PROMINENCE_OPTIONS.length);
  });

  it('shows one major-sixth option while retaining the original ID in old presets', () => {
    const config = recommendConfiguration('custom');
    const current = visibleHarmonyOptions(config);
    expect(current.filter(x => ['sixth','maj6'].includes(x.id))).toHaveLength(1);
    expect(current.find(x => x.id === 'maj6')?.label).toBe('Major 6th / 6th');
    const old = visibleHarmonyOptions({ ...config, harmonyIds: ['sixth'] });
    expect(old.find(x => x.id === 'sixth')?.label).toBe('Major 6th / 6th');
    expect(old.some(x => x.id === 'maj6')).toBe(false);
    const onlyLegacy = compilePrompt({ ...config, harmonyIds: ['sixth'] });
    expect(onlyLegacy).toContain('6th');
    expect(compilePrompt({ ...config, harmonyIds: ['maj6'] })).toContain('major 6th');
  });

  it('hides the nonfunctional new Custom arrangement but retains imported historical selection', () => {
    const list = [['continuous','Continuous'],['gentle-evolution','Evolution'],['traditional-sections','Sections'],['custom','Custom']] as const;
    expect(structureOptions('continuous', list).map(x => x.id)).toEqual(['continuous','gentle-evolution','traditional-sections']);
    expect(structureOptions('custom', list).at(-1)).toEqual({ id: 'custom', label: '舊版自訂結構（保留原設定）' });
    const old = recommendConfiguration('custom');
    old.structure = 'custom';
    expect(compilePrompt(old)).toContain('Develop the arrangement naturally');
    expect(compileSunoSimple(old)).toContain('natural well-connected arrangement');
  });

  it('detects any ignored single-pick mood, harmony, production or constraint in both prompt formats', () => {
    const base = recommendConfiguration('custom');
    const categories = [
      { name: 'mood', key: 'moodIds', choices: MOODS },
      { name: 'harmony', key: 'harmonyIds', choices: HARMONIES },
      { name: 'production', key: 'productionIds', choices: PRODUCTION },
      { name: 'constraint', key: 'constraintIds', choices: CONSTRAINTS },
    ] as const;
    for (const compiler of compilers) {
      for (const category of categories) {
        const reference = compiler({ ...base, [category.key]: [] });
        const outputs: string[] = [];
        for (const item of category.choices) {
          const generated = compiler({ ...base, [category.key]: [item.id] });
          expect(generated, category.name + ':' + item.id).not.toBe(reference);
          outputs.push(generated);
        }
        // The major-sixth alias is intentionally semantically duplicate and
        // collapses to one visual choice, but string prompts retain legacy spelling.
        expect(new Set(outputs).size, category.name).toBe(category.choices.length);
      }
    }
  });

  it('detects ignored scene, tonality, and style-specific groove selections', () => {
    for (const compiler of compilers) {
      const base = recommendConfiguration('custom');
      for (const item of SCENES.filter(x => x.id !== 'custom' && x.id !== 'quiet-cafe')) {
        expect(compiler({ ...base, sceneId: item.id }), item.id).not.toBe(compiler({ ...base, sceneId: 'quiet-cafe' }));
      }
      for (const item of TONALITIES.filter(x => x.id !== 'warm-major')) {
        expect(compiler({ ...base, tonalityId: item.id }), item.id).not.toBe(compiler({ ...base, tonalityId: 'warm-major' }));
      }
      for (const style of JAZZ_STYLES) {
        const recommended = recommendConfiguration(style.id);
        const prompts = style.grooves.map(g => compiler({ ...recommended, grooveId: g.id }));
        expect(new Set(prompts).size, style.id).toBe(style.grooves.length);
      }
    }
  });

  it('honours advanced tempo feel without repeating it as a basic BPM duplicate', () => {
    const cfg = recommendConfiguration('cozy-jazz');
    for (const compiler of compilers) {
      const baseline = compiler(cfg);
      const alternate = compiler({ ...cfg, tempoFeelId: 'brisk' });
      expect(alternate).not.toBe(baseline);
      expect(compiler(cfg)).toBe(baseline);
    }
  });
});
