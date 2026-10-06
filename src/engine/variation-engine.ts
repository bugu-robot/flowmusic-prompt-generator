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
    const add = (id: string | undefined, role: InstrumentPart['role'], prominence: number) => {
      if (!id || parts.some((part) => part.instrumentId === id)) return;
      parts.push(makePart(id, role, prominence));
    };
    add(recipe.lead, 'lead', 90);
    add(recipe.response, 'response', 58);
    add(recipe.harmony, 'harmony', 42);
    add(recipe.bass, 'bass', 70);
    add(recipe.rhythm, 'rhythm', 36);
    return { ...configuration, instruments: parts };
  });
}
