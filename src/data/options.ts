export interface LabeledOption {
  id: string;
  label: string;
  prompt: string;
}

export const HARMONIES: LabeledOption[] = [
  { id: 'maj7', label: 'Major 7th', prompt: 'major 7th' },
  { id: 'maj6', label: 'Major 6th (Maj6)', prompt: 'major 6th' },
  { id: 'min7', label: 'Minor 7th', prompt: 'minor 7th' },
  { id: 'dom7', label: 'Dominant 7th', prompt: 'dominant 7th' },
  { id: 'sixth', label: '6th', prompt: '6th' },
  { id: 'add9', label: 'add9', prompt: 'occasional add9' },
  { id: 'maj9', label: 'Major 9th', prompt: 'major 9th' },
  { id: 'min9', label: 'Minor 9th', prompt: 'minor 9th' },
  { id: 'dom9', label: 'Dominant 9th', prompt: 'dominant 9th' },
  { id: '11th', label: '11th', prompt: '11th extensions' },
  { id: '13th', label: '13th', prompt: '13th extensions' },
  { id: 'altered', label: 'Altered Dominant', prompt: 'altered dominant chords' },
  { id: 'sus', label: 'Suspended', prompt: 'suspended harmony' },
  { id: 'modal', label: 'Modal Harmony', prompt: 'modal harmony' },
  { id: 'dim', label: 'Diminished', prompt: 'diminished passing chords' },
  { id: 'blues', label: 'Blues Harmony', prompt: 'blues harmony' },
  { id: 'chromatic', label: 'Chromatic Passing Harmony', prompt: 'subtle chromatic passing harmony' },
];

export const MOODS: LabeledOption[] = [
  { id: 'cozy', label: '溫馨 Cozy', prompt: 'cozy' },
  { id: 'warm', label: '溫暖 Warm', prompt: 'warm' },
  { id: 'peaceful', label: '平靜 Peaceful', prompt: 'peaceful' },
  { id: 'nostalgic', label: '懷舊 Nostalgic', prompt: 'nostalgic' },
  { id: 'romantic', label: '浪漫 Romantic', prompt: 'romantic' },
  { id: 'dreamy', label: '夢幻 Dreamy', prompt: 'dreamy' },
  { id: 'melancholic', label: '憂鬱 Melancholic', prompt: 'melancholic' },
  { id: 'cheerful', label: '愉快 Cheerful', prompt: 'cheerful' },
  { id: 'energetic', label: '充滿活力 Energetic', prompt: 'energetic' },
  { id: 'elegant', label: '優雅 Elegant', prompt: 'elegant' },
  { id: 'intimate', label: '親密 Intimate', prompt: 'intimate' },
  { id: 'reflective', label: '沉思 Reflective', prompt: 'reflective' },
  { id: 'hopeful', label: '帶有希望 Hopeful', prompt: 'hopeful' },
  { id: 'calm', label: '寧靜 Calm', prompt: 'calm' },
  { id: 'playful', label: '俏皮 Playful', prompt: 'playful' },
  { id: 'sophisticated', label: '精緻 Sophisticated', prompt: 'sophisticated' },
  { id: 'mysterious', label: '神秘 Mysterious', prompt: 'mysterious' },
];

export const SCENES: LabeledOption[] = [
  { id: 'quiet-cafe', label: '安靜咖啡店 Quiet Café', prompt: 'a quiet café' },
  { id: 'rainy-cafe', label: '雨天咖啡店 Rainy Café', prompt: 'a rainy café by the window' },
  { id: 'sunset-cafe', label: '日落咖啡店 Sunset Café', prompt: 'a quiet sunset café' },
  { id: 'seaside-cafe', label: '海邊咖啡店 Seaside Café', prompt: 'a peaceful seaside café' },
  { id: 'morning-cafe', label: '晨早咖啡店 Morning Café', prompt: 'a gentle morning café' },
  { id: 'reading-room', label: '閱讀室 Reading Room', prompt: 'a quiet reading room' },
  { id: 'library', label: '圖書館 Library', prompt: 'a warm library corner' },
  { id: 'bakery', label: '麵包店 Bakery', prompt: 'a small neighbourhood bakery' },
  { id: 'late-night', label: '深夜 Late Night', prompt: 'a calm late-night room' },
  { id: 'autumn', label: '秋日 Autumn', prompt: 'a mellow autumn afternoon' },
  { id: 'winter', label: '冬日 Winter', prompt: 'a quiet winter evening' },
  { id: 'spring', label: '春日 Spring', prompt: 'a fresh spring morning' },
  { id: 'summer', label: '夏日 Summer', prompt: 'a relaxed summer evening' },
  { id: 'fireplace', label: '壁爐 Fireplace', prompt: 'a softly lit room beside a fireplace' },
  { id: 'rain-window', label: '雨窗 Rainy Window', prompt: 'a reflective room beside a rainy window' },
  { id: 'city-night', label: '城市夜色 City Night', prompt: 'a subdued city night' },
  { id: 'moonlight', label: '月光 Moonlight', prompt: 'a still moonlit evening' },
  { id: 'custom', label: '自訂場景 Custom', prompt: 'a personal, understated setting' },
];

