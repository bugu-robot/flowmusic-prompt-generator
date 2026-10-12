import { describe, expect, it } from 'vitest';
import { HARMONIES, MOODS, PRODUCTION, CONSTRAINTS, SCENES, TONALITIES } from '../data/options';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { recommendConfiguration } from '../engine/recommendation-engine';
import { compilePrompt } from '../engine/prompt-compiler';
import { compileSunoSimple } from '../engine/suno-simple-compiler';
import { PROMINENCE_OPTIONS, canSelectOption, selectionLimitNotice, prominenceChoice, structureOptions, visibleHarmonyOptions } from './simplified-options';

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
    const config = { ...recommendConfiguration('custom'), harmonyIds: [] };
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

  it('prevents new selections that would be silently ignored by original Flow output caps', () => {
    expect(canSelectOption('moodIds', ['warm','cozy','calm','peaceful'], 'intimate')).toBe(false);
    expect(canSelectOption('moodIds', ['warm','cozy','calm','peaceful'], 'warm')).toBe(true);
    expect(canSelectOption('harmonyIds', ['maj7','min7','add9','dom7','min9','dom9'], '13th')).toBe(false);
    expect(canSelectOption('harmonyIds', ['maj7','min7','add9','dom7','min9'], '13th')).toBe(true);
    expect(canSelectOption('harmonyIds', ['maj7','min7','add9','dom7','min9','sixth'], 'maj6')).toBe(true);
    expect(canSelectOption('productionIds', ['warm','intimate','acoustic'], 'clean')).toBe(false);
    expect(canSelectOption('productionIds', ['warm','intimate','acoustic'], 'warm')).toBe(true);
    expect(canSelectOption('productionIds', ['warm','intimate','acoustic'], 'room')).toBe(true);
    // Round Bass and Smooth Highs are independently emitted by Flow Music and
    // must not consume its 4 generic production-effect slots.
    expect(canSelectOption('productionIds', ['room','vintage','round-bass','smooth-highs'], 'analog')).toBe(true);
    expect(canSelectOption('productionIds', ['room','vintage','analog','polished'], 'soft-transients')).toBe(false);
    expect(canSelectOption('productionIds', ['room','vintage','analog','polished'], 'round-bass')).toBe(true);
    expect(canSelectOption('productionIds', ['room','vintage','analog','polished'], 'smooth-highs')).toBe(true);
    expect(canSelectOption('constraintIds', ['electronic'], 'bright-brass')).toBe(true);
    // Legacy configurations remain intact and can always remove existing selections.
    expect(canSelectOption('moodIds', MOODS.map(m => m.id), 'warm')).toBe(true);
  });

  it('allows EVERY Feel, Recording, and Harmony choice in Suno Simple irrespective of Flow-only caps', () => {
    const allMoods = MOODS.map(x => x.id);
    const allRecording = PRODUCTION.map(x => x.id);
    const allHarmony = HARMONIES.map(x => x.id);
    for (const mood of allMoods) expect(canSelectOption('moodIds', allMoods.filter(id => id !== mood), mood, 'suno'), mood).toBe(true);
    for (const production of allRecording) expect(canSelectOption('productionIds', allRecording.filter(id => id !== production), production, 'suno'), production).toBe(true);
    for (const harmony of allHarmony) expect(canSelectOption('harmonyIds', allHarmony.filter(id => id !== harmony), harmony, 'suno'), harmony).toBe(true);
    expect(selectionLimitNotice('moodIds', allMoods, 'suno')).toBe('');
    expect(selectionLimitNotice('productionIds', allRecording, 'suno')).toBe('');
    const config = recommendConfiguration('cozy-jazz');
    config.moodIds = allMoods;
    config.productionIds = allRecording;
    config.harmonyIds = allHarmony;
    const suno = compileSunoSimple(config);
    expect(suno).toContain('dreamy');
    expect(suno).toContain('playful');
    expect(suno).toContain('a polished, understated mix');
    expect(suno).toContain('close-miked');
    expect(suno).toContain('major 7th');
  });

  it('updates Flow availability immediately after removing a previously selected Feel or recording trait', () => {
    const moods = ['cozy','warm','peaceful','romantic'];
    expect(canSelectOption('moodIds', moods, 'dreamy', 'flow')).toBe(false);
    moods.splice(1, 1);
    expect(canSelectOption('moodIds', moods, 'dreamy', 'flow')).toBe(true);
    moods.push('dreamy');
    expect(canSelectOption('moodIds', moods, 'warm', 'flow')).toBe(false);

    const recording = ['warm','intimate','acoustic','room','vintage','soft-transients','analog'];
    expect(canSelectOption('productionIds', recording, 'spacious', 'flow')).toBe(false);
    expect(canSelectOption('productionIds', recording, 'polished', 'flow')).toBe(false);
    recording.splice(recording.indexOf('warm'), 1);
    expect(canSelectOption('productionIds', recording, 'spacious', 'flow')).toBe(true);
    recording.splice(recording.indexOf('room'), 1);
    expect(canSelectOption('productionIds', recording, 'polished', 'flow')).toBe(true);
    expect(canSelectOption('productionIds', recording, 'round-bass', 'flow')).toBe(true);
    expect(canSelectOption('productionIds', recording, 'smooth-highs', 'flow')).toBe(true);
  });

  it('warns clearly when switching a Suno configuration with excess choices back to Flow', () => {
    const moods = ['cozy','warm','peaceful','romantic','dreamy','playful'];
    expect(selectionLimitNotice('moodIds', moods, 'flow')).toContain('前 4 個');
    expect(selectionLimitNotice('moodIds', moods, 'flow')).toContain('6 個');
    expect(canSelectOption('moodIds', moods, 'cozy', 'flow')).toBe(true);
    expect(canSelectOption('moodIds', moods, 'nostalgic', 'flow')).toBe(false);
    const recording = ['warm','intimate','acoustic','clean','room','vintage','soft-transients','analog','polished'];
    expect(selectionLimitNotice('productionIds', recording, 'flow')).toContain('超額項目');
    expect(selectionLimitNotice('productionIds', recording, 'suno')).toBe('');
    const harmony = ['maj7','min7','add9','dom7','min9','dom9','13th'];
    expect(selectionLimitNotice('harmonyIds', harmony, 'flow')).toContain('前 6 種');
    expect(canSelectOption('harmonyIds', harmony, 'maj7', 'flow')).toBe(true);
    expect(canSelectOption('harmonyIds', harmony, 'altered', 'flow')).toBe(false);
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
