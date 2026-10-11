import { HARMONIES } from '../data/options';
import type { MusicConfiguration } from '../models/types';
import { zhHK as t } from '../i18n/zh-HK';

// UI-only compression: keep the underlying configuration and saved preset IDs.
export const PROMINENCE_OPTIONS = [
  { id: '25', label: t.prominenceSoft },
  { id: '50', label: t.prominenceBalanced },
  { id: '75', label: t.prominenceClear },
  { id: '95', label: t.prominenceFeatured },
] as const;

// Suno's model sees qualitative descriptions, not a percentage control;
// keep every legacy numeric preference untouched until the user changes it.
export function prominenceChoice(value: number): string {
  return value < 35 ? '25' : value < 65 ? '50' : value <= 82 ? '75' : '95';
}

export function visibleHarmonyOptions(configuration: Pick<MusicConfiguration, 'harmonyIds'>) {
  // Maj6 and 6th both describe the same major-sixth chord.
  // Preserve whichever ID a saved configuration already uses.
  const showLegacySixth = configuration.harmonyIds.includes('sixth');
  return HARMONIES.filter(({ id }) => id !== (showLegacySixth ? 'maj6' : 'sixth'))
    .map((option) => option.id === 'maj6' || option.id === 'sixth'
      ? { ...option, label: t.sixthAlias }
      : option);
}

export function structureOptions(current: string, all: readonly (readonly [string, string])[]) {
  // The old 'custom' option has no custom composition editor. Do not offer it
  // to new users, but expose it for old presets so they can keep/change it.
  return all.filter(([id]) => id !== 'custom')
    .map(([id, label]) => ({ id, label }))
    .concat(current === 'custom' ? [{ id: 'custom', label: t.deprecatedStructure }] : []);
}
