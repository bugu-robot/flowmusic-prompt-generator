import { JAZZ_STYLES, STYLE_BY_ID } from '../data/jazz-styles';
import type { MusicConfiguration } from '../models/types';

export type GuidanceLevel = 'recommended' | 'exploratory' | 'caution';
export type GuidanceGroup = 'moodIds' | 'productionIds';
export interface GuidanceIssue {
  id: string;
  level: 'exploratory' | 'caution';
  message: string;
}
export interface OptimizationSuggestion {
  id: string;
  label: string;
  reason: string;
  changes: Partial<Pick<MusicConfiguration, 'moodIds' | 'productionIds' | 'energy'>>;
}

// Curated style seeds already contain the recommended Feel and Recording IDs
// for each of the 37 fixed genres and Custom. This derived matrix covers the
// entire existing catalog without maintaining a second divergent source.
export const STYLE_GUIDANCE_MATRIX = Object.fromEntries(
  JAZZ_STYLES.map(style => [style.id, {
    moodIds: [...style.moods],
    productionIds: [...style.production],
  }]),
) as Record<string, { moodIds: string[]; productionIds: string[] }>;

export function guidanceLevel(config: MusicConfiguration, group: GuidanceGroup, id: string): GuidanceLevel {
  const active = config.instruments.filter(part => part.enabled);
  const electronic = active.some(part => ['synth', 'distorted-guitar'].includes(part.instrumentId));
  const upright = active.some(part => part.role === 'bass' && part.instrumentId === 'upright-bass');
  if (group === 'productionIds') {
    if (id === 'round-bass' && !upright) return 'caution';
    if (id === 'acoustic' && electronic) return 'caution';
  }
  if (group === 'moodIds' && config.energy >= 70 && ['peaceful', 'calm', 'reflective'].includes(id)) return 'caution';
  if (STYLE_GUIDANCE_MATRIX[config.styleId]?.[group].includes(id)) return 'recommended';
  return 'exploratory';
}

export function analyzeMusicalGuidance(config: MusicConfiguration): GuidanceIssue[] {
  const result: GuidanceIssue[] = [];
  const active = config.instruments.filter(part => part.enabled);
  const bassParts = active.filter(part => part.role === 'bass');
  if (config.productionIds.includes('round-bass')) {
    if (bassParts.length === 0) {
      result.push({ id: 'round-bass-without-bass', level: 'caution', message: '已選 Round Bass，但編制沒有啟用 Bass 角色；Suno 的現有描述會提及 Upright Bass。' });
    } else if (!bassParts.some(part => part.instrumentId === 'upright-bass')) {
      result.push({ id: 'round-bass-mismatch', level: 'caution', message: 'Round Bass 在 Suno Prompt 中指明 Upright Bass，但目前低音角色沒有 Upright Bass。請移除這個 Recording 選項，避免暗示未選樂器。' });
    }
  }
  if (config.productionIds.includes('acoustic') && active.some(part => ['synth', 'distorted-guitar'].includes(part.instrumentId))) {
    result.push({ id: 'acoustic-with-electronic', level: 'exploratory', message: 'Acoustic 與合成／失真樂器屬實驗性混合；若希望純原聲，可移除 Acoustic 或電子音色其中一方。' });
  }
  if (config.energy >= 70 && config.moodIds.some(id => ['peaceful', 'calm', 'reflective'].includes(id))) {
    result.push({ id: 'high-energy-calm-mood', level: 'caution', message: '高 Energy 與平靜／沉思 Feel 可能令音樂方向不一致；可考慮降低 Energy。' });
  }
  if (config.moodIds.length > 3) {
    result.push({ id: 'many-moods', level: 'exploratory', message: 'Feel 多於 3 個；Suno 可保留全部，但建議聚焦 2–3 個主要情緒，避免意圖分散。' });
  }
  return result;
}

// Suggestions are non-destructive. No selected settings change until the user
// explicitly chooses to apply one or all suggested edits.
export function suggestOptimizations(config: MusicConfiguration): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const issues = new Set(analyzeMusicalGuidance(config).map(issue => issue.id));
  if (issues.has('high-energy-calm-mood')) {
    const baseline = STYLE_BY_ID.get(config.styleId)?.energy ?? 35;
    suggestions.push({
      id: 'adjust-energy', label: '降低 Energy',
      reason: '保留所選 Feel，讓整體能量更接近平靜／沉思方向。',
      changes: { energy: Math.min(45, baseline + 10) },
    });
  }
  if (issues.has('round-bass-without-bass') || issues.has('round-bass-mismatch')) {
    suggestions.push({
      id: 'remove-orphan-round-bass', label: '移除不適用的 Round Bass',
      reason: '現有 Suno 描述會指向 Upright Bass；如未選 Upright Bass，移除此標籤以保持編制一致。',
      changes: { productionIds: config.productionIds.filter(id => id !== 'round-bass') },
    });
  }
  if (issues.has('many-moods')) {
    const preferred = STYLE_GUIDANCE_MATRIX[config.styleId]?.moodIds ?? [];
    const ordered = [...config.moodIds.filter(id => preferred.includes(id)), ...config.moodIds.filter(id => !preferred.includes(id))];
    const retained = new Set(ordered.slice(0, 3));
    suggestions.push({
      id: 'focus-moods', label: '聚焦 3 個 Feel',
      reason: '優先保留目前風格推薦且已選的 Feel；可隨時在全部選項中重新選取。',
      changes: { moodIds: config.moodIds.filter(id => retained.has(id)) },
    });
  }
  if (issues.has('acoustic-with-electronic')) {
    suggestions.push({
      id: 'clarify-recording', label: '減少錄音質感歧義',
      reason: '保留已選電子樂器，僅移除 Acoustic 錄音標籤。',
      changes: { productionIds: config.productionIds.filter(id => id !== 'acoustic') },
    });
  }
  return suggestions;
}

export function applyOptimizations(config: MusicConfiguration, suggestions: readonly OptimizationSuggestion[]): MusicConfiguration {
  return suggestions.reduce<MusicConfiguration>((current, suggestion) => ({
    ...current,
    ...suggestion.changes,
    // Combine independent removal suggestions against the CURRENT state, not
    // the original snapshot; otherwise one removal can restore another.
    moodIds: suggestion.changes.moodIds
      ? current.moodIds.filter(id => suggestion.changes.moodIds!.includes(id)) : current.moodIds,
    productionIds: suggestion.changes.productionIds
      ? current.productionIds.filter(id => suggestion.changes.productionIds!.includes(id)) : current.productionIds,
  }), { ...config, moodIds: [...config.moodIds], productionIds: [...config.productionIds], instruments: config.instruments.map(part => ({ ...part })) });
}
