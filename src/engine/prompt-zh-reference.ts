import { resolveOpening } from '../data/opening-variation';
import type { MusicConfiguration } from '../models/types';
import { STYLE_BY_ID, JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { instrumentNameZh } from '../data/piano-timbres';
import { GROOVE_ZH_HK } from '../i18n/groove-zh-HK';
import { instrumentBehaviourLabelZhHK } from '../i18n/instrument-behaviour-zh-HK';
import { SCENES, MOODS, HARMONIES, TONALITIES, PRODUCTION, CONSTRAINTS } from '../data/options';
import { TRACK_DURATIONS } from '../data/track-duration';

export type PromptView = 'en' | 'zh' | 'both';

// This is a structured Chinese reading aid generated locally from exactly
// the same configuration; it is explicitly NOT a sentence-level translation
// of the provider-specific English compiler (especially legacy Flow syntax).
// English copy/paste must always use the original compiler's output.
function labels<T extends { id: string; label: string }>(ids: readonly string[], catalog: readonly T[]): string {
  return ids.map(id => catalog.find(x => x.id === id)?.label ?? id).join('、');
}
function describeLevel(value: number, low: number, high: number): string {
  return value <= low ? '低' : value >= high ? '高' : '中等';
}
function meter(config: MusicConfiguration): string {
  return config.meter === 'custom' ? config.customMeter ?? '4/4' : config.meter;
}
const ROLE_ZH: Record<MusicConfiguration['instruments'][number]['role'], string> = {
  lead: '主奏', response: '旋律回應', countermelody: '對位旋律',
  harmony: '和聲', bass: '低音基礎', rhythm: '節奏', texture: '背景質感',
};
const FEEL_ZH: Record<MusicConfiguration['tempoFeelId'], string> = {
  auto: '依 BPM 自動', 'very-slow': '非常緩慢', 'very-relaxed': '十分放鬆',
  relaxed: '放鬆', moderate: '中速感', brisk: '輕快', fast: '快速',
};
const DYNAMICS_ZH: Record<string, string> = {
  'very-stable': '非常柔和而穩定', stable: '平穩克制',
  'gentle-evolution': '緩慢自然演變', 'gradual-build': '逐步而受控地增強',
  dynamic: '較鮮明的強弱對比',
};
const STRUCTURE_ZH: Record<string, string> = {
  continuous: '適合作背景音樂的連續編曲',
  'gentle-evolution': '緩慢變化後自然回歸',
  'traditional-sections': '主題、簡短獨奏、回歸主題',
  custom: '自然銜接的編曲段落',
};
const INTERPLAY_ZH: Record<MusicConfiguration['foregroundRule'], string> = {
  single: '同一時間只有一條前景主旋律',
  gentle: '選定聲部之間柔和地呼應',
  collective: '由已選聲部共同交織演奏',
};
const COMPLEXITY_ZH: Record<MusicConfiguration['melodyComplexity'], string> = {
  minimal: '極簡', simple: '簡單', moderate: '中等', complex: '複雜', virtuosic: '炫技',
};
const PHRASE_ZH: Record<MusicConfiguration['phraseLength'], string> = {
  short: '短樂句', medium: '中等長度樂句', long: '長而流暢的樂句',
};
const SPACE_ZH: Record<MusicConfiguration['breathingSpace'], string> = {
  high: '充足留白', medium: '適量留白', low: '樂句連接緊密',
};
function customOrLabel(configValue: string | undefined, catalogId: string, catalog: readonly { id: string; label: string }[], custom: string): string {
  if (catalogId === 'custom' && configValue?.trim()) return '自訂：' + configValue.trim();
  return catalog.find(x => x.id === catalogId)?.label ?? custom;
}
export function describePromptZh(
  config: MusicConfiguration, intentZh?: string, focusIndex?: number, openingZh?: string,
): string {
  const style = STYLE_BY_ID.get(config.styleId) ?? STYLE_BY_ID.get('cozy-jazz')!;
  const secondary = config.secondaryStyleId ? STYLE_BY_ID.get(config.secondaryStyleId)?.nameZh : undefined;
  const groove = GROOVE_ZH_HK[config.grooveId]
    ?? JAZZ_STYLES.flatMap(item => item.grooves).find(item => item.id === config.grooveId)?.label
    ?? config.grooveId;
  const scene = customOrLabel(config.customSceneName, config.sceneId, SCENES, '自選場景');
  const mood = labels(config.moodIds, MOODS) || '按風格預設';
  const heading = '【風格與律動】純器樂 ' + style.nameZh
    + (secondary ? '，略帶 ' + secondary + ' 風格影響' : '')
    + '。速度 ' + config.tempo + ' BPM、' + meter(config) + ' 拍號、' + groove
    + (config.tempoFeelId === 'auto' ? '' : '、速度感 ' + FEEL_ZH[config.tempoFeelId])
    + '；情緒 ' + mood + '；場景 ' + scene + '。'
    + (focusIndex === 1 && intentZh ? ' ' + intentZh : '');
  const instrumentParts = config.instruments.filter(part => part.enabled).map(part => {
    const ins = INSTRUMENT_BY_ID.get(part.instrumentId);
    if (!ins) return '';
    const prominence = part.prominence < 35 ? '柔和靠後' : part.prominence < 65 ? '中等輕聲' : part.prominence <= 82 ? '清晰前景' : '明顯突出';
    const behaviour = instrumentBehaviourLabelZhHK(part.behaviour);
    return instrumentNameZh(part) + '（' + ROLE_ZH[part.role] + '、' + prominence + '）：' + behaviour;
  }).filter(Boolean);
  const ensemble = '【樂器與分工】'
    + (instrumentParts.length ? '只使用所選樂器：' + instrumentParts.join('；') + '。' : '沒有選定樂器；不自行加入其他樂器。');
  const tonality = [...style.tonalities, ...TONALITIES].find(x => x.id === config.tonalityId)?.label ?? config.tonalityId;
  const harmonies = labels(config.harmonyIds, HARMONIES) || '按風格使用爵士和聲';
  const musical = '【和聲與演奏】調性 ' + tonality
    + (config.key !== 'auto' ? '，調 ' + config.key : '') + '；和聲 ' + harmonies
    + '。旋律密度' + describeLevel(config.melodyDensity, 30, 76)
    + '、旋律複雜度' + COMPLEXITY_ZH[config.melodyComplexity] + '、'
    + PHRASE_ZH[config.phraseLength] + '、' + SPACE_ZH[config.breathingSpace]
    + '、即興程度' + describeLevel(config.improvisation, 25, 76)
    + '、能量' + describeLevel(config.energy, 25, 76) + '。'
    + INTERPLAY_ZH[config.foregroundRule] + '。'
    + (focusIndex !== 1 && intentZh ? ' ' + intentZh : '')
    + '強弱：' + (DYNAMICS_ZH[config.dynamics] ?? config.dynamics)
    + '；編曲：' + (STRUCTURE_ZH[config.structure] ?? config.structure) + '。';
  const production = labels(config.productionIds, PRODUCTION);
  const avoid = labels(config.constraintIds, CONSTRAINTS);
  const duration = TRACK_DURATIONS.find(x => x.id === config.trackDurationId);
  const closing = '【錄音、曲長與限制】'
    + (production ? '錄音質感：' + production + '。' : '')
    + '目標曲長約 ' + (duration ? duration.minMinutes + '–' + duration.maxMinutes : '4–5') + ' 分鐘，並自然結尾。'
    + '純音樂、沒有歌聲；不加入未選的樂器或額外敲擊樂。'
    + (avoid ? '避免：' + avoid + '。' : '');
  const intro = config.openingMode && config.openingMode !== 'original' ? '【開場變化】' + (openingZh ?? resolveOpening(config).descriptionZh) : '';
  return [heading, ensemble, musical + (intro ? '\n' + intro : ''), closing].join('\n\n');
}
