import { normalizeConfiguration, type StorageLike } from './local-storage';
import type { MusicConfiguration } from '../models/types';

const FEEDBACK_KEY = 'flowmusic.promptGenerator.feedback.v1';
const SNAPSHOTS_KEY = 'flowmusic.promptGenerator.copiedPrompts.v1';
const MAX_FEEDBACK = 100;
const MAX_SNAPSHOTS = 30;
const fallback = new Map<string,string>();
const memoryStorage: StorageLike = {
  getItem: key => fallback.get(key) ?? null,
  setItem: (key, value) => { fallback.set(key,value); },
  removeItem: key => { fallback.delete(key); },
};
const browserStorage = (): StorageLike => { try { return globalThis.localStorage; } catch { return memoryStorage; } };
const isRecord = (v: unknown): v is Record<string,unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const isProvider = (v: unknown): v is PromptProvider => v === 'suno' || v === 'flow';
const isKind = (v: unknown): v is PromptKind => ['main','A','B','C'].includes(String(v));
const isValidDate = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const newId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID() : 'prompt-' + Date.now() + '-' + Math.random().toString(36).slice(2,10);
function storedArray(key: string, storage: StorageLike): unknown[] {
  try { const raw:unknown=JSON.parse(storage.getItem(key) ?? '[]'); return Array.isArray(raw) ? raw.slice(-1000) : []; }
  catch { return []; }
}

export type PromptProvider = 'flow' | 'suno';
export type PromptKind = 'main' | 'A' | 'B' | 'C';
export interface PromptSnapshot {
  id: string;
  copiedAt: string;
  provider: PromptProvider;
  kind: PromptKind;
  promptText: string;
  configuration: MusicConfiguration;
  smartStrength?: 'conservative' | 'balanced' | 'creative';
  smartSeed?: number;
}
export type NewPromptSnapshot = Pick<PromptSnapshot,'provider'|'kind'|'promptText'|'configuration'> &
  Pick<PromptSnapshot,'smartStrength'|'smartSeed'>;
function parseSnapshot(value: unknown): PromptSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  const config = normalizeConfiguration(value.configuration);
  if (!config || typeof value.id !== 'string' || !value.id || !isValidDate(value.copiedAt)
    || !isProvider(value.provider) || !isKind(value.kind)
    || typeof value.promptText !== 'string' || !value.promptText.trim() || value.promptText.length > 12000) return undefined;
  return {
    id: value.id.slice(0,100), copiedAt: value.copiedAt as string, provider: value.provider,
    kind: value.kind, promptText: value.promptText, configuration: config,
    ...(value.smartStrength === 'conservative' || value.smartStrength === 'balanced' || value.smartStrength === 'creative'
      ? {smartStrength: value.smartStrength} : {}),
    ...(typeof value.smartSeed === 'number' && Number.isSafeInteger(value.smartSeed) && value.smartSeed >= 0
      ? {smartSeed: value.smartSeed} : {}),
  };
}
export function listPromptSnapshots(storage: StorageLike = browserStorage()): PromptSnapshot[] {
  return storedArray(SNAPSHOTS_KEY,storage).slice(-MAX_SNAPSHOTS).flatMap(value => {
    const entry=parseSnapshot(value);
    return entry ? [entry] : [];
  });
}
export function savePromptSnapshot(input: NewPromptSnapshot, storage: StorageLike = browserStorage()): PromptSnapshot {
  const config=normalizeConfiguration(input.configuration);
  if (!config || !isProvider(input.provider) || !isKind(input.kind)
    || !input.promptText.trim() || input.promptText.length > 12000) throw new Error('Invalid copied prompt');
  const entry=parseSnapshot({
    ...input, id:newId(), copiedAt:new Date().toISOString(), configuration:config,
  });
  if (!entry) throw new Error('Invalid copied prompt snapshot');
  storage.setItem(SNAPSHOTS_KEY,JSON.stringify([...listPromptSnapshots(storage),entry].slice(-MAX_SNAPSHOTS)));
  return entry;
}
export function clearPromptSnapshots(storage: StorageLike = browserStorage()): void { storage.removeItem(SNAPSHOTS_KEY); }

