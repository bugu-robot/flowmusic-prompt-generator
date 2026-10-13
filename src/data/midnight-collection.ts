import { recommendConfiguration } from '../engine/recommendation-engine';
import type { InstrumentPart, MusicConfiguration } from '../models/types';

export interface CollectionPreset {
  id: string;
  name: string;
  nameZh: string;
  descriptionZh: string;
  configuration: MusicConfiguration;
}

function part(instrumentId: string, role: InstrumentPart['role'], prominence: number, behaviour: string, felt = false): InstrumentPart {
  return { instrumentId, enabled: true, role, prominence, behaviour, ...(felt ? { timbreId: 'felt' as const } : {}) };
}

function configuration(styleId: string, changes: Partial<MusicConfiguration>): MusicConfiguration {
  return {
    ...recommendConfiguration(styleId),
    moodIds: ['calm', 'intimate'], energy: 18, melodyDensity: 18, improvisation: 12,
    foregroundRule: 'single', phraseLength: 'short', breathingSpace: 'high', melodyComplexity: 'simple',
    dynamics: 'very-stable', structure: 'continuous', secondaryStyleId: undefined,
    ...changes,
  };
}

// This collection is separate from user-owned local presets. Applying one is an
// explicit full-configuration replacement, never a style-selection side effect.
export const MIDNIGHT_COLLECTION: readonly CollectionPreset[] = [
  {
    id: 'midnight-ambient', name: 'Midnight Ambient', nameZh: '午夜空靈',
    descriptionZh: '58 BPM · Rhodes 主奏、低音與微量顫音琴質感；無鼓、慢速和聲，適合星空與湖面。',
    configuration: configuration('ambient-jazz', {
      tempo: 58, grooveId: 'open', tonalityId: 'relative-minor', sceneId: 'moonlight',
      harmonyIds: ['maj7', 'min9', 'add9'], moodIds: ['calm', 'dreamy', 'peaceful'],
      productionIds: ['warm', 'spacious', 'room', 'soft-transients'],
      instruments: [
        part('rhodes', 'lead', 65, 'a mellow melodic line'),
        part('upright-bass', 'bass', 38, 'a simple, warm and restrained foundation'),
        part('vibraphone', 'texture', 18, 'soft shimmering chord colours'),
      ],
    }),
  },
  {
    id: 'blue-city-lounge', name: 'Blue City Lounge', nameZh: '冷藍都市 Lounge',
    descriptionZh: '72 BPM · 清音電結他主奏、Rhodes 和聲、Electric Bass 與極輕刷鼓；平直律動，適合城市與泳池。',
    configuration: configuration('cool-jazz', {
      tempo: 72, grooveId: 'soft-straight', tonalityId: 'major', sceneId: 'city-night',
      energy: 28, melodyDensity: 28, improvisation: 18, dynamics: 'stable',
      harmonyIds: ['maj7', 'min7', 'add9'], moodIds: ['calm', 'elegant', 'sophisticated'],
      productionIds: ['warm', 'clean', 'room', 'polished'],
      instruments: [
        part('jazz-electric-guitar', 'lead', 65, 'rounded single-note phrases'),
        part('rhodes', 'harmony', 42, 'soft electric-piano chords'),
        part('electric-bass', 'bass', 42, 'a soft, steady groove'),
        part('brush-drums', 'rhythm', 18, 'a feather-light brushed pulse'),
      ],
    }),
  },
  {
    id: 'rainy-night-mellow', name: 'Rainy Night Mellow', nameZh: '雨夜懷舊',
    descriptionZh: '62 BPM · Felt Piano 主奏、尼龍結他輕聲和弦、Upright Bass；無鼓、自由抒情拍感，適合雨窗。',
    configuration: configuration('jazz-ballad', {
      tempo: 62, grooveId: 'free', tonalityId: 'relative-minor', sceneId: 'rain-window',
      moodIds: ['nostalgic', 'reflective', 'intimate'], harmonyIds: ['maj7', 'min7', 'min9', 'add9'],
      productionIds: ['warm', 'intimate', 'close-mic', 'room', 'soft-transients'],
      instruments: [
        part('piano', 'lead', 65, 'understated melodic phrases', true),
        part('nylon-guitar', 'harmony', 22, 'soft chordal support with a light touch'),
        part('upright-bass', 'bass', 38, 'a simple, warm and restrained foundation'),
      ],
    }),
  },
  {
    id: 'silent-minimal', name: 'Silent Minimal', nameZh: '靜夜極簡',
    descriptionZh: '50 BPM · Felt Piano 與極輕低音二重奏；無鼓、無回應旋律，最多留白，適合日式庭院。',
    configuration: configuration('ambient-jazz', {
      tempo: 50, grooveId: 'open', tonalityId: 'modal', sceneId: 'late-night',
      energy: 10, melodyDensity: 8, improvisation: 5, melodyComplexity: 'minimal',
      moodIds: ['peaceful', 'calm'], harmonyIds: ['sus', 'modal', 'add9'],
      productionIds: ['intimate', 'spacious', 'close-mic', 'room', 'soft-transients'],
      instruments: [
        part('piano', 'lead', 50, 'understated melodic phrases', true),
        part('upright-bass', 'bass', 20, 'a simple, warm and restrained foundation'),
      ],
    }),
  },
  {
    id: 'moonlit-guitar', name: 'Moonlit Guitar', nameZh: '月光結他',
    descriptionZh: '64 BPM · 尼龍結他主奏、輕聲 Rhodes、Upright Bass 與微量 Shaker；柔和平直拍感，不強制 Bossa。',
    configuration: configuration('cozy-jazz', {
      tempo: 64, grooveId: 'soft-straight', tonalityId: 'relative-minor', sceneId: 'moonlight',
      energy: 22, melodyDensity: 24, improvisation: 15,
      moodIds: ['warm', 'dreamy', 'intimate'], harmonyIds: ['maj7', 'min7', 'sixth', 'add9'],
      productionIds: ['warm', 'intimate', 'room', 'soft-transients'],
      instruments: [
        part('nylon-guitar', 'lead', 65, 'sparse, gentle phrases with generous pauses'),
        part('rhodes', 'harmony', 22, 'subtle sustained harmonic colour'),
        part('upright-bass', 'bass', 35, 'a simple, warm and restrained foundation'),
        part('soft-shaker', 'rhythm', 12, 'a soft, even rhythmic texture'),
      ],
    }),
  },
  {
    id: 'slow-piano-trio', name: 'Slow Piano Trio', nameZh: '慢板鋼琴三重奏',
    descriptionZh: '66 BPM · Acoustic Piano 主奏、Upright Bass 與極輕 Brush Drums；柔和 Swing、留白旋律，適合閱讀與安靜咖啡館。',
    configuration: configuration('piano-cafe-jazz', {
      tempo: 66, grooveId: 'soft-swing', tonalityId: 'warm-major', sceneId: 'reading-room',
      energy: 18, melodyDensity: 22, improvisation: 15,
      moodIds: ['calm', 'warm', 'intimate'], harmonyIds: ['maj7', 'min7', 'sixth', 'add9'],
      productionIds: ['warm', 'intimate', 'room', 'soft-transients'],
      instruments: [
        part('piano', 'lead', 65, 'understated melodic phrases'),
        part('upright-bass', 'bass', 40, 'a simple, warm and restrained foundation'),
        part('brush-drums', 'rhythm', 15, 'a feather-light brushed pulse'),
      ],
    }),
  },
  {
    id: 'late-night-saxophone', name: 'Late Night Saxophone', nameZh: '深夜薩克斯風',
    descriptionZh: '62 BPM · Tenor Sax 主奏、Acoustic Piano 和聲、Upright Bass 與極輕 Brush Drums；克制抒情，適合深夜城市。',
    configuration: configuration('jazz-ballad', {
      tempo: 62, grooveId: 'slow-ballad', tonalityId: 'relative-minor', sceneId: 'late-night',
      energy: 18, melodyDensity: 20, improvisation: 14,
      moodIds: ['nostalgic', 'reflective', 'intimate'], harmonyIds: ['maj7', 'min7', 'min9', 'add9'],
      productionIds: ['warm', 'intimate', 'room', 'soft-transients'],
      instruments: [
        part('tenor-sax', 'lead', 62, 'warm, restrained lyrical phrases with generous pauses'),
        part('piano', 'harmony', 30, 'soft, spacious chord voicings'),
        part('upright-bass', 'bass', 38, 'a simple, warm and restrained foundation'),
        part('brush-drums', 'rhythm', 12, 'a feather-light brushed pulse'),
      ],
    }),
  },
];

export function createMidnightConfiguration(id: string): MusicConfiguration | undefined {
  const preset = MIDNIGHT_COLLECTION.find(item => item.id === id);
  return preset ? structuredClone(preset.configuration) : undefined;
}
