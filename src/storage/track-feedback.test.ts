import { describe, expect, it } from 'vitest';
import { recommendConfiguration } from '../engine/recommendation-engine';
import type { StorageLike } from './local-storage';
import { clearPromptSnapshots,clearTrackFeedback,feedbackSummary,listPromptSnapshots,listTrackFeedback,
  removeTrackFeedback,savePromptSnapshot,saveTrackFeedback } from './track-feedback';
class FakeStore implements StorageLike {
  data=new Map<string,string>();
  getItem(k:string){return this.data.get(k)??null;}
  setItem(k:string,v:string){this.data.set(k,v);}
  removeItem(k:string){this.data.delete(k);}
}
const ratings={style:5,instruments:4,mood:3,recording:4,overall:5};
const copy=(store:FakeStore,kind:'main'|'A'|'B'|'C'='main')=>
  savePromptSnapshot({provider:'suno',kind,promptText:'Original English prompt '+kind,configuration:recommendConfiguration('cozy-jazz'),smartStrength:kind==='main'?undefined:'creative',smartSeed:kind==='main'?undefined:4},store);
describe('copied prompt provenance and feedback',()=>{
  it('binds an exact prompt, configuration, provider and Smart B metadata, never live settings',()=>{
    const store=new FakeStore(),snapshot=copy(store,'B');
    const current=recommendConfiguration('jazz-fusion');current.moodIds=['energetic'];
    const entry=saveTrackFeedback({promptSnapshotId:snapshot.id,ratings,note:'Great guitar'},store);
    expect(entry.snapshot?.promptText).toBe('Original English prompt B');
    expect(entry.snapshot?.kind).toBe('B');
    expect(entry.snapshot?.smartSeed).toBe(4);
    expect(entry.configuration.styleId).toBe('cozy-jazz');
    expect(entry.configuration).not.toEqual(current);
    expect(entry.provider).toBe('suno');
    expect(feedbackSummary('cozy-jazz','suno',store)).toEqual({count:1,average:5,linkedCount:1});
    expect(feedbackSummary('cozy-jazz','flow',store).count).toBe(0);
    removeTrackFeedback(entry.id,store);
    expect(listTrackFeedback(store)).toEqual([]);
  });
  it('rejects unlinked, malformed and out-of-range feedback',()=>{
    const store=new FakeStore();
    expect(()=>saveTrackFeedback({promptSnapshotId:'missing',ratings,note:''},store)).toThrow();
    const item=copy(store);
    expect(()=>saveTrackFeedback({promptSnapshotId:item.id,ratings:{...ratings,overall:7},note:''},store)).toThrow();
    expect(()=>savePromptSnapshot({provider:'flow',kind:'main',configuration:item.configuration,promptText:''},store)).toThrow();
    store.setItem('flowmusic.promptGenerator.feedback.v1','bad JSON');
    expect(listTrackFeedback(store)).toEqual([]);
  });
  it('preserves historical unlinked ratings clearly without inventing a prompt snapshot',()=>{
    const store=new FakeStore(),config=recommendConfiguration('cozy-jazz');
    store.setItem('flowmusic.promptGenerator.feedback.v1',JSON.stringify([{id:'old',createdAt:new Date().toISOString(),
      provider:'suno',configuration:config,note:'historical',ratings}]));
    expect(listTrackFeedback(store)[0]?.snapshot).toBeNull();
    expect(feedbackSummary('cozy-jazz','suno',store).linkedCount).toBe(0);
    const cap=copy(store);
    expect(saveTrackFeedback({promptSnapshotId:cap.id,ratings,note:''},store).snapshot).not.toBeNull();
    expect(listTrackFeedback(store)).toHaveLength(2);
  });
  it('caps snapshots at 30 and ratings at 100; independent clear operations preserve presets',()=>{
    const store=new FakeStore();
    const snap=copy(store);
    for(let i=0;i<104;i++)saveTrackFeedback({promptSnapshotId:snap.id,ratings,note:'ok'},store);
    expect(listTrackFeedback(store)).toHaveLength(100);
    for(let i=0;i<32;i++)copy(store);
    expect(listPromptSnapshots(store)).toHaveLength(30);
    clearPromptSnapshots(store);
    expect(listPromptSnapshots(store)).toHaveLength(0);
    expect(listTrackFeedback(store)[0]?.snapshot?.promptText).toBe('Original English prompt main');
    clearTrackFeedback(store);
    expect(listTrackFeedback(store)).toHaveLength(0);
    expect(store.data.has('flowmusic.promptGenerator.presets.v1')).toBe(false);
  });
});
