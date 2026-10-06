import { describe, expect, it } from 'vitest';
import { STYLE_BY_ID } from '../data/jazz-styles';
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

  it('keeps variation instruments inside the catalog for every style', () => {
    for (const style of STYLE_BY_ID.values()) {
      for (const variation of generateVariations(recommendConfiguration(style.id))) {
        for (const part of variation.instruments) expect(INSTRUMENT_BY_ID.has(part.instrumentId)).toBe(true);
      }
    }
  });
});
