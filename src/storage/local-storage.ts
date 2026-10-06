import { JAZZ_STYLES, STYLE_BY_ID } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, SCENES, TONALITIES } from '../data/options';
import type { InstrumentPart, MusicConfiguration, UserPreset } from '../models/types';

const PRESETS_KEY = 'flowmusic.promptGenerator.presets.v1';
const CONFIG_KEY = 'flowmusic.promptGenerator.configuration.v1';
const harmonyIds = new Set(HARMONIES.map((option) => option.id));
const moodIds = new Set(MOODS.map((option) => option.id));
const productionIds = new Set(PRODUCTION.map((option) => option.id));
const constraintIds = new Set(CONSTRAINTS.map((option) => option.id));
const sceneIds = new Set(SCENES.map((option) => option.id));
const grooveIds = new Set(JAZZ_STYLES.flatMap((style) => style.grooves.map((option) => option.id)));
const tonalityIds = new Set([...TONALITIES.map((option) => option.id), ...JAZZ_STYLES.flatMap((style) => style.tonalities.map((option) => option.id))]);
const volatileValues = new Map<string, string>();
const volatileStorage: StorageLike = {
  getItem: (key) => volatileValues.get(key) ?? null,
  setItem: (key, value) => { volatileValues.set(key, value); },
  removeItem: (key) => { volatileValues.delete(key); },
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike {
  try {
    return globalThis.localStorage;
  } catch {
    return volatileStorage;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidMeter(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{1,2}\/\d{1,2}$/.test(value)) return false;
  const slash = value.indexOf('/');
  return Number(value.slice(0, slash)) > 0 && Number(value.slice(slash + 1)) > 0;
}

function normalizePart(value: unknown): InstrumentPart | undefined {
  if (!isRecord(value) || typeof value.instrumentId !== 'string' || !INSTRUMENT_BY_ID.has(value.instrumentId)) return undefined;
  const instrument = INSTRUMENT_BY_ID.get(value.instrumentId)!;
  const role = typeof value.role === 'string' && instrument.roles.includes(value.role as InstrumentPart['role'])
    ? value.role as InstrumentPart['role']
    : instrument.roles[0] ?? 'texture';
  const behaviour = typeof value.behaviour === 'string' && instrument.behaviours.includes(value.behaviour) ? value.behaviour : instrument.behaviours[0] ?? '';
  return {
    instrumentId: value.instrumentId,
    enabled: value.enabled !== false,
    role,
    prominence: typeof value.prominence === 'number' && Number.isFinite(value.prominence)
      ? Math.max(0, Math.min(100, value.prominence))
      : 50,
    behaviour,
  };
}

export function normalizeConfiguration(value: unknown): MusicConfiguration | undefined {
  if (!isRecord(value) || typeof value.styleId !== 'string' || !STYLE_BY_ID.has(value.styleId)) return undefined;
  const numeric = (key: string, fallback: number) => typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] as number : fallback;
  const stringValue = (key: string, fallback: string) => typeof value[key] === 'string' ? (value[key] as string).slice(0, 160) : fallback;
  const stringArray = (key: string) => Array.isArray(value[key]) ? (value[key] as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 40) : [];
  const optionIds = (key: string, validIds: Set<string>) => [...new Set(stringArray(key).filter((id) => validIds.has(id)))];
  const enumOption = <T extends string>(key: string, options: readonly T[], fallback: T): T =>
    typeof value[key] === 'string' && options.includes(value[key] as T) ? value[key] as T : fallback;
  const partList = Array.isArray(value.instruments) ? value.instruments.map(normalizePart).filter((part): part is InstrumentPart => Boolean(part)).slice(0, 30) : [];
  const foregroundValues = ['single', 'gentle', 'collective'] as const;
  const phraseValues = ['short', 'medium', 'long'] as const;
  const spaceValues = ['high', 'medium', 'low'] as const;
  const complexityValues = ['minimal', 'simple', 'moderate', 'complex', 'virtuosic'] as const;
  const rawMeter = stringValue('meter', '4/4').slice(0, 16);
  const meter = rawMeter === 'custom' || isValidMeter(rawMeter) ? rawMeter : '4/4';
  const validKeys = ['auto', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return {
    styleId: value.styleId,
    tempo: Math.max(20, Math.min(400, Math.round(numeric('tempo', 80)))),
    tempoFeelId: enumOption<MusicConfiguration['tempoFeelId']>('tempoFeelId', ['auto', 'very-slow', 'very-relaxed', 'relaxed', 'moderate', 'brisk', 'fast'], 'auto'),
    meter,
    customMeter: isValidMeter(value.customMeter) ? value.customMeter : '4/4',
    grooveId: grooveIds.has(stringValue('grooveId', 'open')) ? stringValue('grooveId', 'open') : 'open',
    tonalityId: tonalityIds.has(stringValue('tonalityId', 'warm-major')) ? stringValue('tonalityId', 'warm-major') : 'warm-major',
    key: validKeys.includes(stringValue('key', 'auto')) ? stringValue('key', 'auto') : 'auto',
    harmonyIds: optionIds('harmonyIds', harmonyIds),
    sceneId: sceneIds.has(stringValue('sceneId', 'quiet-cafe')) ? stringValue('sceneId', 'quiet-cafe') : 'quiet-cafe',
    moodIds: optionIds('moodIds', moodIds),
    instruments: partList,
    energy: Math.max(0, Math.min(100, numeric('energy', 30))),
    melodyDensity: Math.max(0, Math.min(100, numeric('melodyDensity', 30))),
    improvisation: Math.max(0, Math.min(100, numeric('improvisation', 30))),
    foregroundRule: enumOption('foregroundRule', foregroundValues, 'single'),
    phraseLength: enumOption('phraseLength', phraseValues, 'medium'),
    breathingSpace: enumOption('breathingSpace', spaceValues, 'medium'),
    melodyComplexity: enumOption('melodyComplexity', complexityValues, 'moderate'),
    dynamics: enumOption('dynamics', ['very-stable', 'stable', 'gentle-evolution', 'gradual-build', 'dynamic'], 'stable'),
    structure: enumOption('structure', ['continuous', 'gentle-evolution', 'traditional-sections', 'custom'], 'continuous'),
    productionIds: optionIds('productionIds', productionIds),
    constraintIds: optionIds('constraintIds', constraintIds),
    ...(typeof value.customStyleName === 'string' ? { customStyleName: value.customStyleName.slice(0, 100) } : {}),
    ...(typeof value.customSceneName === 'string' ? { customSceneName: value.customSceneName.slice(0, 100) } : {}),
    ...(typeof value.secondaryStyleId === 'string' && STYLE_BY_ID.has(value.secondaryStyleId) ? { secondaryStyleId: value.secondaryStyleId } : {}),
  };
}

function getJson<T>(storage: StorageLike, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function listPresets(storage: StorageLike = browserStorage()): UserPreset[] {
  const raw = getJson<unknown>(storage, PRESETS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): UserPreset[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.updatedAt !== 'string') return [];
    const configuration = normalizeConfiguration(item.configuration);
    return configuration ? [{ id: item.id, name: item.name, updatedAt: item.updatedAt, configuration }] : [];
  });
}

export function savePreset(name: string, configuration: MusicConfiguration, storage: StorageLike = browserStorage(), id?: string): UserPreset {
  const safeName = name.trim().slice(0, 80);
  if (!safeName) throw new Error('presetNameRequired');
  const presets = listPresets(storage);
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'preset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const preset: UserPreset = { id: id ?? uuid, name: safeName, updatedAt: new Date().toISOString(), configuration };
  const next = id ? presets.map((item) => item.id === id ? preset : item) : [...presets, preset];
  if (id && !presets.some((item) => item.id === id)) next.push(preset);
  storage.setItem(PRESETS_KEY, JSON.stringify(next));
  return preset;
}

export function deletePreset(id: string, storage: StorageLike = browserStorage()): void {
  storage.setItem(PRESETS_KEY, JSON.stringify(listPresets(storage).filter((item) => item.id !== id)));
}

export function saveCurrentConfiguration(configuration: MusicConfiguration, storage: StorageLike = browserStorage()): void {
  storage.setItem(CONFIG_KEY, JSON.stringify(configuration));
}

export function loadCurrentConfiguration(storage: StorageLike = browserStorage()): MusicConfiguration | undefined {
  return normalizeConfiguration(getJson<unknown>(storage, CONFIG_KEY, undefined));
}

export function exportPresetJson(preset: UserPreset): string {
  return JSON.stringify({ format: 'flowmusic-prompt-generator', version: 1, preset }, null, 2);
}

export function parsePresetJson(json: string): UserPreset | undefined {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed) || parsed.format !== 'flowmusic-prompt-generator' || parsed.version !== 1 || !isRecord(parsed.preset)) return undefined;
    const configuration = normalizeConfiguration(parsed.preset.configuration);
    if (!configuration) return undefined;
    const name = typeof parsed.preset.name === 'string' ? parsed.preset.name.trim().slice(0, 80) : '';
    if (!name) return undefined;
    return {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'preset-' + Date.now(),
      name,
      updatedAt: new Date().toISOString(),
      configuration,
    };
  } catch {
    return undefined;
  }
}

export function importPresetJson(json: string, storage: StorageLike = browserStorage()): UserPreset | undefined {
  const preset = parsePresetJson(json);
  if (!preset) return undefined;
  const presets = listPresets(storage);
  storage.setItem(PRESETS_KEY, JSON.stringify([...presets, preset]));
  return preset;
}
