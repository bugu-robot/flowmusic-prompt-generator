import { describe, expect, it } from 'vitest';
import { zhHK } from './zh-HK';

describe('Traditional Chinese localization', () => {
  it('does not contain common Simplified-only characters in core UI copy', () => {
    const simplifiedOnly = /[这门后发为与仅个样么设计点时线节气声乐间开关过进还]/u;
    expect(Object.values(zhHK).join('')).not.toMatch(simplifiedOnly);
  });

  it('provides the interface terms required for roles, prompts and updates', () => {
    expect(zhHK.roleLead).toBe('主奏');
    expect(zhHK.copyPrompt).toBe('複製 Prompt');
    expect(zhHK.updateAvailable).toBe('有新版本可用');
  });
});
