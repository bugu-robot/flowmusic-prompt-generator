import { describe, expect, it } from 'vitest';
import { recommendConfiguration } from '../engine/recommendation-engine';
import type { StorageLike } from './local-storage';
import { clearTrackFeedback, feedbackSummary, listTrackFeedback, removeTrackFeedback, saveTrackFeedback } from './track-feedback';

class FakeStore implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
const ratings = {style: 5, instruments: 4, mood: 3, recording: 4, overall: 5};
describe('device-only actual-generation ratings', () => {
  it('saves bounded snapshots and summarizes by provider/style without changing Presets', () => {
    const store = new FakeStore(), config = recommendConfiguration('cozy-jazz');
    const item = saveTrackFeedback({provider:'suno',configuration:config,ratings,note:'Nice guitar'},store);
    expect(listTrackFeedback(store)[0]?.id).toBe(item.id);
    expect(feedbackSummary('cozy-jazz','suno',store)).toEqual({count:1,average:5});
    expect(feedbackSummary('cozy-jazz','flow',store).count).toBe(0);
    expect(store.data.has('flowmusic.promptGenerator.presets.v1')).toBe(false);
    removeTrackFeedback(item.id,store);
    expect(listTrackFeedback(store)).toEqual([]);
  });
  it('rejects invalid scores and sanitizes malformed stored entries', () => {
    const store = new FakeStore(), config = recommendConfiguration('cozy-jazz');
    expect(() => saveTrackFeedback({provider:'suno', configuration:config,ratings:{...ratings,overall:7},note:''},store)).toThrow();
    store.setItem('flowmusic.promptGenerator.feedback.v1','not-json');
    expect(listTrackFeedback(store)).toEqual([]);
  });
  it('caps history at 100 records', () => {
    const store = new FakeStore(), config = recommendConfiguration('cool-jazz');
    for (let i=0;i<104;i++) saveTrackFeedback({provider:'flow',configuration:config,ratings,note:'test'},store);
    expect(listTrackFeedback(store)).toHaveLength(100);
    clearTrackFeedback(store);
    expect(listTrackFeedback(store)).toHaveLength(0);
    expect(store.data.has('flowmusic.promptGenerator.presets.v1')).toBe(false);
  });
});
