import type { JazzStyle, VariationRecipe } from '../models/types';

interface StyleSeed {
  id: string;
  name: string;
  nameZh: string;
  classification: JazzStyle['classification'];
  family: string;
  descriptionZh: string;
  tempo: JazzStyle['tempo'];
  groove: [string, string][];
  tonalities: [string, string][];
  harmony: string[];
  lead: string[];
  response: string[];
  harmonyInstruments?: string[];
  bass: string[];
  rhythm: string[];
  moods: string[];
  scenes: string[];
  melodyDensity: number;
  improvisation: number;
  energy: number;
  dynamics: string;
  arrangement: string;
  production: string[];
  constraints: string[];
  compatibleStyles?: string[];
  unusualInstruments?: string[];
  notes?: string;
}

function makeStyle(seed: StyleSeed): JazzStyle {
  const variations: VariationRecipe[] = [
    { label: 'A', lead: seed.lead[0]!, response: seed.response[0], harmony: seed.harmonyInstruments?.[0], bass: seed.bass[0]!, rhythm: seed.rhythm[0] },
    { label: 'B', lead: seed.lead[Math.min(1, seed.lead.length - 1)]!, response: seed.response[Math.min(1, seed.response.length - 1)], harmony: seed.harmonyInstruments?.[1] ?? seed.harmonyInstruments?.[0], bass: seed.bass[0]!, rhythm: seed.rhythm[Math.min(1, seed.rhythm.length - 1)] },
    { label: 'C', lead: seed.lead[Math.min(2, seed.lead.length - 1)]!, response: seed.response[0], harmony: seed.harmonyInstruments?.[0], bass: seed.bass[0]!, rhythm: seed.rhythm[0] },
  ];
  return {
    ...seed,
    meters: seed.id === 'waltz-ballad' ? ['3/4', '4/4'] : ['4/4', '3/4', '6/8'],
    grooves: seed.groove.map(([id, prompt]) => ({ id, label: prompt[0]!.toUpperCase() + prompt.slice(1), prompt })),
    tonalities: seed.tonalities.map(([id, prompt]) => ({ id, label: prompt[0]!.toUpperCase() + prompt.slice(1), prompt })),
    harmonyInstruments: seed.harmonyInstruments ?? seed.lead,
    variations,
    compatibleStyles: seed.compatibleStyles ?? [],
    unusualInstruments: seed.unusualInstruments ?? ['distorted-guitar', 'heavy-rock-drums', 'tuba', 'synth'],
  };
}

