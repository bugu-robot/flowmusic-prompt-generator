import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES, STYLE_BY_ID } from '../data/jazz-styles';
import { INSTRUMENTS, INSTRUMENT_BY_ID } from '../data/instruments';
import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, ROLES, SCENES, TONALITIES } from '../data/options';
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

  it('recommends a Manouche acoustic guitar as the Gypsy Jazz primary lead', () => {
    const configuration = recommendConfiguration('gypsy-jazz');
    expect(configuration.instruments.find((part) => part.role === 'lead')?.instrumentId).toBe('manouche-guitar');
    expect(INSTRUMENT_BY_ID.get('manouche-guitar')?.families).toContain('gypsy');
    expect(configuration.harmonyIds).toContain('maj6');
    expect(configuration.harmonyIds).not.toContain('sixth');
  });

  it.each(JAZZ_STYLES)('$name never marks its own recommended instruments unusual', (style) => {
    const recommended = [...style.lead, ...style.response, ...style.harmonyInstruments, ...style.bass, ...style.rhythm];
    expect(style.unusualInstruments.filter((id) => recommended.includes(id))).toEqual([]);
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
      TONALITIES.map((item) => item.id), CONSTRAINTS.map((item) => item.id), ROLES.map((item) => item.id),
    ];
    for (const ids of catalogs) expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates every built-in style reference, variation and recommended configuration', () => {
    const styleIds = new Set(JAZZ_STYLES.map((item) => item.id));
    const instrumentIds = new Set(INSTRUMENTS.map((item) => item.id));
    const harmonyIds = new Set(HARMONIES.map((item) => item.id));
    const moodIds = new Set(MOODS.map((item) => item.id));
    const sceneIds = new Set(SCENES.map((item) => item.id));
    const productionIds = new Set(PRODUCTION.map((item) => item.id));
    const constraintIds = new Set(CONSTRAINTS.map((item) => item.id));

    for (const style of JAZZ_STYLES) {
      expect(style.tempo.default).toBeGreaterThanOrEqual(style.tempo.min);
      expect(style.tempo.default).toBeLessThanOrEqual(style.tempo.max);
      expect(style.meters.length).toBeGreaterThan(0);
      for (const meter of style.meters) {
        const [numerator, denominator] = meter.split('/').map(Number);
        expect(numerator).toBeGreaterThan(0);
        expect(denominator).toBeGreaterThan(0);
      }
      expect(new Set(style.grooves.map((item) => item.id)).size).toBe(style.grooves.length);
      expect(new Set(style.tonalities.map((item) => item.id)).size).toBe(style.tonalities.length);
      expect(style.harmony.every((id) => harmonyIds.has(id))).toBe(true);
      expect(style.lead.every((id) => instrumentIds.has(id))).toBe(true);
      expect(style.response.every((id) => instrumentIds.has(id))).toBe(true);
      expect(style.harmonyInstruments.every((id) => instrumentIds.has(id))).toBe(true);
      expect(style.harmonyInstruments.every((id) => INSTRUMENT_BY_ID.get(id)?.roles.includes('harmony'))).toBe(true);
      expect(style.bass.every((id) => instrumentIds.has(id))).toBe(true);
      expect(style.rhythm.every((id) => instrumentIds.has(id))).toBe(true);
      expect(style.moods.every((id) => moodIds.has(id))).toBe(true);
      expect(style.scenes.every((id) => sceneIds.has(id))).toBe(true);
      expect(style.production.every((id) => productionIds.has(id))).toBe(true);
      expect(style.constraints.every((id) => constraintIds.has(id))).toBe(true);
      expect(style.compatibleStyles.every((id) => styleIds.has(id))).toBe(true);
      expect(style.unusualInstruments.every((id) => instrumentIds.has(id))).toBe(true);

      const recipeParts = style.variations.flatMap((recipe) => [
        ['lead', recipe.lead], ['response', recipe.response], ['harmony', recipe.harmony],
        ['bass', recipe.bass], ['rhythm', recipe.rhythm],
      ] as const);
      for (const [role, id] of recipeParts) {
        if (!id) continue;
        expect(instrumentIds.has(id)).toBe(true);
        expect(INSTRUMENT_BY_ID.get(id)?.roles, `${style.id}: ${id} used as ${role}`).toContain(role);
      }

      const configuration = recommendConfiguration(style.id);
      expect(styleIds.has(configuration.styleId)).toBe(true);
      expect(style.grooves.some((item) => item.id === configuration.grooveId)).toBe(true);
      expect(style.tonalities.some((item) => item.id === configuration.tonalityId)).toBe(true);
      expect(style.meters).toContain(configuration.meter);
      for (const id of [...configuration.harmonyIds]) expect(harmonyIds.has(id)).toBe(true);
      for (const id of [...configuration.moodIds]) expect(moodIds.has(id)).toBe(true);
      expect(sceneIds.has(configuration.sceneId)).toBe(true);
      for (const id of [...configuration.productionIds]) expect(productionIds.has(id)).toBe(true);
      for (const id of [...configuration.constraintIds]) expect(constraintIds.has(id)).toBe(true);
      if (configuration.secondaryStyleId) expect(styleIds.has(configuration.secondaryStyleId)).toBe(true);
      for (const part of configuration.instruments) {
        expect(instrumentIds.has(part.instrumentId)).toBe(true);
        expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.roles).toContain(part.role);
      }
    }
  });
});
