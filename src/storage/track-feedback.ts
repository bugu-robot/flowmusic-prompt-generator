import { normalizeConfiguration, type StorageLike } from './local-storage';
import type { MusicConfiguration } from '../models/types';

const KEY = 'flowmusic.promptGenerator.feedback.v1';
const MAX_RECORDS = 100;
const memory = new Map<string, string>();
const volatileStorage: StorageLike = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, value); },
  removeItem: key => { memory.delete(key); },
};
const browserStorage = (): StorageLike => {
  try { return globalThis.localStorage; } catch { return volatileStorage; }
};
const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export const RATING_LABELS = [
  ['style', '風格準確度'],
  ['instruments', '樂器符合程度'],
  ['mood', 'Feel／Mood'],
  ['recording', '錄音質感'],
  ['overall', '整體滿意度'],
] as const;
export type RatingDimension = typeof RATING_LABELS[number][0];
export type FeedbackRatings = Record<RatingDimension, number>;
export type FeedbackProvider = 'flow' | 'suno';
export interface TrackFeedback {
  id: string;
  createdAt: string;
  provider: FeedbackProvider;
  ratings: FeedbackRatings;
  note: string;
  configuration: MusicConfiguration;
}
export type NewTrackFeedback = Pick<TrackFeedback, 'provider' | 'ratings' | 'note' | 'configuration'>;

function validatedRatings(value: unknown): FeedbackRatings | undefined {
  if (!isRecord(value)) return undefined;
  const ratings = {} as FeedbackRatings;
  for (const [key] of RATING_LABELS) {
    const score = value[key];
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) return undefined;
    ratings[key] = score;
  }
  return ratings;
}
export function listTrackFeedback(storage: StorageLike = browserStorage()): TrackFeedback[] {
  try {
    const raw: unknown = JSON.parse(storage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.slice(-MAX_RECORDS).flatMap((entry): TrackFeedback[] => {
      if (!isRecord(entry)) return [];
      const ratings = validatedRatings(entry.ratings);
      const configuration = normalizeConfiguration(entry.configuration);
      if (!ratings || !configuration || typeof entry.id !== 'string' || !Number.isFinite(Date.parse(String(entry.createdAt)))
        || (entry.provider !== 'flow' && entry.provider !== 'suno')) return [];
      return [{
        id: entry.id.slice(0, 100), createdAt: String(entry.createdAt), provider: entry.provider,
        note: typeof entry.note === 'string' ? entry.note.slice(0, 300) : '',
        ratings, configuration,
      }];
    });
  } catch { return []; }
}
export function saveTrackFeedback(input: NewTrackFeedback, storage: StorageLike = browserStorage()): TrackFeedback {
  const ratings = validatedRatings(input.ratings);
  const configuration = normalizeConfiguration(input.configuration);
  if (!ratings || !configuration || !['flow', 'suno'].includes(input.provider)) throw new Error('Invalid feedback');
  const entry: TrackFeedback = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'feedback-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    provider: input.provider,
    ratings,
    note: String(input.note ?? '').slice(0, 300),
    configuration,
  };
  storage.setItem(KEY, JSON.stringify([...listTrackFeedback(storage), entry].slice(-MAX_RECORDS)));
  return entry;
}
export function removeTrackFeedback(id: string, storage: StorageLike = browserStorage()): void {
  storage.setItem(KEY, JSON.stringify(listTrackFeedback(storage).filter(entry => entry.id !== id)));
}
export function clearTrackFeedback(storage: StorageLike = browserStorage()): void {
  storage.removeItem(KEY);
}
export function feedbackSummary(styleId: string, provider: FeedbackProvider, storage: StorageLike = browserStorage()): {count: number; average: number | null} {
  const ratings = listTrackFeedback(storage).filter(x => x.configuration.styleId === styleId && x.provider === provider);
  return {
    count: ratings.length,
    average: ratings.length ? Math.round(ratings.reduce((sum, entry) => sum + entry.ratings.overall, 0) / ratings.length * 10) / 10 : null,
  };
}