export const JAZZ_STYLES: JazzStyle[] = [
  makeStyle({
    id: 'cozy-jazz', name: 'Cozy Jazz', nameZh: '溫馨、輕鬆的現代爵士氛圍', classification: 'modern-descriptor', family: 'cozy',
    descriptionZh: '現代氛圍與情緒描述，並非正式歷史爵士流派；著重溫暖、留白和適合作背景聆聽。',
    tempo: { min: 48, max: 92, default: 68 }, groove: [['relaxed-swing', 'gentle, relaxed swing'], ['soft-straight', 'soft straight-eighth groove'], ['open', 'free, unhurried phrasing']],
    tonalities: [['warm-major', 'warm major tonality'], ['relative-minor', 'major tonality with relative-minor colors'], ['soft-modal', 'soft modal colors']],
    harmony: ['maj7', 'min7', 'sixth', 'add9'], lead: ['piano', 'nylon-guitar', 'vibraphone', 'flugelhorn'], response: ['flugelhorn', 'vibraphone', 'nylon-guitar'],
    harmonyInstruments: ['piano', 'vibraphone'], bass: ['upright-bass'], rhythm: ['brush-drums', 'soft-shaker'],
    moods: ['cozy', 'warm', 'peaceful', 'intimate', 'nostalgic', 'calm'], scenes: ['quiet-cafe', 'library', 'reading-room', 'rain-window', 'fireplace', 'rainy-cafe'],
    melodyDensity: 20, improvisation: 18, energy: 22, dynamics: 'stable', arrangement: 'continuous', production: ['warm', 'intimate', 'acoustic', 'room', 'soft-transients'],
    constraints: ['vocals', 'scat', 'flashy-solos', 'busy-fills', 'aggressive-percussion', 'dramatic-climax', 'large-crescendos'],
    compatibleStyles: ['cool-jazz', 'slow-bossa', 'jazz-ballad'],
    notes: 'Cozy Jazz is presented as a modern mood descriptor, not a historical genre.',
  }),
  makeStyle({
    id: 'slow-bossa', name: 'Slow Bossa Jazz', nameZh: '慢速 Bossa 律動與柔和 Jazz 和聲', classification: 'historical-derived-style', family: 'bossa',
    descriptionZh: '慢速、柔和的 Bossa Nova 律動，配合寬鬆爵士和聲和大量旋律留白。',
    tempo: { min: 50, max: 80, default: 58 }, groove: [['slow-bossa', 'very relaxed straight-eighth bossa groove, gently behind the beat'], ['soft-bossa', 'soft, lightly syncopated bossa pulse']],
    tonalities: [['warm-major', 'warm major tonality'], ['relative-minor', 'warm major tonality with occasional relative-minor colors']],
    harmony: ['maj7', 'min7', 'sixth', 'add9'], lead: ['nylon-guitar', 'piano', 'flugelhorn'], response: ['flugelhorn', 'vibraphone', 'piano'],
    harmonyInstruments: ['piano', 'nylon-guitar'], bass: ['upright-bass'], rhythm: ['soft-shaker', 'brazilian-percussion', 'brush-drums'],
    moods: ['warm', 'peaceful', 'nostalgic', 'romantic', 'intimate', 'calm'], scenes: ['sunset-cafe', 'seaside-cafe', 'rainy-cafe', 'morning-cafe'],
    melodyDensity: 18, improvisation: 16, energy: 20, dynamics: 'stable', arrangement: 'gentle-evolution', production: ['warm', 'intimate', 'acoustic', 'room', 'round-bass', 'smooth-highs'],
    constraints: ['vocals', 'scat', 'flashy-solos', 'busy-fills', 'aggressive-percussion', 'dramatic-climax', 'dense-arrangement'],
    compatibleStyles: ['bossa-nova', 'cozy-jazz', 'cool-jazz'], unusualInstruments: ['distorted-guitar', 'heavy-rock-drums', 'tuba', 'trumpet', 'synth'],
  }),
  makeStyle({
    id: 'bossa-nova', name: 'Bossa Nova Jazz', nameZh: '巴西 Bossa Nova 節奏與 Jazz 和聲', classification: 'historical-derived-style', family: 'bossa',
    descriptionZh: '源自巴西 Bossa Nova 的輕柔切分節奏，配合簡潔、細膩的爵士和聲。',
    tempo: { min: 70, max: 130, default: 96 }, groove: [['bossa', 'relaxed straight-eighth bossa groove'], ['samba-soft', 'light samba-influenced pulse']],
    tonalities: [['warm-major', 'warm major tonality'], ['relative-minor', 'major tonality with relative-minor colors']],
    harmony: ['maj7', 'min7', 'sixth', 'add9', 'min9'], lead: ['nylon-guitar', 'piano', 'flugelhorn'], response: ['flugelhorn', 'piano', 'nylon-guitar'],
    bass: ['upright-bass'], rhythm: ['soft-shaker', 'brazilian-percussion', 'brush-drums'], moods: ['warm', 'peaceful', 'romantic', 'cheerful', 'elegant'],
    scenes: ['seaside-cafe', 'sunset-cafe', 'morning-cafe', 'summer'], melodyDensity: 32, improvisation: 28, energy: 38, dynamics: 'gentle-evolution', arrangement: 'gentle-evolution',
    production: ['warm', 'acoustic', 'room', 'round-bass', 'airy'], constraints: ['vocals', 'scat', 'flashy-solos', 'aggressive-percussion', 'dramatic-climax'],
    compatibleStyles: ['slow-bossa', 'latin-jazz', 'cozy-jazz'], unusualInstruments: ['distorted-guitar', 'heavy-rock-drums', 'tuba', 'synth'],
  }),
  makeStyle({
    id: 'cool-jazz', name: 'Cool Jazz', nameZh: '冷調、克制、留白感強的爵士風格', classification: 'historical-style', family: 'cool',
    descriptionZh: '音色柔和、編排克制，重視線條感、空間和細緻互動。',
    tempo: { min: 55, max: 145, default: 92 }, groove: [['light-swing', 'light, understated swing'], ['soft-straight', 'relaxed straight-eighth feel'], ['open', 'spacious, lightly floating phrasing']],
    tonalities: [['major', 'open major tonality'], ['modal', 'subtle modal colors'], ['warm-major', 'warm major tonality']],
    harmony: ['maj7', 'min7', 'sixth', 'add9', 'modal'], lead: ['muted-trumpet', 'alto-sax', 'piano', 'vibraphone'], response: ['piano', 'vibraphone', 'muted-trumpet'],
    bass: ['upright-bass'], rhythm: ['brush-drums'], moods: ['calm', 'reflective', 'elegant', 'intimate', 'mysterious'], scenes: ['reading-room', 'library', 'late-night', 'rain-window'],
    melodyDensity: 34, improvisation: 35, energy: 32, dynamics: 'stable', arrangement: 'continuous', production: ['warm', 'acoustic', 'room', 'soft-transients', 'spacious'],
    constraints: ['vocals', 'scat', 'flashy-solos', 'busy-fills', 'dramatic-climax', 'dense-arrangement'], compatibleStyles: ['cozy-jazz', 'jazz-ballad', 'west-coast'],
  }),
  makeStyle({
    id: 'west-coast', name: 'West Coast Jazz', nameZh: '清晰、明亮而講究編曲平衡的西岸爵士', classification: 'historical-style', family: 'cool',
    descriptionZh: '清晰的音色和較精緻的室內樂式編排，保留從容而不過度繁複的即興。',
    tempo: { min: 75, max: 165, default: 112 }, groove: [['light-swing', 'light, buoyant swing'], ['medium-swing', 'medium swing with relaxed phrasing']],
    tonalities: [['major', 'clear major tonality'], ['warm-major', 'warm major tonality'], ['modal', 'subtle modal colors']],
    harmony: ['maj7', 'min7', 'dom7', 'sixth', 'maj9'], lead: ['trumpet', 'alto-sax', 'piano'], response: ['trombone', 'clarinet', 'piano'], harmonyInstruments: ['piano', 'vibraphone'],
    bass: ['upright-bass'], rhythm: ['brush-drums', 'acoustic-drums'], moods: ['elegant', 'cheerful', 'sophisticated', 'calm'], scenes: ['quiet-cafe', 'city-night', 'morning-cafe'],
    melodyDensity: 48, improvisation: 42, energy: 48, dynamics: 'gentle-evolution', arrangement: 'traditional-sections', production: ['clean', 'acoustic', 'spacious', 'polished'],
    constraints: ['vocals', 'scat', 'large-crescendos', 'dense-arrangement'], compatibleStyles: ['cool-jazz', 'swing-jazz'],
  }),
  makeStyle({
    id: 'soft-swing', name: 'Soft Swing Jazz', nameZh: '輕柔、從容的 Swing 律動', classification: 'modern-descriptor', family: 'swing',
    descriptionZh: '以較輕的 swing 節奏營造舒適背景感；屬現代風格描述，非獨立歷史流派。',
    tempo: { min: 68, max: 132, default: 94 }, groove: [['soft-swing', 'soft, gently lilting swing'], ['light-swing', 'light swing with relaxed ride cymbal']],
    tonalities: [['warm-major', 'warm major tonality'], ['major', 'major tonality'], ['relative-minor', 'major with relative-minor colors']],
    harmony: ['maj7', 'min7', 'dom7', 'sixth', 'add9'], lead: ['piano', 'muted-trumpet', 'jazz-electric-guitar'], response: ['vibraphone', 'flugelhorn', 'piano'],
    bass: ['upright-bass'], rhythm: ['brush-drums', 'acoustic-drums'], moods: ['cozy', 'cheerful', 'warm', 'playful', 'elegant'], scenes: ['quiet-cafe', 'bakery', 'morning-cafe'],
    melodyDensity: 38, improvisation: 30, energy: 40, dynamics: 'stable', arrangement: 'continuous', production: ['warm', 'acoustic', 'room', 'soft-transients'],
    constraints: ['vocals', 'scat', 'flashy-solos', 'busy-fills', 'dramatic-climax'], compatibleStyles: ['swing-jazz', 'cozy-jazz'],
  }),
  makeStyle({
    id: 'swing-jazz', name: 'Swing Jazz', nameZh: '以 swing 律動和即興互動為核心的爵士', classification: 'historical-style', family: 'swing',
    descriptionZh: '鮮明的 swing 律動、四拍推進和樂手之間的問答式互動。',
    tempo: { min: 90, max: 220, default: 138 }, groove: [['medium-swing', 'medium swing with a buoyant pulse'], ['walking-swing', 'walking swing with steady ride-cymbal time'], ['light-swing', 'light, relaxed swing']],
    tonalities: [['major', 'bright major tonality'], ['warm-major', 'warm major tonality'], ['minor', 'minor tonality']],
    harmony: ['maj7', 'min7', 'dom7', 'sixth', '13th'], lead: ['trumpet', 'tenor-sax', 'piano', 'clarinet'], response: ['trombone', 'clarinet', 'piano'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums', 'brush-drums'], moods: ['cheerful', 'playful', 'sophisticated', 'warm'], scenes: ['bakery', 'city-night', 'quiet-cafe'],
    melodyDensity: 60, improvisation: 62, energy: 65, dynamics: 'gentle-evolution', arrangement: 'traditional-sections', production: ['acoustic', 'clean', 'room', 'polished'],
    constraints: ['vocals', 'dramatic-climax', 'dense-arrangement'], compatibleStyles: ['soft-swing', 'bebop', 'new-orleans'],
  }),
  makeStyle({
    id: 'jazz-ballad', name: 'Jazz Ballad', nameZh: '慢速、抒情、重視旋律呼吸的爵士', classification: 'historical-derived-style', family: 'ballad',
    descriptionZh: '慢速抒情演奏，留意長音、句尾空間和溫柔的和聲推進。',
    tempo: { min: 38, max: 88, default: 62 }, groove: [['slow-ballad', 'slow, spacious ballad pulse'], ['free', 'rubato-inspired, unhurried phrasing'], ['soft-swing', 'very gentle slow swing']],
    tonalities: [['warm-major', 'warm major tonality'], ['minor', 'tender minor tonality'], ['relative-minor', 'major with gentle relative-minor colors']],
    harmony: ['maj7', 'min7', 'sixth', 'add9', 'min9'], lead: ['flugelhorn', 'muted-trumpet', 'piano', 'tenor-sax'], response: ['piano', 'flugelhorn', 'vibraphone'],
    bass: ['upright-bass'], rhythm: ['brush-drums'], moods: ['romantic', 'melancholic', 'reflective', 'intimate', 'nostalgic'], scenes: ['late-night', 'fireplace', 'rain-window', 'moonlight'],
    melodyDensity: 24, improvisation: 26, energy: 18, dynamics: 'stable', arrangement: 'gentle-evolution', production: ['warm', 'intimate', 'room', 'soft-transients', 'round-bass'],
    constraints: ['vocals', 'scat', 'flashy-solos', 'busy-fills', 'aggressive-percussion', 'dramatic-climax', 'large-crescendos'], compatibleStyles: ['cozy-jazz', 'cool-jazz', 'slow-bossa'],
  }),
  makeStyle({
    id: 'modal-jazz', name: 'Modal Jazz', nameZh: '以調式色彩和較長和聲停留為特色', classification: 'historical-style', family: 'modal',
    descriptionZh: '以調式音階、長時間停留的和聲和較開放的即興探索建立空間。',
    tempo: { min: 55, max: 180, default: 108 }, groove: [['modal-pulse', 'steady, spacious modal pulse'], ['open', 'open, lightly floating groove'], ['medium-swing', 'restrained medium swing']],
    tonalities: [['modal', 'modal tonality'], ['dark-modal', 'dark modal tonality'], ['minor', 'minor tonality']],
    harmony: ['modal', 'sus', 'min7', 'min9', '11th'], lead: ['tenor-sax', 'soprano-sax', 'trumpet', 'piano'], response: ['piano', 'vibraphone', 'soprano-sax'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums', 'brush-drums'], moods: ['mysterious', 'reflective', 'sophisticated', 'calm'], scenes: ['city-night', 'moonlight', 'late-night'],
    melodyDensity: 40, improvisation: 62, energy: 48, dynamics: 'gentle-evolution', arrangement: 'continuous', production: ['acoustic', 'spacious', 'warm', 'room'],
    constraints: ['vocals', 'scat', 'busy-fills', 'dense-arrangement', 'dramatic-climax'], compatibleStyles: ['post-bop', 'spiritual-jazz', 'cool-jazz'],
  }),
  makeStyle({
    id: 'nordic-chamber', name: 'Nordic / Chamber Jazz', nameZh: '北歐空間感與室內樂式爵士編制', classification: 'modern-descriptor', family: 'chamber',
    descriptionZh: '留白、自然音色和室內樂式互動；以柔和動態營造清冷而親密的空間。',
    tempo: { min: 45, max: 125, default: 76 }, groove: [['open', 'open, spacious phrasing'], ['soft-straight', 'soft, steady straight-eighth pulse'], ['waltz', 'gentle chamber waltz']],
    tonalities: [['modal', 'spacious modal tonality'], ['minor', 'subtle minor tonality'], ['warm-major', 'soft warm major tonality']],
    harmony: ['maj7', 'min7', 'add9', 'sus', 'modal'], lead: ['piano', 'violin', 'vibraphone', 'flugelhorn'], response: ['violin', 'vibraphone', 'piano'],
    harmonyInstruments: ['piano', 'violin'], bass: ['upright-bass'], rhythm: ['brush-drums'], moods: ['reflective', 'mysterious', 'dreamy', 'calm', 'intimate'],
    scenes: ['library', 'moonlight', 'winter', 'rain-window', 'reading-room'], melodyDensity: 22, improvisation: 22, energy: 18, dynamics: 'stable', arrangement: 'gentle-evolution',
    production: ['acoustic', 'spacious', 'airy', 'room', 'soft-transients'], constraints: ['vocals', 'scat', 'flashy-solos', 'aggressive-percussion', 'dramatic-climax', 'dense-arrangement'],
    compatibleStyles: ['cool-jazz', 'jazz-ballad', 'modal-jazz'], unusualInstruments: ['distorted-guitar', 'heavy-rock-drums', 'tuba', 'trumpet', 'synth'],
  }),
  makeStyle({
    id: 'spiritual-jazz', name: 'Spiritual Jazz', nameZh: '帶有靈性探索與開放即興的爵士', classification: 'historical-style', family: 'modal',
    descriptionZh: '以靈性、冥想式重複和開放即興探索為核心，可在寧靜與高能量之間變化。',
    tempo: { min: 48, max: 165, default: 88 }, groove: [['open', 'open, meditative pulse'], ['modal-pulse', 'repeating modal groove'], ['free', 'free, spacious phrasing']],
    tonalities: [['modal', 'modal tonality'], ['minor', 'deep minor tonality'], ['dark-modal', 'dark modal colors']],
    harmony: ['modal', 'sus', 'min7', '11th'], lead: ['tenor-sax', 'trumpet', 'soprano-sax', 'piano'], response: ['piano', 'vibraphone', 'tenor-sax'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums', 'congas'], moods: ['reflective', 'hopeful', 'mysterious', 'dreamy'], scenes: ['moonlight', 'late-night', 'city-night'],
    melodyDensity: 44, improvisation: 72, energy: 52, dynamics: 'gradual-build', arrangement: 'gentle-evolution', production: ['warm', 'spacious', 'acoustic', 'airy'],
    constraints: ['vocals', 'scat', 'dense-arrangement', 'cinematic'], compatibleStyles: ['modal-jazz', 'post-bop'],
  }),
  makeStyle({
    id: 'brisk-jazz', name: 'Brisk Jazz', nameZh: '明快、有推進感的現代爵士氛圍', classification: 'modern-descriptor', family: 'swing',
    descriptionZh: '現代速度與能量描述，並非正式歷史爵士流派；節奏明快但編曲仍保持清晰。',
    tempo: { min: 118, max: 210, default: 152 }, groove: [['brisk-swing', 'brisk, buoyant swing'], ['up-tempo', 'up-tempo straight-ahead swing'], ['brisk-straight', 'brisk, lightly syncopated straight feel']],
    tonalities: [['major', 'bright major tonality'], ['minor', 'minor tonality'], ['modal', 'bright modal colors']],
    harmony: ['maj7', 'min7', 'dom7', '13th', 'altered'], lead: ['trumpet', 'alto-sax', 'piano', 'tenor-sax'], response: ['piano', 'tenor-sax', 'trumpet'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums'], moods: ['cheerful', 'playful', 'hopeful', 'sophisticated'], scenes: ['city-night', 'bakery', 'morning-cafe'],
    melodyDensity: 62, improvisation: 64, energy: 74, dynamics: 'gentle-evolution', arrangement: 'traditional-sections', production: ['clean', 'acoustic', 'polished'],
    constraints: ['vocals', 'dramatic-climax', 'large-crescendos'], compatibleStyles: ['bebop', 'swing-jazz', 'hard-bop'],
    notes: 'Brisk Jazz is presented as a modern tempo and energy descriptor, not a historical genre.',
  }),
  makeStyle({
    id: 'smooth-jazz', name: 'Smooth Jazz', nameZh: '旋律流暢、音色柔滑的現代爵士', classification: 'historical-derived-style', family: 'smooth',
    descriptionZh: '製作精緻、旋律易聽、節奏平順；通常採用柔和電聲或清潔原聲音色。',
    tempo: { min: 68, max: 128, default: 94 }, groove: [['smooth-straight', 'smooth, steady straight-eighth groove'], ['light-funk', 'soft, lightly syncopated groove'], ['soft-swing', 'gentle, polished swing feel']],
    tonalities: [['warm-major', 'warm major tonality'], ['major', 'major tonality'], ['relative-minor', 'major with relative-minor colors']],
    harmony: ['maj7', 'min7', 'maj9', 'sixth', 'add9'], lead: ['soprano-sax', 'jazz-electric-guitar', 'flugelhorn', 'rhodes'], response: ['rhodes', 'piano', 'flugelhorn'],
    bass: ['electric-bass', 'upright-bass'], rhythm: ['acoustic-drums', 'soft-shaker'], moods: ['warm', 'elegant', 'peaceful', 'romantic'], scenes: ['sunset-cafe', 'city-night', 'seaside-cafe'],
    melodyDensity: 42, improvisation: 28, energy: 42, dynamics: 'stable', arrangement: 'continuous', production: ['clean', 'polished', 'smooth-highs', 'warm'],
    constraints: ['vocals', 'scat', 'flashy-solos', 'aggressive-percussion', 'dramatic-climax'], compatibleStyles: ['cozy-jazz', 'jazz-funk', 'bossa-nova'],
  }),
  makeStyle({
    id: 'latin-jazz', name: 'Latin Jazz', nameZh: '拉丁節奏與爵士即興的融合', classification: 'historical-derived-style', family: 'latin',
    descriptionZh: '多種拉丁音樂節奏與爵士和聲、即興相互融合，節奏層次清楚而靈活。',
    tempo: { min: 80, max: 190, default: 120 }, groove: [['latin', 'syncopated Latin groove'], ['bossa', 'light bossa-influenced rhythm'], ['samba', 'lively samba pulse']],
    tonalities: [['major', 'bright major tonality'], ['minor', 'minor tonality'], ['modal', 'modal colors']],
    harmony: ['maj7', 'min7', 'dom7', 'sixth', 'add9'], lead: ['piano', 'trumpet', 'nylon-guitar', 'vibraphone'], response: ['trumpet', 'piano', 'tenor-sax'],
    bass: ['upright-bass', 'electric-bass'], rhythm: ['congas', 'bongos', 'brazilian-percussion', 'timbales'], moods: ['cheerful', 'playful', 'warm', 'sophisticated'],
    scenes: ['seaside-cafe', 'summer', 'sunset-cafe', 'city-night'], melodyDensity: 54, improvisation: 58, energy: 66, dynamics: 'gentle-evolution', arrangement: 'traditional-sections',
    production: ['warm', 'acoustic', 'clean', 'spacious'], constraints: ['vocals', 'scat', 'dense-arrangement', 'dramatic-climax'],
    compatibleStyles: ['bossa-nova', 'afro-cuban', 'swing-jazz'],
  }),
  makeStyle({
    id: 'afro-cuban', name: 'Afro-Cuban Jazz', nameZh: 'Afro-Cuban 節奏與爵士即興', classification: 'historical-derived-style', family: 'afro-cuban',
    descriptionZh: '以 Afro-Cuban 節奏型和打擊樂編織推進感，配合爵士和聲與獨奏。',
    tempo: { min: 90, max: 210, default: 132 }, groove: [['afro-cuban', 'interlocking Afro-Cuban rhythm'], ['son', 'buoyant son-inspired groove'], ['mambo', 'energetic mambo pulse']],
    tonalities: [['major', 'bright major tonality'], ['minor', 'minor tonality'], ['modal', 'modal colors']],
    harmony: ['maj7', 'min7', 'dom7', '13th', 'altered'], lead: ['trumpet', 'piano', 'tenor-sax'], response: ['piano', 'trumpet', 'trombone'],
    bass: ['upright-bass', 'electric-bass'], rhythm: ['congas', 'bongos', 'timbales'], moods: ['cheerful', 'playful', 'hopeful', 'sophisticated'],
    scenes: ['summer', 'city-night', 'seaside-cafe'], melodyDensity: 62, improvisation: 66, energy: 78, dynamics: 'gradual-build', arrangement: 'traditional-sections',
    production: ['acoustic', 'clean', 'spacious', 'polished'], constraints: ['vocals', 'scat', 'dramatic-climax'],
    compatibleStyles: ['latin-jazz', 'swing-jazz'],
  }),
  makeStyle({
    id: 'gypsy-jazz', name: 'Gypsy Jazz / Jazz Manouche', nameZh: 'Jazz Manouche 的弦樂 swing 傳統', classification: 'historical-derived-style', family: 'gypsy',
    descriptionZh: '以木結他、弦樂和推進感強的 swing 節奏為特色，常見快速弦樂獨奏。',
    tempo: { min: 105, max: 230, default: 158 }, groove: [['manouche-swing', 'driving acoustic manouche swing'], ['la-pompe', 'steady la pompe rhythm-guitar pulse']],
    tonalities: [['major', 'bright major tonality'], ['minor', 'minor tonality'], ['modal', 'minor modal colors']],
    harmony: ['maj6', 'min7', 'dom7', 'sixth', 'dim'], lead: ['jazz-electric-guitar', 'acoustic-guitar', 'violin'], response: ['violin', 'acoustic-guitar', 'clarinet'],
    bass: ['upright-bass'], rhythm: ['acoustic-guitar'], moods: ['playful', 'cheerful', 'nostalgic', 'sophisticated'], scenes: ['city-night', 'bakery', 'summer'],
    melodyDensity: 70, improvisation: 75, energy: 78, dynamics: 'dynamic', arrangement: 'traditional-sections', production: ['acoustic', 'warm', 'close-mic', 'room'],
    constraints: ['vocals', 'scat', 'cinematic'], compatibleStyles: ['swing-jazz', 'bebop'],
  }),
  makeStyle({
    id: 'soul-jazz', name: 'Soul Jazz', nameZh: 'Blues、Gospel 和 R&B 影響的 groove 爵士', classification: 'historical-derived-style', family: 'soul',
    descriptionZh: '以藍調、Gospel 和 R&B 的和聲語彙及重複 groove 作基礎。',
    tempo: { min: 70, max: 160, default: 104 }, groove: [['soul-groove', 'deep, relaxed soul-jazz groove'], ['shuffle', 'laid-back blues shuffle'], ['light-funk', 'softly syncopated funk groove']],
    tonalities: [['minor', 'blues-tinged minor tonality'], ['major', 'warm major tonality'], ['modal', 'soulful modal colors']],
    harmony: ['min7', 'dom7', 'maj7', 'sixth', 'sus'], lead: ['hammond-organ', 'tenor-sax', 'trumpet', 'rhodes'], response: ['tenor-sax', 'trumpet', 'piano'],
    bass: ['upright-bass', 'electric-bass'], rhythm: ['acoustic-drums', 'congas'], moods: ['warm', 'playful', 'hopeful', 'sophisticated'], scenes: ['city-night', 'late-night', 'bakery'],
    melodyDensity: 50, improvisation: 52, energy: 62, dynamics: 'gentle-evolution', arrangement: 'continuous', production: ['warm', 'room', 'analog', 'round-bass'],
    constraints: ['vocals', 'scat', 'dramatic-climax', 'dense-arrangement'], compatibleStyles: ['hard-bop', 'jazz-funk', 'swing-jazz'],
  }),
  makeStyle({
    id: 'hard-bop', name: 'Hard Bop', nameZh: '強烈律動、藍調和 Gospel 色彩的現代爵士', classification: 'historical-style', family: 'hard-bop',
    descriptionZh: '以強烈 swing、藍調語彙及 Gospel 影響延伸 Bebop 的演奏語言。',
    tempo: { min: 92, max: 220, default: 148 }, groove: [['hard-swing', 'driving hard-bop swing'], ['medium-swing', 'firm medium swing'], ['shuffle', 'blues-inflected shuffle']],
    tonalities: [['minor', 'blues-inflected minor tonality'], ['major', 'bright major tonality'], ['modal', 'modal colors']],
    harmony: ['min7', 'dom7', 'maj7', '13th', 'altered'], lead: ['trumpet', 'tenor-sax', 'piano', 'alto-sax'], response: ['piano', 'trombone', 'trumpet'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums'], moods: ['sophisticated', 'playful', 'energetic', 'mysterious'], scenes: ['city-night', 'late-night'],
    melodyDensity: 72, improvisation: 76, energy: 78, dynamics: 'dynamic', arrangement: 'traditional-sections', production: ['acoustic', 'clean', 'room', 'polished'],
    constraints: ['vocals', 'scat', 'cinematic'], compatibleStyles: ['bebop', 'soul-jazz', 'post-bop'],
  }),
  makeStyle({
    id: 'bebop', name: 'Bebop', nameZh: '快速、複雜、以即興和弦變化為核心', classification: 'historical-style', family: 'bebop',
    descriptionZh: '快速節奏、複雜旋律線和密集和弦變化，適合高即興密度。',
    tempo: { min: 130, max: 300, default: 190 }, groove: [['bebop-swing', 'fast, propulsive bebop swing'], ['up-tempo', 'up-tempo swing with walking bass']],
    tonalities: [['major', 'major tonality with chromatic movement'], ['minor', 'minor tonality'], ['modal', 'modal passing colors']],
    harmony: ['dom7', 'maj7', 'min7', 'altered', 'chromatic'], lead: ['trumpet', 'alto-sax', 'tenor-sax', 'piano'], response: ['piano', 'trumpet', 'tenor-sax'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums'], moods: ['playful', 'sophisticated', 'energetic', 'mysterious'], scenes: ['city-night', 'late-night'],
    melodyDensity: 88, improvisation: 92, energy: 88, dynamics: 'dynamic', arrangement: 'traditional-sections', production: ['acoustic', 'clean', 'room'],
    constraints: ['vocals', 'scat'], compatibleStyles: ['hard-bop', 'swing-jazz', 'brisk-jazz'],
  }),
  makeStyle({
    id: 'post-bop', name: 'Post-Bop', nameZh: '融合 Bebop、Modal 與前衛爵士語彙', classification: 'historical-style', family: 'post-bop',
    descriptionZh: '結合 Bebop、Modal 和更自由的和聲節奏，重視樂團互動與方向變化。',
    tempo: { min: 70, max: 220, default: 132 }, groove: [['post-bop', 'flexible post-bop pulse'], ['medium-swing', 'open medium swing'], ['odd-meter', 'asymmetrical, open groove']],
    tonalities: [['modal', 'open modal tonality'], ['minor', 'minor tonality'], ['major', 'shifting major colors']],
    harmony: ['maj7', 'min7', 'dom7', 'altered', 'modal', 'chromatic'], lead: ['tenor-sax', 'trumpet', 'piano', 'alto-sax'], response: ['piano', 'soprano-sax', 'trumpet'],
    bass: ['upright-bass'], rhythm: ['acoustic-drums'], moods: ['reflective', 'mysterious', 'sophisticated', 'hopeful'], scenes: ['city-night', 'moonlight', 'late-night'],
    melodyDensity: 66, improvisation: 78, energy: 65, dynamics: 'dynamic', arrangement: 'gentle-evolution', production: ['acoustic', 'spacious', 'clean', 'room'],
    constraints: ['vocals', 'scat', 'cinematic'], compatibleStyles: ['modal-jazz', 'hard-bop', 'spiritual-jazz'],
  }),
  makeStyle({
    id: 'jazz-funk', name: 'Jazz-Funk', nameZh: '爵士和聲、即興與 Funk 律動融合', classification: 'historical-derived-style', family: 'jazz-funk',
    descriptionZh: '以重複 Funk groove 和電聲低音為基礎，加入爵士和聲與即興。',
    tempo: { min: 80, max: 150, default: 108 }, groove: [['funk', 'tight, relaxed funk groove'], ['broken-beat', 'syncopated broken-beat feel'], ['light-funk', 'lightly syncopated funk pulse']],
    tonalities: [['minor', 'groove-based minor tonality'], ['modal', 'modal vamp'], ['major', 'warm major tonality']],
    harmony: ['min7', 'dom7', 'sus', 'modal', 'add9'], lead: ['rhodes', 'jazz-electric-guitar', 'trumpet', 'synth'], response: ['rhodes', 'tenor-sax', 'piano'],
    bass: ['electric-bass'], rhythm: ['acoustic-drums', 'congas'], moods: ['playful', 'sophisticated', 'warm', 'energetic'], scenes: ['city-night', 'summer', 'late-night'],
    melodyDensity: 56, improvisation: 58, energy: 72, dynamics: 'gentle-evolution', arrangement: 'continuous', production: ['warm', 'analog', 'clean', 'round-bass'],
    constraints: ['vocals', 'scat', 'dramatic-climax', 'cinematic'], compatibleStyles: ['soul-jazz', 'smooth-jazz', 'fusion'],
  }),
  makeStyle({
    id: 'jazz-fusion', name: 'Jazz Fusion', nameZh: '爵士即興與搖滾、Funk 或電子聲響的融合', classification: 'historical-derived-style', family: 'fusion',
    descriptionZh: '爵士即興和複雜和聲結合搖滾、Funk 或電子樂器，聲響範圍較廣。',
    tempo: { min: 75, max: 210, default: 126 }, groove: [['fusion', 'dynamic fusion groove'], ['funk', 'driving funk-rock pulse'], ['odd-meter', 'precise, asymmetrical groove']],
    tonalities: [['modal', 'modal tonality'], ['minor', 'minor tonality'], ['major', 'shifting major and minor colors']],
    harmony: ['maj7', 'min7', 'sus', '11th', 'altered', 'modal'], lead: ['jazz-electric-guitar', 'synth', 'rhodes', 'trumpet'], response: ['synth', 'tenor-sax', 'piano'],
    bass: ['electric-bass'], rhythm: ['acoustic-drums'], moods: ['energetic', 'mysterious', 'sophisticated', 'playful'], scenes: ['city-night', 'late-night'],
    melodyDensity: 70, improvisation: 78, energy: 82, dynamics: 'dynamic', arrangement: 'traditional-sections', production: ['clean', 'spacious', 'polished'],
    constraints: ['vocals', 'scat'], compatibleStyles: ['jazz-funk', 'nu-jazz', 'post-bop'],
  }),
  makeStyle({
    id: 'nu-jazz', name: 'Nu Jazz', nameZh: '融合電子、Hip-Hop 或 Downtempo 質感的現代爵士', classification: 'modern-descriptor', family: 'nu-jazz',
    descriptionZh: '現代爵士與電子、Hip-Hop 或 Downtempo 製作質感交會，保留即興與聲響探索。',
    tempo: { min: 65, max: 140, default: 96 }, groove: [['downtempo', 'relaxed downtempo groove'], ['broken-beat', 'subtle broken-beat rhythm'], ['soft-straight', 'laid-back straight-eighth pulse']],
    tonalities: [['modal', 'modal colors'], ['minor', 'warm minor tonality'], ['major', 'soft major tonality']],
    harmony: ['maj7', 'min7', 'add9', 'modal', 'sus'], lead: ['rhodes', 'synth', 'jazz-electric-guitar', 'vibraphone'], response: ['ambient-pads', 'piano', 'soprano-sax'],
    bass: ['electric-bass'], rhythm: ['acoustic-drums', 'soft-shaker'], moods: ['dreamy', 'mysterious', 'reflective', 'calm'], scenes: ['city-night', 'rain-window', 'late-night'],
    melodyDensity: 35, improvisation: 40, energy: 38, dynamics: 'stable', arrangement: 'gentle-evolution', production: ['modern-clean', 'spacious', 'airy', 'analog'],
    constraints: ['vocals', 'scat', 'dramatic-climax', 'dense-arrangement'], compatibleStyles: ['fusion', 'jazz-funk', 'cool-jazz'],
  }),
  makeStyle({
    id: 'new-orleans', name: 'New Orleans Jazz', nameZh: '早期 New Orleans 合奏與集體即興傳統', classification: 'historical-style', family: 'traditional',
    descriptionZh: '早期爵士合奏、前線銅管與木管的集體即興、強烈節拍和藍調語彙。',
    tempo: { min: 95, max: 210, default: 142 }, groove: [['two-beat', 'buoyant two-beat traditional jazz pulse'], ['march', 'lively, lightly marching pulse'], ['swing', 'early jazz swing feel']],
    tonalities: [['major', 'bright major tonality'], ['blues', 'blues tonality'], ['major', 'warm major tonality']],
    harmony: ['dom7', 'sixth', 'maj7', 'blues'], lead: ['trumpet', 'clarinet', 'trombone'], response: ['clarinet', 'trombone', 'trumpet'], harmonyInstruments: ['piano'],
    bass: ['tuba', 'upright-bass'], rhythm: ['acoustic-drums'], moods: ['cheerful', 'playful', 'hopeful', 'nostalgic'], scenes: ['city-night', 'bakery', 'summer'],
    melodyDensity: 74, improvisation: 66, energy: 76, dynamics: 'dynamic', arrangement: 'traditional-sections', production: ['acoustic', 'warm', 'room'],
    constraints: ['vocals', 'scat', 'cinematic'], compatibleStyles: ['dixieland', 'swing-jazz'],
  }),
  makeStyle({
    id: 'dixieland', name: 'Dixieland', nameZh: 'Dixieland 前線合奏與集體即興', classification: 'historical-style', family: 'traditional',
    descriptionZh: '以小型合奏、銅管與木管的複調對話及活潑節奏為特色。',
    tempo: { min: 100, max: 220, default: 150 }, groove: [['two-beat', 'buoyant two-beat pulse'], ['swing', 'brisk traditional swing']],
    tonalities: [['major', 'bright major tonality'], ['blues', 'blues tonality']], harmony: ['dom7', 'sixth', 'maj7', 'blues'],
    lead: ['trumpet', 'clarinet', 'trombone'], response: ['clarinet', 'trombone', 'trumpet'], harmonyInstruments: ['piano'], bass: ['tuba', 'upright-bass'], rhythm: ['acoustic-drums'],
    moods: ['cheerful', 'playful', 'nostalgic', 'hopeful'], scenes: ['bakery', 'summer', 'city-night'], melodyDensity: 78, improvisation: 68, energy: 78,
    dynamics: 'dynamic', arrangement: 'traditional-sections', production: ['acoustic', 'warm', 'room'], constraints: ['vocals', 'scat', 'cinematic'],
    compatibleStyles: ['new-orleans', 'swing-jazz'],
  }),
  makeStyle({
    id: 'custom', name: 'Custom', nameZh: '自訂風格描述', classification: 'custom', family: 'custom',
    descriptionZh: '以自己的英文風格描述為主，所有樂器和音樂設定均可自行調整。',
    tempo: { min: 40, max: 240, default: 80 }, groove: [['open', 'open, user-defined groove'], ['soft-straight', 'relaxed straight-eighth groove'], ['light-swing', 'light swing feel']],
    tonalities: [['warm-major', 'warm major tonality'], ['modal', 'modal tonality'], ['minor', 'minor tonality']],
    harmony: ['maj7', 'min7', 'sixth', 'add9'], lead: ['piano', 'nylon-guitar', 'jazz-electric-guitar'], response: ['flugelhorn', 'vibraphone'],
    bass: ['upright-bass'], rhythm: ['brush-drums'], moods: ['warm', 'calm', 'reflective'], scenes: ['quiet-cafe', 'reading-room'],
    melodyDensity: 30, improvisation: 30, energy: 28, dynamics: 'stable', arrangement: 'continuous', production: ['warm', 'acoustic'],
    constraints: ['vocals', 'scat'], compatibleStyles: [],
  }),
];

export const STYLE_BY_ID = new Map(JAZZ_STYLES.map((style) => [style.id, style]));
