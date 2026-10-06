import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES, STYLE_BY_ID } from '../data/jazz-styles';
import { INSTRUMENTS, INSTRUMENT_BY_ID } from '../data/instruments';
import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, SCENES, TONALITIES } from '../data/options';
import { recommendConfiguration } from './recommendation-engine';

describe('Jazz style data and recommendations', () => {
  it('loads the complete initial style catalog and every entry has type-safe recommendations', () => {
    expect(JAZZ_STYLES.length).toBeGreaterThanOrEqual(25);
    for (const style of JAZZ_STYLES) {
      expect(style.tempo.min).toBeLessThan(style.tempo.max);
      expect(style.tempo.default).toBeGreaterThanOrEqual(style.tempo.min);
      expect(style.tempo.default).toBeLessThanOrEqual(style.tempo.max);
      expect(style.meters.length).toBeGreaterThan(0);
      expect(style.meters[0]).toBe('4/4');
      expect(style.lead.length).toBeGreaterThan(0);
      expect(style.bass.length).toBeGreaterThan(0);
      expect(style.variations).toHaveLength(3);
    }
    expect(STYLE_BY_ID.get('jazz-ballad')?.meters).toContain('3/4');
    expect(STYLE_BY_ID.get('new-orleans')?.meters).toContain('2/4');
  });

  it('recommends 58 BPM, nylon guitar, flugelhorn and upright bass for Slow Bossa', () => {
    const config = recommendConfiguration('slow-bossa');
    expect(config.tempo).toBe(58);
    expect(config.instruments.find((part) => part.role === 'lead')?.instrumentId).toBe('nylon-guitar');
    expect(config.instruments.find((part) => part.role === 'response')?.instrumentId).toBe('flugelhorn');
    expect(config.instruments.find((part) => part.role === 'bass')?.instrumentId).toBe('upright-bass');
  });

  it('loads distinct Cool Jazz and Bebop defaults', () => {
    expect(recommendConfiguration('cool-jazz').tempo).toBe(92);
    expect(recommendConfiguration('cool-jazz').instruments[0]?.instrumentId).toBe('muted-trumpet');
    expect(recommendConfiguration('bebop').tempo).toBe(190);
    expect(recommendConfiguration('bebop').instruments[0]?.instrumentId).toBe('trumpet');
  });

  it('marks Cozy Jazz and Brisk Jazz as modern descriptors', () => {
    expect(STYLE_BY_ID.get('cozy-jazz')?.classification).toBe('modern-descriptor');
    expect(STYLE_BY_ID.get('brisk-jazz')?.classification).toBe('modern-descriptor');
  });

  it('does not recommend unknown instrument IDs', () => {
    for (const style of JAZZ_STYLES) {
      for (const id of [...style.lead, ...style.response, ...style.bass, ...style.rhythm]) expect(INSTRUMENT_BY_ID.has(id)).toBe(true);
    }
  });

  it('keeps reusable data catalog identifiers unique', () => {
    const catalogs = [
      JAZZ_STYLES.map((item) => item.id), INSTRUMENTS.map((item) => item.id), HARMONIES.map((item) => item.id),
      MOODS.map((item) => item.id), PRODUCTION.map((item) => item.id), SCENES.map((item) => item.id),
      TONALITIES.map((item) => item.id), CONSTRAINTS.map((item) => item.id),
    ];
    for (const ids of catalogs) expect(new Set(ids).size).toBe(ids.length);
  });
});
