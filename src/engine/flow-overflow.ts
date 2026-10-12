import { HARMONIES, MOODS, PRODUCTION } from '../data/options';
import type { MusicConfiguration } from '../models/types';

export interface FlowOverflow {
  group: string;
  omitted: string[];
}
const CHARACTER = new Set(['warm', 'intimate', 'acoustic', 'clean', 'spacious', 'dark', 'airy', 'close-mic']);
const SPECIAL = new Set(['round-bass', 'smooth-highs']);
const unique = (ids: readonly string[]) => [...new Set(ids)];
const labels = (ids: string[], catalog: {id: string; label: string}[]) =>
  ids.map(id => catalog.find(item => item.id === id)?.label ?? id);

// Mirrors the existing Flow compiler slice order. This is a UI explanation,
// not a second prompt compiler or a mutation of the saved configuration.
export function flowOmittedOptions(config: MusicConfiguration): FlowOverflow[] {
  const result: FlowOverflow[] = [];
  const moods = unique(config.moodIds).filter(id => MOODS.some(option => option.id === id));
  const harmony = unique(config.harmonyIds).filter(id => HARMONIES.some(option => option.id === id));
  const production = unique(config.productionIds).filter(id => PRODUCTION.some(option => option.id === id));
  const traits = production.filter(id => CHARACTER.has(id));
  const effects = production.filter(id => !CHARACTER.has(id) && !SPECIAL.has(id));
  for (const [group, omitted] of [
    ['Feel', labels(moods.slice(4), MOODS)],
    ['Harmony', labels(harmony.slice(6), HARMONIES)],
    ['Recording 音色', labels(traits.slice(3), PRODUCTION)],
    ['Recording 效果', labels(effects.slice(4), PRODUCTION)],
  ] as const) {
    if (omitted.length) result.push({ group, omitted });
  }
  return result;
}
