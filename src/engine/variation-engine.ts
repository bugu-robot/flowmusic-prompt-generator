import { INSTRUMENT_BY_ID } from '../data/instruments';
import { getStyle } from './recommendation-engine';
import type { InstrumentPart, MusicConfiguration } from '../models/types';

function makePart(instrumentId: string, role: InstrumentPart['role'], prominence: number): InstrumentPart {
  const instrument = INSTRUMENT_BY_ID.get(instrumentId);
  return { instrumentId, enabled: true, role, prominence, behaviour: instrument?.behaviours[0] ?? '' };
}

export function generateVariations(configuration: MusicConfiguration): MusicConfiguration[] {
  const style = getStyle(configuration.styleId);
  const recipes = style.variations;
  if (!recipes.length) return [];
  return recipes.map((recipe) => {
    const parts: InstrumentPart[] = [];
    const add = (preferredId: string | undefined, alternatives: string[], role: InstrumentPart['role'], prominence: number) => {
      const id = [preferredId, ...alternatives].find((candidate) => candidate
        && INSTRUMENT_BY_ID.get(candidate)?.roles.includes(role)
        && !parts.some((part) => part.instrumentId === candidate));
      if (!id) return;
      parts.push(makePart(id, role, prominence));
    };
    add(recipe.lead, style.lead, 'lead', 90);
    add(recipe.response, style.response, 'response', 58);
    add(recipe.harmony, style.harmonyInstruments, 'harmony', 42);
    add(recipe.bass, style.bass, 'bass', 70);
    add(recipe.rhythm, style.rhythm, 'rhythm', 36);
    return { ...configuration, instruments: parts };
  });
}
