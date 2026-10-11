import type { VariationStrength } from '../engine/smart-prompt-planner';

// Local, human-authored translations for every genre-family interpretation.
// Never auto-translate the provider input; it must remain identical English.
export const FAMILY_FOCUS_ZH: Record<string, readonly [string, string, string]> = {
  cozy: ['以克制旋律動機及細緻樂句結尾，塑造柔和的音樂線條。', '用低調的節奏演繹，為已選的輕柔律動保留呼吸空間。', '著重原有和聲的聲部間距及細微音色變化。'],
  bossa: ['圍繞已選 Bossa 律動，以抒情樂句帶動旋律。', '強調所選 Bossa 伴奏中互相扣連的切分節奏。', '突出柔和延伸和弦的色彩，同時保持 Bossa 律動疏朗。'],
  cool: ['以精簡而從容的旋律，為各聲部留出位置。', '精準處理克制的 Swing 重音及節奏落點。', '讓原有和聲以通透、平衡的聲部排列呈現。'],
  swing: ['令已選 Swing 節奏中的主題旋律優雅而清晰。', '著重原有 Swing 律動的咬字與推進感。', '藉聲部安排與樂句位置營造和聲起伏，不加入新樂器。'],
  ballad: ['讓抒情旋律沿著長而具表情的線條自然展開。', '細緻處理原有柔和脈動的音符落點。', '以連貫和弦聲部營造溫暖共鳴。'],
  modal: ['圍繞既定調式中心發展旋律動機。', '維持既定拍感，讓持續的調式樂段自然呼吸。', '在現有調式持續低音與和聲節奏中調整聲部間距。'],
  chamber: ['令已選室內爵士聲部之間的旋律對答更細膩。', '精準平衡已選室內樂聲部的節奏互動。', '理順既有對位旋律及和聲空間，不增加聲部。'],
  smooth: ['強調連貫如歌的旋律線，但不增加競爭主奏。', '以微妙切分重音加強原有穩定律動。', '突出柔滑延伸和聲與疏朗伴奏。'],
  latin: ['配合已選拉丁切分節奏，仔細安排旋律進出。', '使原有 Clave 相關重音及節奏互動更清楚。', '以既定和聲色彩襯托拉丁節奏型。'],
  'afro-cuban': ['圍繞既定 Clave 與 Montuno 關係發展旋律。', '凸顯已選節奏聲部如何與 Clave 互相扣連。', '加強原有 Montuno 與 Tumbao 的和聲和節奏輪廓。'],
  gypsy: ['用俐落的 Manouche 旋律動機帶出原有結他編制。', '突出已選 Manouche 律動的節奏發音，不增加編制以外的樂器。', '維持乾爽緊湊的和弦與清晰的原聲樂器對答。'],
  soul: ['將選定的藍調與福音色彩融入旋律線條。', '突出原有 Soul Jazz 的律動與節奏重音。', '只用已選聲部帶出藍調及福音式的和聲回應。'],
  'hard-bop': ['以清晰有力的樂句突出指定 Hard Bop 即興語彙。', '凸顯已選節奏組的推進感及 Swing 重音。', '突出藍調色彩和聲與緊湊的和弦伴奏。'],
  bebop: ['以靈巧半音趨近音及轉折樂句突出 Bebop 線條。', '令現有 Bebop Swing 咬字更加俐落，但不改變設定速度。', '以已選聲部的簡潔和弦重音理清快速和聲變化。'],
  'post-bop': ['按既定即興複雜度發展具探索性的旋律動機。', '加強節奏聲部的靈活互動，不更改拍號或速度。', '以原有延伸和弦排列帶出現代和聲色彩。'],
  'jazz-funk': ['以短促切分旋律動機呼應既定 Funk 編制。', '突出原有直十六分節奏與精準重音。', '讓現有電聲爵士和弦排列更緊湊俐落。'],
  fusion: ['按原定強度塑造電聲爵士旋律。', '加強既定 Fusion 律動中的節奏精準度。', '讓已選延伸和聲以清晰聲部方式呈現。'],
  'nu-jazz': ['以精簡的現代爵士動機表現已選編制。', '突出既定現代律動的重音，不改變拍感。', '加強已選當代和弦與音色之間的空間感。'],
  traditional: ['將已選前線聲部交織成清晰的群體旋律。', '清楚帶出原有二拍或早期爵士的節奏律動。', '突出既有對位旋律，不強加獨奏主從關係。'],
  'lofi-jazz': ['在原定低調氣氛中塑造柔和、重複的爵士動機。', '突出已選放鬆而克制的節奏律動。', '讓原有和聲帶出輕柔 Lo-fi 質感，不加入新樂器。'],
  'acid-jazz': ['以緊湊 Acid Jazz 旋律動機配合現有編制。', '突出原定 Funk 衍生節奏中的律動。', '讓已選延伸和聲與切分伴奏互相扣連。'],
  'big-band': ['在已選編曲中突出演奏主題樂句。', '加強既定 Swing 節奏中的合奏重音。', '突出既有分部和聲及編曲回應。'],
  'samba-jazz': ['在既定 Samba 節奏上塑造靈巧旋律。', '理清已選 Samba Jazz 節奏聲部互動，不加額外敲擊樂。', '讓既有和聲配合活潑節奏，以緊湊和弦呈現。'],
  'jazz-waltz': ['依照已選拍號塑造抒情旋律弧線。', '突出既有 Waltz 式咬字，同時尊重選定拍號。', '以所選和聲支持流暢樂句，維持原定拍號。'],
  'piano-cafe': ['令已選主奏聲部演繹親密而清晰的旋律動機。', '突出原有伴奏中的低調 Café Jazz 律動。', '讓所選鋼琴爵士和聲保持通透與留白。'],
  'contemporary-jazz': ['按既定複雜度發展現代爵士旋律。', '使原有當代爵士節奏與聲部互動更明確。', '以寬鬆平衡的方式呈現已選現代和弦色彩。'],
  'free-jazz': ['探索不同群奏樂句，不指定永久主奏。', '在已選拍號與群體編制內進行探索性的節奏對話。', '透過已選聲部交疊營造非功能性和聲質感。'],
  'jazz-hop': ['在既定 Hip-Hop 衍生拍感中塑造精簡爵士動機。', '以原有 Hip-Hop 爵士節奏帶動重音。', '讓爵士和弦與已選節奏質感緊密配合。'],
  'neo-soul-jazz': ['以富靈魂感的旋律展現已選 Neo-Soul 色彩。', '聚焦已選稍稍落後拍子的深沉律動。', '讓現有延伸和弦以細膩、連貫方式流動。'],
  'dark-jazz': ['使已選 Noir Jazz 旋律克制而目的清晰。', '以審慎的節奏落點與留白塑造既定暗色爵士拍感。', '讓已選較陰暗的和聲色彩在樂句之間延續。'],
  'third-stream': ['清晰呈現室內爵士編曲中既有的作曲式旋律。', '平衡原有爵士節奏與室內樂對位。', '突出已選對位聲部及和聲發展。'],
  custom: ['以清晰動機發展所選旋律素材。', '集中處理已選律動及節奏落點。', '理順原有和聲與聲部間距。'],
};
export const DETAILS_ZH: readonly [readonly string[], readonly string[], readonly string[]] = [
  ['以細微輪廓回應重複出現的標誌性短句。','在原定旋律密度內調整重複樂句的長短與形狀。','讓重複樂句的結尾維持可辨識的連貫性。'],
  ['讓樂句頭尾的重音配合已選節拍。','運用審慎的休止與起音，理清原有節奏型。','透過節奏咬字而非新增聲部，建立推進感。'],
  ['以和弦間距與聲部連接營造變化。','讓既有和聲色彩之間的轉換連貫、簡潔。','以已選伴奏和弦排列，帶出細微音色差異。'],
];
export const CONTINUITY_ZH = [
  '以略有不同的起音及落點重現中心動機。',
  '保持重複動機清晰可辨，同時自然連接樂句。',
  '透過克制的內部重複，維持整體連貫。',
] as const;
export const STRENGTH_ZH: Record<VariationStrength, string> = {
  conservative: '將差異控制得非常細微。',
  balanced: '令演奏重點聽得出來，但保持克制。',
  creative: '以更鮮明的表情與樂句突出差異，但維持已選能量與所有音樂設定。',
};
export type FocusOverride = 'none' | 'gypsy-pompe' | 'no-harmony' | 'no-rhythm' | 'custom-groove';
const OVERRIDE_ZH: Record<Exclude<FocusOverride, 'none'>, string> = {
  'gypsy-pompe': '突出已選 La Pompe 結他律動，同時保留全部已選敲擊與伴奏樂器。',
  'no-harmony': '以現有旋律聲部塑造音色變化，不增加和弦伴奏。',
  'no-rhythm': '只使用已選樂器調整節奏落點，不加入鼓或其他敲擊聲部。',
  'custom-groove': '按照明確選定的律動調整節奏咬字，不改用其他風格律動。',
};
export function describeSmartIntentZh(
  family: string, index: number, detailIndex: number, continuityIndex: number,
  strength: VariationStrength, override: FocusOverride,
): string {
  const focus = override === 'none'
    ? (FAMILY_FOCUS_ZH[family] ?? FAMILY_FOCUS_ZH.custom)![index]!
    : OVERRIDE_ZH[override];
  const detail = override === 'no-harmony'
    ? '運用音域、選音與樂句結尾暗示和聲，不增加和弦伴奏。'
    : DETAILS_ZH[index]![detailIndex]!;
  return [focus, detail, CONTINUITY_ZH[continuityIndex]!, STRENGTH_ZH[strength]].join(' ');
}
