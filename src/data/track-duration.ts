// Stable, catalogued target ranges keep imported presets and prompt text deterministic.
export const TRACK_DURATIONS = [
  { id: '1-2', minMinutes: 1, maxMinutes: 2 },
  { id: '2-3', minMinutes: 2, maxMinutes: 3 },
  { id: '3-4', minMinutes: 3, maxMinutes: 4 },
  { id: '4-5', minMinutes: 4, maxMinutes: 5 },
  { id: '5-6', minMinutes: 5, maxMinutes: 6 },
  { id: '6-8', minMinutes: 6, maxMinutes: 8 },
  { id: '8-10', minMinutes: 8, maxMinutes: 10 },
  { id: '10-12', minMinutes: 10, maxMinutes: 12 },
] as const;

export type TrackDurationId = (typeof TRACK_DURATIONS)[number]['id'];
export const DEFAULT_TRACK_DURATION: TrackDurationId = '4-5';

export function normalizeTrackDurationId(value: unknown): TrackDurationId {
  return TRACK_DURATIONS.find((option) => option.id === value)?.id ?? DEFAULT_TRACK_DURATION;
}

export function trackDurationPrompt(value: unknown): string {
  const id = normalizeTrackDurationId(value);
  const option = TRACK_DURATIONS.find((candidate) => candidate.id === id)!;
  return `Target a total track duration of approximately ${option.minMinutes} to ${option.maxMinutes} minutes. Shape the arrangement to reach a natural ending within that range.`;
}
