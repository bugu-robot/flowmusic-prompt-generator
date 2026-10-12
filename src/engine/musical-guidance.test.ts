import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { MOODS, PRODUCTION } from '../data/options';
import { recommendConfiguration } from './recommendation-engine';
import { STYLE_GUIDANCE_MATRIX, analyzeMusicalGuidance, applyOptimizations, guidanceLevel, suggestOptimizations } from './musical-guidance';

describe('genre-aware jazz guidance and explicit-only optimizations', () => {
  it('covers the entire 38-style catalog with valid recommendations', () => {
    expect(Object.keys(STYLE_GUIDANCE_MATRIX)).toHaveLength(JAZZ_STYLES.length);
    for (const style of JAZZ_STYLES) {
      const cfg = recommendConfiguration(style.id);
      const entries = STYLE_GUIDANCE_MATRIX[style.id]!;
      expect(entries.moodIds.length, style.id).toBeGreaterThan(0);
      for (const id of entries.moodIds) {
        expect(MOODS.some(m => m.id === id), style.id + ':' + id).toBe(true);
        expect(guidanceLevel(cfg, 'moodIds', id)).toBe('recommended');
      }
      for (const id of entries.productionIds) {
        expect(PRODUCTION.some(p => p.id === id), style.id + ':' + id).toBe(true);
      }
    }
  });
  it('labels unusual combinations without banning choices or inventing new instruments', () => {
    const cfg = recommendConfiguration('cozy-jazz');
    expect(guidanceLevel(cfg, 'moodIds', 'energetic')).toBe('exploratory');
    cfg.energy = 95;
    expect(guidanceLevel(cfg, 'moodIds', 'peaceful')).toBe('caution');
    expect(analyzeMusicalGuidance(cfg).some(x => x.id === 'high-energy-calm-mood')).toBe(true);
  });
  it('applying all independent recording removals does not resurrect previous conflicts', () => {
    const cfg = recommendConfiguration('slow-bossa');
    cfg.instruments = cfg.instruments.filter(part => part.role !== 'bass');
    cfg.instruments.push({ instrumentId: 'distorted-guitar', role: 'lead', enabled: true, prominence: 50, behaviour: '' });
    cfg.productionIds = ['warm','round-bass','acoustic','room'];
    const suggestions = suggestOptimizations(cfg);
    expect(suggestions.map(x => x.id)).toEqual(expect.arrayContaining(['remove-orphan-round-bass','clarify-recording']));
    const updated = applyOptimizations(cfg, suggestions);
    expect(updated.productionIds).toEqual(['warm','room']);
    expect(cfg.productionIds).toContain('acoustic');
    expect(cfg.productionIds).toContain('round-bass');
  });
  it('does not treat legitimate intimate/spacious or warm/vintage mixtures as contradictions', () => {
    const cfg = recommendConfiguration('cool-jazz');
    cfg.productionIds = ['intimate', 'spacious', 'warm', 'vintage'];
    expect(analyzeMusicalGuidance(cfg).filter(x => x.level === 'caution')).toHaveLength(0);
  });
  it('fixes only explicitly applied suggestions while preserving original settings', () => {
    const cfg = recommendConfiguration('slow-bossa');
    cfg.moodIds = ['peaceful', 'nostalgic', 'intimate', 'romantic', 'playful'];
    cfg.energy = 92;
    cfg.productionIds = ['round-bass', 'warm', 'acoustic'];
    cfg.instruments = cfg.instruments.filter(x => x.role !== 'bass');
    const before = JSON.stringify(cfg);
    const items = suggestOptimizations(cfg);
    expect(items.map(item => item.id)).toEqual(expect.arrayContaining(['adjust-energy', 'remove-orphan-round-bass', 'focus-moods']));
    expect(JSON.stringify(cfg)).toBe(before);
    const reduced = applyOptimizations(cfg, items.filter(item => item.id === 'adjust-energy'));
    expect(reduced.energy).toBeLessThan(92);
    expect(reduced.moodIds).toEqual(cfg.moodIds);
    expect(reduced.productionIds).toEqual(cfg.productionIds);
    const all = applyOptimizations(cfg, items);
    expect(all.moodIds).toHaveLength(3);
    expect(all.productionIds).not.toContain('round-bass');
    expect(cfg.productionIds).toContain('round-bass');
  });
});
