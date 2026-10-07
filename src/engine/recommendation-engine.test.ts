import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES, STYLE_BY_ID } from '../data/jazz-styles';
import { INSTRUMENTS, INSTRUMENT_BY_ID } from '../data/instruments';
import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, ROLES, SCENES, TONALITIES } from '../data/options';
import { recommendConfiguration } from './recommendation-engine';

describe('Jazz style data and recommendations', () => {
  it('loads the complete initial style catalog and every entry has type-safe recommendations', () => {
    expect(JAZZ_STYLES).toHaveLength(38);
    expect(JAZZ_STYLES.filter((style) => style.classification !== 'custom')).toHaveLength(37);
    expect(JAZZ_STYLES.filter((style) => style.classification === 'custom')).toHaveLength(1);
    for (const style of JAZZ_STYLES) {
      expect(style.tempo.min).toBeLessThan(style.tempo.max);
      expect(style.tempo.default).toBeGreaterThanOrEqual(style.tempo.min);
      expect(style.tempo.default).toBeLessThanOrEqual(style.tempo.max);
      expect(style.meters.length).toBeGreaterThan(0);
      expect(style.meters[0]).toBe(style.id === 'jazz-waltz' ? '3/4' : '4/4');
      expect(style.lead.length).toBeGreaterThan(0);
      expect(style.bass.length).toBeGreaterThan(0);
      expect(style.variations).toHaveLength(3);
    }
    expect(STYLE_BY_ID.get('jazz-ballad')?.meters).toContain('3/4');
    expect(STYLE_BY_ID.get('jazz-waltz')?.meters[0]).toBe('3/4');
    expect(recommendConfiguration('jazz-waltz').meter).toBe('3/4');
    expect(STYLE_BY_ID.get('samba-jazz')?.meters).toEqual(['4/4', '2/4']);
    expect(recommendConfiguration('samba-jazz').meter).toBe('4/4');
    expect(STYLE_BY_ID.get('third-stream')?.meters).toEqual(['4/4', '3/4']);
    expect(recommendConfiguration('third-stream').meter).toBe('4/4');
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
      const recommended = [...style.lead, ...style.response, ...style.harmonyInstruments, ...style.bass, ...style.rhythm, ...(style.recommendedParts ?? []).map((part) => part.instrumentId)];
      expect(style.unusualInstruments.filter((id) => recommended.includes(id))).toEqual([]);
  });

  it('keeps every taxonomy, default and unique instrument-role pairing explicit', () => {
    const ids = JAZZ_STYLES.map((style) => style.id);
    expect(new Set(ids).size).toBe(ids.length);
    const styles = [
      ['lofi-jazz', 'modern-descriptor'],
      ['acid-jazz', 'historical-derived-style'],
      ['big-band', 'historical-style'],
      ['samba-jazz', 'historical-derived-style'],
      ['jazz-waltz', 'historical-derived-style'],
      ['piano-cafe-jazz', 'modern-descriptor'],
      ['contemporary-jazz', 'modern-descriptor'],
      ['free-jazz', 'historical-style'],
      ['jazz-hop', 'modern-descriptor'],
      ['neo-soul-jazz', 'modern-descriptor'],
      ['dark-jazz', 'modern-descriptor'],
      ['third-stream', 'historical-derived-style'],
    ] as const;
    for (const [id, classification] of styles) expect(STYLE_BY_ID.get(id)?.classification).toBe(classification);

    for (const style of JAZZ_STYLES) {
      const explicitParts = style.recommendedParts ?? [];
      const explicitIds = explicitParts.map((part) => part.instrumentId);
      expect(new Set(explicitIds).size, style.id + ' explicit recommendations').toBe(explicitIds.length);
      for (const part of explicitParts) {
        expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.roles, style.id + ': ' + part.instrumentId).toContain(part.role);
      }
      const recommendedRoles: Array<[string[], 'lead' | 'response' | 'harmony' | 'bass' | 'rhythm']> = [
        [style.lead, 'lead'], [style.response, 'response'], [style.harmonyInstruments, 'harmony'],
        [style.bass, 'bass'], [style.rhythm, 'rhythm'],
      ];
      for (const [instrumentIds, role] of recommendedRoles) {
        for (const id of instrumentIds) expect(INSTRUMENT_BY_ID.get(id)?.roles, style.id + ': ' + id + ' as ' + role).toContain(role);
      }
      const parts = recommendConfiguration(style.id).instruments;
      const partIds = parts.map((part) => part.instrumentId);
      expect(new Set(partIds).size, style.id).toBe(partIds.length);
      expect(recommendConfiguration(style.id)).toEqual(recommendConfiguration(style.id));
      if (['lofi-jazz', 'acid-jazz', 'big-band', 'samba-jazz', 'jazz-waltz', 'piano-cafe-jazz', 'contemporary-jazz', 'free-jazz', 'jazz-hop', 'neo-soul-jazz', 'dark-jazz', 'third-stream'].includes(style.id)) {
        for (const part of style.recommendedParts ?? []) {
          expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.roles, style.id + ': ' + part.instrumentId).toContain(part.role);
          expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.behaviours, style.id + ': ' + part.behaviour).toContain(part.behaviour);
        }
      }
    }
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
        expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.behaviours).toContain(part.behaviour);
      }
    }
  });

  it('keeps each default ensemble unique with supported roles and one lead, except collective-front-line styles', () => {
    for (const style of JAZZ_STYLES) {
      const configuration = recommendConfiguration(style.id);
      const ids = configuration.instruments.map((part) => part.instrumentId);
      const leads = configuration.instruments.filter((part) => part.role === 'lead');
      expect(new Set(ids).size, style.id).toBe(ids.length);
      for (const item of configuration.instruments) expect(INSTRUMENT_BY_ID.get(item.instrumentId)?.roles, style.id).toContain(item.role);
      if (style.foregroundRule === 'collective') {
        expect(configuration.foregroundRule, style.id).toBe('collective');
        expect(leads.length, style.id).toBeGreaterThan(0);
      } else {
        expect(leads, style.id).toHaveLength(1);
      }
    }
  });

  it('keeps Custom user-defined and uses the existing default instrument behaviours', () => {
    const configuration = recommendConfiguration('custom');
    expect(configuration.foregroundRule).toBe('single');
    expect(configuration.instruments.find((part) => part.role === 'lead')?.instrumentId).toBe('piano');
    expect(configuration.instruments.find((part) => part.role === 'lead')?.behaviour).toBe(INSTRUMENT_BY_ID.get('piano')?.behaviours[0]);
  });
});