export const RATING_LABELS = [
  ['style','風格準確度'], ['instruments','樂器符合程度'], ['mood','Feel／Mood'],
  ['recording','錄音質感'], ['overall','整體滿意度'],
] as const;
export type RatingDimension = typeof RATING_LABELS[number][0];
export type FeedbackRatings = Record<RatingDimension,number>;
export interface TrackFeedback {
  id: string;
  createdAt: string;
  provider: PromptProvider;
  ratings: FeedbackRatings;
  note: string;
  configuration: MusicConfiguration;
  /** Historical entries made before snapshot capture are explicitly unlinked. */
  snapshot: PromptSnapshot | null;
}
export interface NewTrackFeedback { promptSnapshotId: string; ratings: FeedbackRatings; note: string; }
function validRatings(value: unknown): FeedbackRatings | undefined {
  if (!isRecord(value)) return undefined;
  const result={} as FeedbackRatings;
  for(const [key] of RATING_LABELS) {
    if(typeof value[key]!=='number' || !Number.isInteger(value[key]) || (value[key] as number)<1 || (value[key] as number)>5) return undefined;
    result[key]=value[key] as number;
  }
  return result;
}
export function listTrackFeedback(storage: StorageLike = browserStorage()): TrackFeedback[] {
  return storedArray(FEEDBACK_KEY,storage).slice(-MAX_FEEDBACK).flatMap(entry => {
    if(!isRecord(entry)) return [];
    const ratings=validRatings(entry.ratings),config=normalizeConfiguration(entry.configuration);
    if(!ratings || !config || typeof entry.id!=='string' || !isValidDate(entry.createdAt) || !isProvider(entry.provider)) return [];
    const snapshot=parseSnapshot(entry.snapshot);
    // Preserve v1 ratings, but do not misrepresent their provenance.
    return [{ id:entry.id.slice(0,100),createdAt:entry.createdAt as string,provider:entry.provider,
      ratings,note:typeof entry.note==='string'?entry.note.slice(0,300):'',configuration:config,snapshot:snapshot??null }];
  });
}
export function saveTrackFeedback(input: NewTrackFeedback, storage: StorageLike = browserStorage()): TrackFeedback {
  const ratings=validRatings(input.ratings);
  const snapshot=listPromptSnapshots(storage).find(item=>item.id===input.promptSnapshotId);
  if(!ratings || !snapshot) throw new Error('Select a copied prompt before rating');
  const entry:TrackFeedback={ id:newId(),createdAt:new Date().toISOString(),provider:snapshot.provider,
    ratings,note:String(input.note??'').slice(0,300),configuration:snapshot.configuration,snapshot };
  storage.setItem(FEEDBACK_KEY,JSON.stringify([...listTrackFeedback(storage),entry].slice(-MAX_FEEDBACK)));
  return entry;
}
export function removeTrackFeedback(id:string,storage:StorageLike=browserStorage()):void {
  storage.setItem(FEEDBACK_KEY,JSON.stringify(listTrackFeedback(storage).filter(entry=>entry.id!==id)));
}
export function clearTrackFeedback(storage:StorageLike=browserStorage()):void {storage.removeItem(FEEDBACK_KEY);}
export function feedbackSummary(styleId:string,provider:PromptProvider,storage:StorageLike=browserStorage()):
  {count:number;average:number|null; linkedCount:number} {
  const records=listTrackFeedback(storage).filter(x=>x.configuration.styleId===styleId && x.provider===provider);
  return {count:records.length,linkedCount:records.filter(x=>x.snapshot!==null).length,
    average:records.length?Math.round(records.reduce((sum,r)=>sum+r.ratings.overall,0)/records.length*10)/10:null};
}
