export type InstrumentRole =
  | 'lead'
  | 'response'
  | 'harmony'
  | 'bass'
  | 'rhythm'
  | 'texture'
  | 'countermelody';

export type InstrumentCategory =
  | 'guitar'
  | 'keyboard'
  | 'brass'
  | 'woodwind'
  | 'strings'
  | 'bass'
  | 'percussion'
  | 'electronic'
  | 'texture';

export type Classification = 'historical-style' | 'historical-derived-style' | 'modern-descriptor' | 'custom';

export interface Instrument {
  id: string;
  name: string;
  nameZh: string;
  category: InstrumentCategory;
  roles: InstrumentRole[];
  families: string[];
  avoidFamilies?: string[];
  wording: string;
  behaviours: string[];
}

export interface InstrumentPart {
  instrumentId: string;
  enabled: boolean;
  role: InstrumentRole;
  prominence: number;
  behaviour: string;
}

export interface VariationRecipe {
  label: string;
  lead: string;
  response?: string;
  harmony?: string;
  bass: string;
  rhythm?: string;
  ensemble?: Array<Pick<InstrumentPart, 'instrumentId' | 'role' | 'prominence' | 'behaviour'>>;
}

export interface JazzStyle {
  id: string;
  name: string;
  nameZh: string;
  classification: Classification;
  family: string;
  descriptionZh: string;
  promptStyle?: string;
  tempo: { min: number; max: number; default: number };
  meters: string[];
  grooves: { id: string; label: string; prompt: string }[];
  tonalities: { id: string; label: string; prompt: string }[];
  harmony: string[];
  lead: string[];
  response: string[];
  harmonyInstruments: string[];
  bass: string[];
  rhythm: string[];
  recommendedParts?: Array<Pick<InstrumentPart, 'instrumentId' | 'role' | 'prominence' | 'behaviour'>>;
  foregroundRule?: MusicConfiguration['foregroundRule'];
  interactionPrompt?: string;
  moods: string[];
  scenes: string[];
  melodyDensity: number;
  improvisation: number;
  energy: number;
  dynamics: string;
  arrangement: string;
  production: string[];
  constraints: string[];
  compatibleStyles: string[];
  unusualInstruments: string[];
  variations: VariationRecipe[];
  notes?: string;
}

export interface MusicConfiguration {
  styleId: string;
  tempo: number;
  tempoFeelId: 'auto' | 'very-slow' | 'very-relaxed' | 'relaxed' | 'moderate' | 'brisk' | 'fast';
  meter: string;
  customMeter?: string;
  grooveId: string;
  tonalityId: string;
  key: string;
  harmonyIds: string[];
  sceneId: string;
  moodIds: string[];
  instruments: InstrumentPart[];
  energy: number;
  melodyDensity: number;
  improvisation: number;
  foregroundRule: 'single' | 'gentle' | 'collective';
  phraseLength: 'short' | 'medium' | 'long';
  breathingSpace: 'high' | 'medium' | 'low';
  melodyComplexity: 'minimal' | 'simple' | 'moderate' | 'complex' | 'virtuosic';
  dynamics: string;
  structure: string;
  productionIds: string[];
  constraintIds: string[];
  customStyleName?: string;
  customSceneName?: string;
  secondaryStyleId?: string;
}

export interface CompatibilityMessage {
  category: 'unusual' | 'conflict' | 'info';
  message: string;
  suggestions?: string[];
}

export interface CompatibilityResult {
  score: number;
  label: 'excellent' | 'good' | 'unusual' | 'conflict';
  messages: CompatibilityMessage[];
  factors: { label: string; score: number; max: number; reason: string }[];
}

export interface UserPreset {
  id: string;
  name: string;
  updatedAt: string;
  configuration: MusicConfiguration;
}
