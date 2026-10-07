import { HARMONY_BY_ID, PRODUCTION, OPTION_BY_ID } from '../data/options';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { getStyle } from './recommendation-engine';
import type { CompatibilityMessage, CompatibilityResult, InstrumentRole, MusicConfiguration } from '../models/types';

const ROLE_TO_IDS: Record<InstrumentRole, (styleId: string) => string[]> = {
  lead: (id) => getStyle(id).lead,
  response: (id) => getStyle(id).response,
  harmony: (id) => getStyle(id).harmonyInstruments,
  bass: (id) => getStyle(id).bass,
  rhythm: (id) => getStyle(id).rhythm,
  texture: (id) => [...getStyle(id).response, ...getStyle(id).harmonyInstruments],
  countermelody: (id) => [...getStyle(id).response, ...getStyle(id).lead],
};

export function checkCompatibility(configuration: MusicConfiguration): CompatibilityResult {
  const style = getStyle(configuration.styleId);
  const messages: CompatibilityMessage[] = [];
  const factors: CompatibilityResult['factors'] = [];
  const clampScore = (score: number, max: number) => Math.max(0, Math.min(max, Math.round(score)));

  const tempoDistance = configuration.tempo < style.tempo.min
    ? style.tempo.min - configuration.tempo
    : configuration.tempo > style.tempo.max ? configuration.tempo - style.tempo.max : 0;
  const tempoScore = tempoDistance === 0 ? 18 : Math.max(0, 18 - Math.ceil(tempoDistance / 4));
  factors.push({ label: '速度', score: tempoScore, max: 18, reason: tempoDistance ? '超出建議速度範圍' : '處於建議速度範圍' });
  if (tempoDistance) {
    messages.push({
      category: 'unusual',
      message: '速度 ' + configuration.tempo + ' BPM 超出 ' + style.name + ' 建議範圍（' + style.tempo.min + '–' + style.tempo.max + ' BPM）。',
      suggestions: ['可調整至 ' + style.tempo.default + ' BPM 附近'],
    });
  }

  const selectedMeter = configuration.meter === 'custom' ? configuration.customMeter ?? '4/4' : configuration.meter;
  const meterOK = style.meters.includes(selectedMeter);
  factors.push({ label: '拍號', score: meterOK ? 8 : 3, max: 8, reason: meterOK ? '符合風格建議' : '不在常見拍號內' });
  if (!meterOK) messages.push({ category: 'unusual', message: selectedMeter + ' 拍號較少用於 ' + style.name + '。' });

  const grooveOK = style.grooves.some((groove) => groove.id === configuration.grooveId);
  factors.push({ label: '律動', score: grooveOK ? 14 : 5, max: 14, reason: grooveOK ? '使用風格建議律動' : '使用風格以外的律動' });
  if (!grooveOK) messages.push({ category: 'unusual', message: '目前律動較少見於 ' + style.name + '。' });

  let instrumentScore = 26;
  const enabled = configuration.instruments.filter((part) => part.enabled);
  if (enabled.length === 0) instrumentScore -= 15;
  const seenLead = enabled.filter((part) => part.role === 'lead');
  if (seenLead.length > 1 && !style.allowsMultipleLeadRoles) {
    instrumentScore -= Math.min(9, (seenLead.length - 1) * 4);
    const message = style.id === 'big-band'
      ? 'Big Band Jazz 通常只安排一位特色獨奏者；prompt 會按 prominence 選出主要旋律聲部。'
      : '目前有多個樂器設為主奏；prompt 會按 prominence 選出一個主要旋律聲部。';
    messages.push({ category: 'unusual', message });
  }
  const alternatives: string[] = [];
  for (const part of enabled) {
    const instrument = INSTRUMENT_BY_ID.get(part.instrumentId);
    if (!instrument) {
      instrumentScore -= 4;
      messages.push({ category: 'unusual', message: '找不到樂器資料（' + part.instrumentId + '），編譯時會略過。' });
      continue;
    }
    const roleRecommendations = ROLE_TO_IDS[part.role](style.id);
    const roleMatch = roleRecommendations.includes(part.instrumentId);
    if (!roleMatch) instrumentScore -= 3;
    if (style.unusualInstruments.includes(part.instrumentId) || instrument.avoidFamilies?.includes(style.family)) {
      const conflict = instrument.avoidFamilies?.includes(style.family) ?? false;
      instrumentScore -= conflict ? 8 : 5;
      messages.push({
        category: conflict ? 'conflict' : 'unusual',
        message: instrument.name + (conflict ? ' 可能令整體聲音偏離 ' : ' 不屬於典型 ') + style.name + (conflict ? ' 的風格重心。' : ' 編制。'),
      });
    }
  }
  if (enabled.length < 2) instrumentScore -= 3;
  if (enabled.every((part) => part.role !== 'bass')) messages.push({ category: 'unusual', message: '目前沒有低音基礎；可加入低音樂器增加支撐。' });
  for (const id of [...style.lead.slice(0, 2), ...style.bass.slice(0, 1), ...style.rhythm.slice(0, 1)]) {
    if (alternatives.length >= 4) break;
    if (!enabled.some((part) => part.instrumentId === id)) {
      const candidate = INSTRUMENT_BY_ID.get(id);
      if (candidate) alternatives.push(candidate.nameZh + '（' + candidate.name + '）');
    }
  }
  if (messages.some((message) => message.category === 'unusual' || message.category === 'conflict')) {
    for (const id of style.lead.slice(0, 2)) {
      if (alternatives.length >= 4) break;
      const candidate = INSTRUMENT_BY_ID.get(id);
      if (candidate && !alternatives.includes(candidate.nameZh + '（' + candidate.name + '）')) alternatives.push(candidate.nameZh + '（' + candidate.name + '）');
    }
    const firstWarning = messages.find((message) => message.category === 'unusual' || message.category === 'conflict');
    if (firstWarning && alternatives.length) firstWarning.suggestions = alternatives;
  }
  factors.push({ label: '樂器與角色', score: clampScore(instrumentScore, 26), max: 26, reason: '比較各角色與風格建議樂器' });

  const validHarmonies = configuration.harmonyIds.filter((id) => HARMONY_BY_ID.has(id));
  const unusualHarmony = validHarmonies.filter((id) => !style.harmony.includes(id));
  const harmonyScore = clampScore(10 - Math.min(10, unusualHarmony.length * 2), 10);
  factors.push({ label: '和聲', score: harmonyScore, max: 10, reason: unusualHarmony.length ? '部分和聲較少見' : '和聲語彙符合建議' });
  if (unusualHarmony.length) messages.push({ category: 'unusual', message: '部分和弦色彩較少見於 ' + style.name + '。' });

  const densityDelta = Math.abs(configuration.melodyDensity - style.melodyDensity);
  const densityScore = clampScore(8 - Math.floor(densityDelta / 14), 8);
  factors.push({ label: '旋律密度', score: densityScore, max: 8, reason: densityDelta > 25 ? '和風格建議密度有明顯差異' : '接近風格建議密度' });
  if (densityDelta > 35) messages.push({ category: 'unusual', message: '旋律密度與 ' + style.name + ' 的常見取向相差較大。' });

  const improvDelta = Math.abs(configuration.improvisation - style.improvisation);
  const improvScore = clampScore(8 - Math.floor(improvDelta / 16), 8);
  factors.push({ label: '即興程度', score: improvScore, max: 8, reason: improvDelta > 28 ? '和風格建議即興程度有差異' : '接近風格建議即興程度' });

  const prodMap = OPTION_BY_ID(PRODUCTION);
  const productionCount = configuration.productionIds.filter((id) => prodMap.has(id)).length;
  const productionScore = productionCount > 0 ? 8 : 4;
  factors.push({ label: '製作風格', score: productionScore, max: 8, reason: productionCount ? '已指定錄音質感' : '尚未指定錄音質感' });

  const total = factors.reduce((sum, factor) => sum + factor.score, 0);
  const score = clampScore(total, 100);
  const label: CompatibilityResult['label'] = score >= 86 ? 'excellent' : score >= 70 ? 'good' : score >= 52 ? 'unusual' : 'conflict';
  return { score, label, messages, factors };
}
