import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { generateVariations } from './variation-engine';
import { recommendConfiguration } from './recommendation-engine';

describe('curated arrangement variations', () => {
  it('returns three repeatable instrument-role variations from style data', () => {
    const configuration = recommendConfiguration('slow-bossa');
    const first = generateVariations(configuration);
    expect(first).toHaveLength(3);
    expect(generateVariations(configuration)).toEqual(first);
    expect(new Set(first.map((variation) => variation.instruments.find((part) => part.role === 'lead')?.instrumentId)).size).toBeGreaterThan(1);
  });

  it.each(JAZZ_STYLES)('$name variations retain a valid, distinct and supported ensemble', (style) => {
    const configuration = recommendConfiguration(style.id);
    const variations = generateVariations(configuration);
    expect(generateVariations(configuration)).toEqual(variations);
    for (const variation of variations) {
      const parts = variation.instruments;
      expect(new Set(parts.map((part) => part.instrumentId)).size).toBe(parts.length);
      expect(parts.filter((part) => part.role === 'lead')).toHaveLength(1);
      expect(parts.filter((part) => part.role === 'bass')).toHaveLength(style.bass.length ? 1 : 0);
      for (const part of parts) {
        expect(INSTRUMENT_BY_ID.has(part.instrumentId)).toBe(true);
        expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.roles).toContain(part.role);
      }
      const used = new Set(parts.map((part) => part.instrumentId));
      for (const [role, candidates] of [['response', style.response], ['harmony', style.harmonyInstruments], ['rhythm', style.rhythm]] as const) {
        // A part may only be absent if all supported candidates are already playing another role.
        if (candidates.length) expect(parts.some((part) => part.role === role) || candidates.every((id) => used.has(id))).toBe(true);
      }
      expect(parts.some((part) => ['response', 'harmony', 'rhythm'].includes(part.role))).toBe(true);
    }
  });

  it('uses the next compatible response when a recipe response duplicates the lead', () => {
    const variation = generateVariations(recommendConfiguration('slow-bossa'))[2]!;
    expect(variation.instruments.find((part) => part.role === 'lead')?.instrumentId).toBe('flugelhorn');
    expect(variation.instruments.find((part) => part.role === 'response')?.instrumentId).toBe('vibraphone');
    expect(variation.instruments.some((part) => part.role === 'rhythm')).toBe(true);
  });
});
