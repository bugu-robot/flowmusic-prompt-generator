import { describe, expect, it } from 'vitest';
import { zhHK } from './zh-HK';
import { INSTRUMENT_BEHAVIOUR_ZH_HK, instrumentBehaviourLabelZhHK } from './instrument-behaviour-zh-HK';
import { GROOVE_ZH_HK, grooveLabelZhHK } from './groove-zh-HK';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENTS } from '../data/instruments';
import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, SCENES, ROLES } from '../data/options';

describe('Traditional Chinese localization', () => {
  it('does not contain common Simplified-only characters in core UI copy', () => {
    const simplifiedOnly = /[这门后发为与仅个样么设计点时线节气声乐间开关过进还选说读写云变现长刚细并术报帮对尽页产达让题条结]/u;
    const catalogCopy = [
      ...JAZZ_STYLES.flatMap((style) => [style.nameZh, style.descriptionZh]),
      ...INSTRUMENTS.map((instrument) => instrument.nameZh),
      ...Object.values(INSTRUMENT_BEHAVIOUR_ZH_HK),
      ...Object.values(GROOVE_ZH_HK),
      ...[...CONSTRAINTS, ...HARMONIES, ...MOODS, ...PRODUCTION, ...SCENES, ...ROLES].map((item) => item.label),
    ];
    expect([...Object.values(zhHK), ...catalogCopy].join('')).not.toMatch(simplifiedOnly);
  });

  it('provides Traditional Chinese labels for every instrument behaviour while preserving the English source value', () => {
    for (const instrument of INSTRUMENTS) {
      for (const behaviour of instrument.behaviours) {
        expect(INSTRUMENT_BEHAVIOUR_ZH_HK[behaviour], instrument.id + ': ' + behaviour).toBeTruthy();
        expect(instrumentBehaviourLabelZhHK(behaviour), instrument.id + ': ' + behaviour).not.toBe(behaviour);
      }
    }
  });

  it('provides bilingual Traditional Chinese and English labels for every groove option', () => {
    const grooves = new Map(JAZZ_STYLES.flatMap((style) => style.grooves.map((groove) => [groove.id, groove] as const)));
    for (const [id, groove] of grooves) {
      expect(GROOVE_ZH_HK[id], id).toBeTruthy();
      const label = grooveLabelZhHK(id, groove.label);
      expect(label, id).toContain(GROOVE_ZH_HK[id]!);
      expect(label, id).toContain(groove.label);
    }
  });

  it('keeps Dynamics and Arrangement choices bilingual', () => {
    expect(zhHK.dynamicsVeryStable).toBe('非常穩定 Very Stable');
    expect(zhHK.dynamicsStable).toBe('穩定 Stable');
    expect(zhHK.dynamicsGentle).toBe('緩慢變化 Gentle Evolution');
    expect(zhHK.dynamicsBuild).toBe('漸進提升 Gradual Build');
    expect(zhHK.dynamicsDynamic).toBe('高動態 Dynamic');
    expect(zhHK.structureContinuous).toBe('連續背景 Continuous Background');
    expect(zhHK.structureEvolution).toBe('緩慢演變 Gentle Evolution');
    expect(zhHK.structureSections).toBe('傳統段落 Traditional Sections');
    expect(zhHK.structureCustom).toBe('自訂 Custom');
  });

  it('provides the interface terms required for roles, prompts and updates', () => {
    expect(zhHK.roleLead).toBe('主奏');
    expect(zhHK.copyPrompt).toBe('複製 Prompt');
    expect(zhHK.updateAvailable).toBe('有新版本可用');
    expect(zhHK.instrumentalOnly).toBe('純音樂（Instrumental）');
  });
});
