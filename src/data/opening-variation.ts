import type { InstrumentPart, MusicConfiguration } from '../models/types';
import { INSTRUMENT_BY_ID } from './instruments';
import { instrumentWording, instrumentNameZh } from './piano-timbres';

export const OPENING_MODES = [
  { id: 'auto', label: '自動輪替 Auto Rotate' },
  { id: 'chord', label: '和弦開場 Chord Opening' },
  { id: 'bass', label: '低音先行 Bass First' },
  { id: 'pickup', label: '旋律弱起 Melodic Pickup' },
  { id: 'arpeggio', label: '輕柔琶音 Gentle Arpeggio' },
  { id: 'mid-phrase', label: '樂句中途切入 Mid-Phrase Opening' },
  { id: 'original', label: '原有開場 Original / No Variation' },
] as const;
export type OpeningMode = typeof OPENING_MODES[number]['id'];
export const normalizeOpeningSeed = (seed: unknown): number => typeof seed === 'number' && Number.isSafeInteger(seed) && seed >= 0 ? seed % 1000000 : 0;
export function openingSettings(value: Record<string, unknown>): Pick<MusicConfiguration, 'openingMode' | 'openingSeed'> {
  const mode = OPENING_MODES.find(item => item.id === value.openingMode)?.id;
  return mode ? { openingMode: mode, openingSeed: normalizeOpeningSeed(value.openingSeed) } : {};
}
export function smartOpeningConfiguration(config: MusicConfiguration, seed: number, index: number): MusicConfiguration {
  return config.openingMode === 'auto' ? { ...config, openingSeed: normalizeOpeningSeed(normalizeOpeningSeed(config.openingSeed) + normalizeOpeningSeed(seed) + index + 1) } : config;
}
export interface OpeningPlan { id: string; instruction: string; descriptionZh: string }
export function resolveOpening(config: MusicConfiguration): OpeningPlan {
  const none = { id: 'original', instruction: '', descriptionZh: '原有開場，不加入變化指令。' };
  if (!config.openingMode || config.openingMode === 'original') return none;
  const active = config.instruments.filter(part => part.enabled && INSTRUMENT_BY_ID.get(part.instrumentId)?.roles.includes(part.role));
  if (!active.length) return { ...none, descriptionZh: '沒有可用聲部，保留原有開場。' };
  const lead = active.filter(p => p.role === 'lead').sort((a,b) => b.prominence-a.prominence)[0];
  const harmony = active.find(p => p.role === 'harmony' && ['keyboard','guitar'].includes(INSTRUMENT_BY_ID.get(p.instrumentId)!.category));
  const bass = active.find(p => p.role === 'bass');
  const plans: OpeningPlan[] = [];
  const add = (id: string, part: InstrumentPart | undefined, en: string, zh: string) => {
    if (part) plans.push({ id, instruction: 'Opening: ' + instrumentWording(part) + ' ' + en, descriptionZh: instrumentNameZh(part) + '：' + zh });
  };
  add('chord', harmony, lead ? 'introduces a spacious voicing of the selected harmony before the configured lead enters naturally.' : 'introduces a spacious voicing of the selected harmony in its accompaniment role.', lead ? '以所選和聲的疏落和弦開場，主奏再自然進入。' : '按伴奏分工以所選和聲的疏落和弦開場。');
  add('bass', bass, 'enters first with a brief bass-role gesture within the selected groove, then the remaining assigned parts join naturally.', '以符合所選律動的短低音樂句先行，其餘聲部自然加入。');
  add('pickup', lead, 'begins with a brief melodic pickup placed around the selected pulse, resolving naturally into the first phrase.', '以貼合所選拍感的短弱起旋律，自然接入首個樂句。');
  add('arpeggio', harmony, lead ? 'opens with a brief, unhurried broken voicing of the selected chords as accompaniment, leaving space for the assigned lead.' : 'opens with a brief, unhurried broken voicing of the selected chords in its accompaniment role.', lead ? '以簡短從容的分解和弦伴奏開場，為主奏留白。' : '以簡短從容的分解和弦伴奏開場，保留空間。');
  add('mid-phrase', lead, 'enters as though a melodic phrase is already unfolding, with an asymmetrical contour and an unforced pause.', '像旋律已在進行中般切入，以不對稱線條自然停頓。');
  const seed = normalizeOpeningSeed(config.openingSeed);
  const chosen = (config.openingMode === 'auto' ? undefined : plans.find(p => p.id === config.openingMode))
    ?? plans[seed % Math.max(1,plans.length)]
    ?? { id: 'role-entrance', instruction: 'Opening: use a brief, varied entrance from the enabled parts in their assigned roles, leaving natural space.', descriptionZh: '由已啟用聲部按原有分工自然進入，保留空間。' };
  const details = [
    ['Vary interval direction and phrase lengths within the selected melodic density, leaving breathing space.', '在所選旋律密度內變化音程方向與句長，保留呼吸空間。'],
    ['Vary attack placement around the existing groove and let the first gesture breathe before continuing.', '圍繞原有律動變化起音位置，首句後自然留白。'],
    ['Use an unforced contour and a different balance of held notes and rests within the selected energy.', '保持所選能量，以自然線條變化延音與休止比例。'],
  ] as const;
  if (!plans.length) {
    const neutral = ['Use a brief initial rest.', 'Let the first entrance linger briefly.', 'Space the first two entrances unevenly within the chosen pulse.'][seed % 3]!;
    const zh = ['起首先稍作休止。', '首個起音稍作延留。', '按原有拍感讓首兩次進入疏密有別。'][seed % 3]!;
    return { ...chosen, instruction: chosen.instruction + ' ' + neutral + ' Vary entrance timing and rests within the existing groove and dynamics; do not add melodic or chordal parts.', descriptionZh: chosen.descriptionZh + zh };
  }
  const detail = details[Math.floor(seed / (config.openingMode === 'auto' ? Math.max(1,plans.length) : 1)) % details.length]!;
  return { id: chosen.id, instruction: chosen.instruction + ' ' + detail[0]
    + ' Keep the selected style, tempo, groove, harmony, mood, energy, dynamics and assigned roles unchanged. Use only the enabled ensemble. Avoid a stock repeated two-note intro, mechanical opening ostinatos and identical opening phrases; retain any style-defining accompaniment after the entrance.',
    descriptionZh: chosen.descriptionZh + detail[1] + '保持風格、速度、律動、和聲、情緒、能量及強弱；只用已啟用樂器與原有分工，避免制式重複兩音開場。' };
}
