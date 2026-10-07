import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { generateVariations, isRoleAppropriateBehaviour } from './variation-engine';
import { recommendConfiguration } from './recommendation-engine';
import { compilePrompt } from './prompt-compiler';

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
      if (style.foregroundRule === 'collective') expect(parts.filter((part) => part.role === 'lead').length).toBeGreaterThan(0);
      else expect(parts.filter((part) => part.role === 'lead')).toHaveLength(1);
      expect(parts.filter((part) => part.role === 'bass')).toHaveLength(style.bass.length ? 1 : 0);
      for (const part of parts) {
        expect(INSTRUMENT_BY_ID.has(part.instrumentId)).toBe(true);
        expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.roles).toContain(part.role);
        expect(INSTRUMENT_BY_ID.get(part.instrumentId)?.behaviours).toContain(part.behaviour);
      }
      const used = new Set(parts.map((part) => part.instrumentId));
      for (const [role, candidates] of [['response', style.response], ['harmony', style.harmonyInstruments], ['rhythm', style.rhythm]] as const) {
        // A part may only be absent if all supported candidates are already playing another role.
        if (candidates.length && style.foregroundRule !== 'collective') {
          expect(parts.some((part) => part.role === role) || candidates.every((id) => used.has(id))).toBe(true);
        }
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

  it('preserves the defining ensemble identity in the new styles’ A/B/C variations', () => {
    for (const variation of generateVariations(recommendConfiguration('big-band'))) {
      const ids = variation.instruments.map((part) => part.instrumentId);
      for (const id of ['trumpet', 'alto-sax', 'trombone', 'bari-sax', 'piano', 'upright-bass', 'acoustic-drums']) {
        expect(ids, 'big-band retains ' + id).toContain(id);
      }
      expect(ids.length).toBeGreaterThanOrEqual(8);
    }
    for (const variation of generateVariations(recommendConfiguration('free-jazz'))) {
      expect(variation.foregroundRule).toBe('collective');
      expect(variation.instruments.filter((part) => part.role === 'lead').length).toBeGreaterThan(1);
      expect(variation.instruments.map((part) => part.instrumentId)).toContain('upright-bass');
    }
    for (const variation of generateVariations(recommendConfiguration('piano-cafe-jazz'))) {
      expect(variation.instruments.find((part) => part.role === 'lead')?.instrumentId).toBe('piano');
    }
    for (const variation of generateVariations(recommendConfiguration('samba-jazz'))) {
      expect(variation.instruments.map((part) => part.instrumentId)).toContain('brazilian-percussion');
    }
    for (const variation of generateVariations(recommendConfiguration('jazz-waltz'))) expect(variation.meter).toBe('3/4');
  });

  it.each(['lofi-jazz', 'acid-jazz', 'big-band', 'samba-jazz', 'jazz-waltz', 'piano-cafe-jazz', 'contemporary-jazz', 'free-jazz', 'jazz-hop', 'neo-soul-jazz', 'dark-jazz', 'third-stream'])('%s variations retain style-specific behaviour and avoid rhythmic contradictions', (styleId) => {
    const style = JAZZ_STYLES.find((candidate) => candidate.id === styleId)!;
    for (const variation of generateVariations(recommendConfiguration(styleId))) {
      for (const part of variation.instruments) {
        expect(isRoleAppropriateBehaviour(part.role, part.behaviour), styleId + ': ' + part.instrumentId + ' as ' + part.role + ' → ' + part.behaviour).toBe(true);
        const recommended = style.recommendedParts?.find((candidate) => candidate.instrumentId === part.instrumentId && candidate.role === part.role);
        if (recommended) expect(part.behaviour, styleId + ': ' + part.instrumentId).toBe(recommended.behaviour);
      }
      const prompt = compilePrompt(variation).toLowerCase();
      if (['lofi-jazz', 'acid-jazz', 'jazz-hop', 'neo-soul-jazz'].includes(styleId)) expect(prompt, styleId).not.toContain('swing time');
      if (styleId === 'samba-jazz') expect(prompt, styleId).not.toMatch(/bossa|clave|tumbao|montuno/);
      if (styleId === 'jazz-waltz') expect(variation.meter).toBe('3/4');
      if (styleId === 'piano-cafe-jazz') expect(variation.instruments.find((part) => part.role === 'lead')?.instrumentId).toBe('piano');
      if (styleId === 'free-jazz') {
        expect(variation.foregroundRule).toBe('collective');
        expect(prompt).not.toContain('only one foreground melodic voice at a time');
      }
      if (styleId === 'big-band') {
        const ids = variation.instruments.map((part) => part.instrumentId);
        expect(ids).toContain('alto-sax');
        expect(ids).toContain('trumpet');
        expect(ids).toContain('trombone');
      }
      if (styleId === 'samba-jazz') expect(variation.instruments.map((part) => part.instrumentId)).toContain('brazilian-percussion');
      if (styleId === 'lofi-jazz') expect(variation.instruments.map((part) => part.instrumentId)).toContain('electric-bass');
      if (styleId === 'acid-jazz') expect(variation.instruments.map((part) => part.instrumentId)).toContain('electric-bass');
      if (styleId === 'jazz-hop') expect(variation.instruments.map((part) => part.instrumentId)).toContain('electric-bass');
      if (styleId === 'neo-soul-jazz') expect(variation.instruments.map((part) => part.instrumentId)).toContain('rhodes');
      if (styleId === 'dark-jazz') expect(prompt).toContain('dark jazz');
      if (styleId === 'third-stream') {
        expect(variation.instruments.map((part) => part.instrumentId)).toContain('piano');
        expect(variation.instruments.some((part) => ['clarinet', 'violin'].includes(part.instrumentId))).toBe(true);
      }
    }
  });

  it('selects role-appropriate style variation behaviours for the reviewed cases', () => {
    const waltzB = generateVariations(recommendConfiguration('jazz-waltz'))[1]!;
    expect(waltzB.instruments.find((part) => part.instrumentId === 'piano' && part.role === 'harmony')?.behaviour).toBe('soft, spacious chord voicings');

    const neoSoulB = generateVariations(recommendConfiguration('neo-soul-jazz'))[1]!;
    const guitarHarmony = neoSoulB.instruments.find((part) => part.instrumentId === 'jazz-electric-guitar' && part.role === 'harmony');
    expect(guitarHarmony?.behaviour).toContain('voicings');
    expect(guitarHarmony?.behaviour).not.toBe('rounded single-note phrases');

    for (const variation of generateVariations(recommendConfiguration('third-stream'))) {
      const prompt = compilePrompt(variation).toLowerCase();
      expect(prompt).toContain('composed chamber counterline');
      expect(prompt).toContain('jazz improvisation');
      expect(variation.instruments.some((part) => ['clarinet', 'violin'].includes(part.instrumentId))).toBe(true);
    }

    for (const variation of generateVariations(recommendConfiguration('contemporary-jazz'))) {
      const prompt = compilePrompt(variation).toLowerCase();
      expect(prompt).toContain('quartal voicings');
      expect(prompt).toContain('suspended harmony');
      expect(prompt).toContain('modal interchange');
    }
  });
});
