import { INSTRUMENT_BY_ID } from '../data/instruments';
import { getStyle } from './recommendation-engine';
import type { InstrumentPart, MusicConfiguration } from '../models/types';

const STYLE_SPECIFIC_VARIATIONS = new Set([
  'lofi-jazz', 'acid-jazz', 'big-band', 'samba-jazz', 'jazz-waltz', 'piano-cafe-jazz',
  'contemporary-jazz', 'free-jazz', 'jazz-hop', 'neo-soul-jazz', 'dark-jazz', 'third-stream',
]);

const ROLE_BEHAVIOUR_PATTERNS: Record<InstrumentPart['role'], RegExp> = {
  lead: /\b(phrases?|melodic|improvis\w*|solos?|main line|single-note|motifs?|gestures?|notes?|lead)\b/i,
  response: /\b(responses?|repl(?:y|ies)|answers?|counterline|lines?|phrases?|stabs|comping|support|single-note|improvis\w*)\b/i,
  harmony: /\b(chords?|voicings?|comping|harmony|counterpoint|counterline|supports?|sustain\w*|colou?rs?)\b/i,
  bass: /\b(bass|low-register|foundation|pedal|pulse|ostinato|lines?|pocket|tumbao)\b/i,
  rhythm: /\b(pulse|groove|beat|rhythm|time|brush\w*|accent\w*|pattern|pocket|percussion|hi-hat|hat|ride|swing)\b/i,
  texture: /\b(texture|colou?rs?|sustain\w*|background|atmosphere|fields?)\b/i,
  countermelody: /\b(counter\w*|interlock\w*|overlap\w*|weav\w*|lines?|motifs?|responses?|answers?)\b/i,
};

export function isRoleAppropriateBehaviour(role: InstrumentPart['role'], behaviour: string): boolean {
  return ROLE_BEHAVIOUR_PATTERNS[role].test(behaviour);
}

function variationBehaviour(style: ReturnType<typeof getStyle>, instrumentId: string, role: InstrumentPart['role']): string {
  const instrument = INSTRUMENT_BY_ID.get(instrumentId);
  if (!instrument) return '';
  const recommendations = style.recommendedParts?.filter((part) => part.instrumentId === instrumentId) ?? [];
  const exact = recommendations.find((part) => part.role === role);
  if (exact) return exact.behaviour;
  const matcher = ROLE_BEHAVIOUR_PATTERNS[role];
  const styleSuitable = recommendations.find((part) => matcher.test(part.behaviour));
  if (styleSuitable) return styleSuitable.behaviour;
  return instrument.behaviours.find((behaviour) => matcher.test(behaviour)) ?? instrument.behaviours[0] ?? '';
}

function makePart(instrumentId: string, role: InstrumentPart['role'], prominence: number, behaviour?: string): InstrumentPart {
  const instrument = INSTRUMENT_BY_ID.get(instrumentId);
  return { instrumentId, enabled: true, role, prominence, behaviour: behaviour ?? instrument?.behaviours[0] ?? '' };
}

export function generateVariations(configuration: MusicConfiguration): MusicConfiguration[] {
  const style = getStyle(configuration.styleId);
  const recipes = style.variations;
  if (!recipes.length) return [];
  return recipes.map((recipe) => {
    if (recipe.ensemble) {
      const used = new Set<string>();
      const instruments = recipe.ensemble.flatMap((part) => {
        const instrument = INSTRUMENT_BY_ID.get(part.instrumentId);
        if (!instrument?.roles.includes(part.role) || !instrument.behaviours.includes(part.behaviour) || used.has(part.instrumentId)) return [];
        used.add(part.instrumentId);
        return [{ ...part, enabled: true }];
      });
      return { ...configuration, instruments };
    }

    const parts: InstrumentPart[] = [];
    const add = (preferredId: string | undefined, alternatives: string[], role: InstrumentPart['role'], prominence: number) => {
      const id = [preferredId, ...alternatives].find((candidate) => candidate
        && INSTRUMENT_BY_ID.get(candidate)?.roles.includes(role)
        && !parts.some((part) => part.instrumentId === candidate));
      if (!id) return;
      const styleBehaviour = STYLE_SPECIFIC_VARIATIONS.has(style.id) ? variationBehaviour(style, id, role) : undefined;
      parts.push(makePart(id, role, prominence, styleBehaviour));
    };
    add(recipe.lead, style.lead, 'lead', 90);
    add(recipe.response, style.response, 'response', 58);
    add(recipe.harmony, style.harmonyInstruments, 'harmony', 42);
    add(recipe.bass, style.bass, 'bass', 70);
    add(recipe.rhythm, style.rhythm, 'rhythm', 36);
    return { ...configuration, instruments: parts };
  });
}
