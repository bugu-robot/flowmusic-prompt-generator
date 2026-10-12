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

const RECORDING_CHARACTER = new Set(['warm', 'intimate', 'acoustic', 'clean', 'spacious', 'dark', 'airy', 'close-mic']);
const RECORDING_ALWAYS_INCLUDED = new Set(['round-bass', 'smooth-highs']);
const recordingEffects = (selected: readonly string[]) =>
  selected.filter(id => !RECORDING_CHARACTER.has(id) && !RECORDING_ALWAYS_INCLUDED.has(id));
const recordingTraits = (selected: readonly string[]) => selected.filter(id => RECORDING_CHARACTER.has(id));

export type SelectionProvider = 'flow' | 'suno';

// The existing Flow Music formatter deliberately limits the number of
// descriptors it emits. Suno Simple includes every selected option without
// those caps. Round Bass and Smooth Highs are independently rendered by
// Flow and must not consume a generic recording-effect slot.
export function canSelectOption(
  group: string, selected: readonly string[], id: string,
  provider: SelectionProvider = 'flow',
): boolean {
  if (provider === 'suno' || selected.includes(id)) return true;
  if (group === 'harmonyIds') {
    if ((id === 'sixth' || id === 'maj6') && selected.some(value => value === 'sixth' || value === 'maj6')) return true;
    return selected.length < 6;
  }
  if (group === 'moodIds') return selected.length < 4;
  if (group === 'productionIds') {
    if (RECORDING_ALWAYS_INCLUDED.has(id)) return true;
    return RECORDING_CHARACTER.has(id) ? recordingTraits(selected).length < 3 : recordingEffects(selected).length < 4;
  }
  return true;
}

// Always surface the Flow-specific limitation, including when an imported
// Suno configuration already exceeds it. No options or presets are deleted.
export function selectionLimitNotice(
  group: string, selected: readonly string[], provider: SelectionProvider,
): string {
  if (provider !== 'flow') return '';
  if (group === 'moodIds') {
    return selected.length > 4
      ? 'Flow Music 只會使用前 4 個 Feel（目前已選 ' + selected.length + ' 個）；Suno Simple 會保留全部。'
      : 'Flow Music 最多使用 4 個 Feel（目前 ' + selected.length + '/4）；Suno Simple 不設此限制。';
  }
  if (group === 'harmonyIds') {
    return selected.length > 6
      ? 'Flow Music 只會使用前 6 種 Harmony（目前已選 ' + selected.length + ' 種）；Suno Simple 會保留全部。'
      : 'Flow Music 最多使用 6 種 Harmony（目前 ' + selected.length + '/6）；Suno Simple 不設此限制。';
  }
  if (group === 'productionIds') {
    const traits = recordingTraits(selected).length;
    const effects = recordingEffects(selected).length;
    return 'Flow Music Recording：音色特徵 ' + traits + '/3，其他效果 ' + effects + '/4'
      + (traits > 3 || effects > 4 ? '（超額項目只會用於 Suno Simple）' : '')
      + '。Round Bass 和 Smooth Highs 不計入上限；Suno Simple 不設此限制。';
  }
  return '';
}
