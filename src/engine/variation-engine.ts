import { INSTRUMENT_BY_ID } from '../data/instruments';
import { getStyle } from './recommendation-engine';
import type { InstrumentPart, MusicConfiguration } from '../models/types';

const STYLE_SPECIFIC_VARIATIONS = new Set([
  'lofi-jazz', 'acid-jazz', 'big-band', 'samba-jazz', 'jazz-waltz', 'piano-cafe-jazz',
  'contemporary-jazz', 'free-jazz', 'jazz-hop', 'neo-soul-jazz', 'dark-jazz', 'third-stream',
]);

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
      const styleBehaviour = STYLE_SPECIFIC_VARIATIONS.has(style.id)
        ? style.recommendedParts?.find((part) => part.instrumentId === id && part.role === role)?.behaviour
        : undefined;
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
