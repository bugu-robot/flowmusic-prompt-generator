import { describe, expect, it } from 'vitest';
import { zhHK } from './zh-HK';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENTS } from '../data/instruments';
import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, SCENES, ROLES } from '../data/options';

describe('Traditional Chinese localization', () => {
  it('does not contain common Simplified-only characters in core UI copy', () => {
    const simplifiedOnly = /[这门后发为与仅个样么设计点时线节气声乐间开关过进还选说读写云变现长刚细并术报帮对尽页产达让题条结]/u;
    const catalogCopy = [
      ...JAZZ_STYLES.flatMap((style) => [style.nameZh, style.descriptionZh]),
      ...INSTRUMENTS.map((instrument) => instrument.nameZh),
      ...[...CONSTRAINTS, ...HARMONIES, ...MOODS, ...PRODUCTION, ...SCENES, ...ROLES].map((item) => item.label),
    ];
    expect([...Object.values(zhHK), ...catalogCopy].join('')).not.toMatch(simplifiedOnly);
  });

  it('provides the interface terms required for roles, prompts and updates', () => {
    expect(zhHK.roleLead).toBe('主奏');
    expect(zhHK.copyPrompt).toBe('複製 Prompt');
    expect(zhHK.updateAvailable).toBe('有新版本可用');
    expect(zhHK.instrumentalOnly).toBe('純音樂（Instrumental）');
  });
});
