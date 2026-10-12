import { describe, expect, it } from 'vitest';
import { recommendConfiguration } from './recommendation-engine';
import { flowOmittedOptions } from './flow-overflow';
describe('Flow compiler exact omitted-option notices', () => {
  it('lists precise omitted choices in array order without altering config', () => {
    const cfg = recommendConfiguration('cozy-jazz');
    cfg.moodIds = ['cozy', 'warm', 'peaceful', 'nostalgic', 'dreamy', 'playful'];
    cfg.harmonyIds = ['maj7', 'min7', 'dom7', 'add9', 'maj9', 'min9', 'altered'];
    cfg.productionIds = ['warm', 'intimate', 'clean', 'dark', 'round-bass', 'smooth-highs', 'room', 'analog', 'polished', 'vintage', 'soft-transients'];
    const snapshot = JSON.stringify(cfg);
    const summary = flowOmittedOptions(cfg);
    expect(summary.find(x => x.group === 'Feel')?.omitted).toEqual(['夢幻 Dreamy', '俏皮 Playful']);
    expect(summary.find(x => x.group === 'Harmony')?.omitted).toEqual(['Altered Dominant']);
    expect(summary.find(x => x.group === 'Recording 音色')?.omitted).toEqual(['暗色 Dark']);
    expect(summary.find(x => x.group === 'Recording 效果')?.omitted).toEqual(['柔和起音 Soft Transients']);
    expect(JSON.stringify(cfg)).toBe(snapshot);
  });
  it('keeps round-bass and smooth-highs outside caps', () => {
    const cfg = recommendConfiguration('cozy-jazz');
    cfg.productionIds = ['room', 'vintage', 'analog', 'polished', 'round-bass', 'smooth-highs'];
    expect(flowOmittedOptions(cfg)).toEqual([]);
  });
});