export const TONALITIES: LabeledOption[] = [
  { id: 'warm-major', label: '溫暖大調 Warm Major', prompt: 'warm major tonality' },
  { id: 'major', label: '大調 Major', prompt: 'major tonality' },
  { id: 'minor', label: '小調 Minor', prompt: 'minor tonality' },
  { id: 'modal', label: '調式 Modal', prompt: 'modal tonality' },
  { id: 'relative-minor', label: '大調帶關係小調色彩', prompt: 'warm major tonality with occasional relative-minor colors' },
  { id: 'dark-modal', label: '深色調式 Dark Modal', prompt: 'dark modal tonality' },
];

export const PRODUCTION: LabeledOption[] = [
  { id: 'warm', label: '溫暖 Warm', prompt: 'warm' },
  { id: 'intimate', label: '親密 Intimate', prompt: 'intimate' },
  { id: 'acoustic', label: '原聲 Acoustic', prompt: 'acoustic' },
  { id: 'room', label: '自然空間感 Natural Room Ambience', prompt: 'natural room ambience' },
  { id: 'soft-transients', label: '柔和起音 Soft Transients', prompt: 'soft transients' },
  { id: 'round-bass', label: '渾圓低音 Round Bass', prompt: 'round upright bass' },
  { id: 'smooth-highs', label: '柔順高頻 Smooth High Frequencies', prompt: 'smooth high frequencies' },
  { id: 'vintage', label: '復古 Vintage', prompt: 'a subtle vintage character' },
  { id: 'clean', label: '清晰現代 Modern Clean', prompt: 'clean' },
  { id: 'close-mic', label: '近距離收音 Close Microphone', prompt: 'close-miked' },
  { id: 'spacious', label: '寬闊 Spacious', prompt: 'spacious' },
  { id: 'dark', label: '暗色 Dark', prompt: 'dark' },
  { id: 'airy', label: '通透 Airy', prompt: 'airy' },
  { id: 'analog', label: '類比質感 Analog-like', prompt: 'a gentle analog-like warmth' },
  { id: 'polished', label: '細緻 Polished', prompt: 'a polished, understated mix' },
];

export const CONSTRAINTS: LabeledOption[] = [
  { id: 'flashy-solos', label: '炫技獨奏', prompt: 'flashy solos' },
  { id: 'virtuosic-runs', label: '炫技快速樂句', prompt: 'virtuosic runs' },
  { id: 'busy-fills', label: '密集過門', prompt: 'busy fills' },
  { id: 'aggressive-percussion', label: '強烈敲擊樂', prompt: 'aggressive percussion' },
  { id: 'dramatic-climax', label: '戲劇性高潮', prompt: 'a dramatic climax' },
  { id: 'large-crescendos', label: '大幅漸強', prompt: 'large crescendos' },
  { id: 'dense-arrangement', label: '編曲過密', prompt: 'a dense arrangement' },
  { id: 'cinematic', label: '電影配樂式管弦編曲', prompt: 'cinematic orchestration' },
  { id: 'electronic', label: '電子樂器', prompt: 'electronic instruments' },
  { id: 'heavy-bass', label: '過重低音', prompt: 'overly heavy bass' },
  { id: 'bright-brass', label: '過亮銅管', prompt: 'overly bright brass' },
  { id: 'chromatic-runs', label: '複雜半音樂句', prompt: 'complex chromatic runs' },
];

export const ROLES = [
  { id: 'lead', label: '主奏 Primary Lead' },
  { id: 'response', label: '副旋律回應 Secondary Response' },
  { id: 'harmony', label: '和聲 Harmony' },
  { id: 'bass', label: '低音基礎 Bass Foundation' },
  { id: 'rhythm', label: '節奏 Rhythm' },
  { id: 'texture', label: '質感 Texture' },
  { id: 'countermelody', label: '對位旋律 Countermelody' },
] as const;

export const MOOD_LABELS: Record<string, string> = Object.fromEntries(MOODS.map((option) => [option.id, option.label]));
export const SCENE_LABELS: Record<string, string> = Object.fromEntries(SCENES.map((option) => [option.id, option.label]));
export const HARMONY_BY_ID = new Map(HARMONIES.map((option) => [option.id, option]));
export const OPTION_BY_ID = <T extends LabeledOption>(options: T[]) => new Map(options.map((option) => [option.id, option]));
