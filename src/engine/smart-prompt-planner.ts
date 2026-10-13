import { getStyle } from './recommendation-engine';
import { compilePrompt } from './prompt-compiler';
import { compileSunoSimple } from './suno-simple-compiler';
import type { SunoInterpretation } from './suno-simple-compiler';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { describeSmartIntentZh } from '../i18n/smart-intent-zh-HK';
import type { FocusOverride } from '../i18n/smart-intent-zh-HK';
import type { MusicConfiguration } from '../models/types';

export type PromptProvider = 'flow' | 'suno';
export type VariationStrength = 'conservative' | 'balanced' | 'creative';
export interface SmartPrompt {
  id: 'A' | 'B' | 'C';
  title: string;
  labelZh: string;
  intent: string;
  intentZh: string;
  prompt: string;
}
export interface SmartPromptResult {
  prompts: SmartPrompt[];
  warning?: string;
}

// All three profiles express different PERFORMANCE perspectives without changing
// a single member of MusicConfiguration. Phrases describe existing roles only;
// there is no new instrument, metre, tempo, style, harmony, energy or scene.
const FAMILY_FOCUSES: Record<string, readonly [string, string, string]> = {
  ambient: ['Let a few clear jazz motifs emerge gently between generous pauses.', 'Shape the selected sparse pulse through quiet note placement, not additional layers.', 'Let the existing jazz chord colors linger with open spacing and slow connections.'],
  cozy: ['Shape understated motifs with carefully spaced phrase endings.', 'Let the chosen gentle groove breathe through understated rhythmic articulation.', 'Use tasteful voicing spacing and subtle tonal colour in the existing harmony.'],
  bossa: ['Shape lyrical phrasing around the specified bossa-inspired groove.', 'Make the chosen bossa-inspired accompaniment feel clearly interlocked with the selected groove.', 'Bring out the gentle extended-chord colours without crowding the bossa groove.'],
  cool: ['Make concise, thoughtful melodic gestures that leave room for each specified part.', 'Express the explicitly selected groove with restrained articulation and precisely placed accents.', 'Give the existing harmonic voicings airy, carefully balanced spacing.'],
  swing: ['Give the selected pulse a graceful, clearly shaped theme.', 'Focus on the articulation and momentum of the explicitly selected groove.', 'Build harmonic lift through voicing and phrase placement rather than new parts.'],
  ballad: ['Let the melody unfold with expressive, sustained lyrical contours.', 'Shape the existing gentle pulse with attentive note placement.', 'Give the selected harmonies warm resonance and carefully connected voicings.'],
  modal: ['Develop melodic motifs around the established modal centre.', 'Emphasize the time feel while allowing sustained modal passages to breathe.', 'Explore voicing spacing over the existing modal pedal and harmonic rhythm.'],
  chamber: ['Shape the existing parts as a nuanced chamber-jazz melodic dialogue.', 'Use precisely balanced rhythmic interaction between the selected chamber voices.', 'Clarify the written counterpoint and open harmonic space without extra voices.'],
  smooth: ['Lean into a singing melodic contour without adding competing leads.', 'Let the existing pocket carry the motion with subtle syncopated accents.', 'Highlight silky extended harmony and well-spaced accompaniment.'],
  latin: ['Place melodic phrases deliberately around the selected Latin syncopation.', 'Make the existing clave-related accents and rhythmic interplay more legible.', 'Frame the Latin rhythmic figure with the chosen harmonic colours.'],
  'afro-cuban': ['Develop melodic statements around the existing clave and montuno relationship.', 'Emphasize how the selected rhythmic voices interlock with the clave.', 'Give the existing montuno and tumbao harmonic/rhythmic contour more definition.'],
  gypsy: ['Shape crisp Manouche melodic motifs within the existing guitar-based ensemble.', 'Bring out the selected Manouche rhythmic articulation without adding instruments beyond the configured ensemble.', 'Keep dry compact voicings and clear acoustic ensemble dialogue.'],
  soul: ['Shape the selected blues- and gospel-influenced melodic phrases.', 'Emphasize the pocket and rhythmic accents of the existing soul-jazz groove.', 'Bring out blues/gospel harmonic responses using selected parts only.'],
  'hard-bop': ['Give the configured hard-bop solo language a strong, articulated contour.', 'Bring out the driving swing accents from the selected rhythm section.', 'Highlight the chosen blues-inflected harmony and compact comping.'],
  bebop: ['Emphasize nimble chromatic approach notes and angular bebop phrase contours.', 'Make the existing bebop swing articulation incisive without changing the chosen tempo.', 'Clarify fast harmonic movement through concise selected-voice chord accents.'],
  'post-bop': ['Develop exploratory motifs with the configured improvisational complexity.', 'Create incisive rhythmic interplay without changing the chosen metre or pulse.', 'Shape modern harmonic colour through the existing extended voicings.'],
  'jazz-funk': ['Use short syncopated melodic motifs within the selected funk instrumentation.', 'Highlight the locked straight-16th pocket and precise rhythmic accents.', 'Give the existing electric-jazz voicings crisp, compact definition.'],
  fusion: ['Shape the electric-jazz melodic contour with the configured intensity.', 'Emphasize rhythmic precision in the already selected fusion groove.', 'Frame the selected harmonic extensions with clear ensemble voicings.'],
  'nu-jazz': ['Shape concise modern-jazz motifs from the configured ensemble.', 'Emphasize precise modern groove accents without changing time feel.', 'Give the selected contemporary voicings focused texture and space.'],
  traditional: ['Weave the selected collective front-line voices into a clear ensemble statement.', 'Make the existing two-beat or early-jazz pulse distinctly articulated.', 'Highlight the selected overlapping counterlines without imposing a soloist hierarchy.'],
  'lofi-jazz': ['Shape a soft repeating jazz motif within the chosen low-key setting.', 'Emphasize the configured understated laid-back groove.', 'Let the selected harmony carry the gentle lo-fi texture without new instruments.'],
  'acid-jazz': ['Use compact acid-jazz melodic gestures within the configured ensemble.', 'Lean into the existing funk-derived rhythmic pocket.', 'Make selected extended harmony and syncopated comping interlock.'],
  'big-band': ['Shape a featured phrase within the selected arrangement.', 'Emphasize coordinated ensemble accents around the chosen swing pulse.', 'Bring out sectional harmonic voicings and their arranged response patterns.'],
  'samba-jazz': ['Shape nimble phrasing around the already chosen samba-related pulse.', 'Clarify the chosen samba-jazz rhythmic interlock without additional percussion.', 'Give the selected harmony buoyant, compact voicings over the pulse.'],
  'jazz-waltz': ['Shape a lyrical melodic arc in the chosen metre.', 'Bring forward the existing waltz-influenced articulation while respecting the selected metre.', 'Use the selected harmony to support flowing phrases in the specified metre.'],
  'piano-cafe': ['Give the already selected lead role an intimate, clearly shaped motif.', 'Emphasize the understated café-jazz pulse from the chosen accompaniment.', 'Leave the chosen piano-jazz harmony well spaced and transparent.'],
  'contemporary-jazz': ['Develop a contemporary melodic idea with the specified complexity.', 'Make the existing contemporary groove and rhythmic interplay clearly defined.', 'Frame the chosen modern voicings and harmonic colours with spacious balance.'],
  'free-jazz': ['Explore distinct collective phrase gestures without assigning a permanent lead.', 'Develop exploratory rhythmic dialogue in the chosen metre and collective ensemble.', 'Shape nonfunctional harmonic textures through the chosen overlapping voices.'],
  'jazz-hop': ['Shape a concise jazz motif inside the existing hip-hop-derived feel.', 'Let the selected hip-hop-influenced jazz pocket carry the accents.', 'Keep jazz chords and selected rhythmic texture closely interlocked.'],
  'neo-soul-jazz': ['Develop soulful melodic detail within the chosen neo-soul colours.', 'Focus on the already selected behind-the-beat rhythmic pocket.', 'Let the existing extended voicings flow with delicate connected movement.'],
  'dark-jazz': ['Make the chosen noir melodic gestures feel purposeful and restrained.', 'Shape the existing dark-jazz pulse with deliberate placement and space.', 'Let the configured shadowy harmonic colours linger between phrases.'],
  'third-stream': ['Give the written chamber-jazz melodic material a clear composed contour.', 'Balance the existing jazz rhythm against composed chamber counterpoint.', 'Highlight the selected contrapuntal voices and harmonic development.'],
  custom: ['Develop the selected melodic material with clear internal motifs.', 'Focus on the configured groove and rhythmic placement.', 'Clarify the chosen harmony and spacing of the existing parts.'],
};
const ALTERNATE_DETAILS: readonly [readonly string[], readonly string[], readonly string[]] = [
  ['Repeat a small signature phrase with a measured contour response.', 'Vary the length and shape of the recurring phrase while respecting the chosen density.', 'Let recurring phrase endings provide recognisable continuity.'],
  ['Make the first and last accents of each phrase feel connected to the selected pulse.', 'Use deliberate rests and attacks to define the existing rhythmic pattern.', 'Build rhythmic momentum through articulation rather than additional layers.'],
  ['Let chord spacing and voice connection supply the contrast.', 'Keep transitions between existing harmonic colours coherent and uncluttered.', 'Use the chosen accompaniment voicings as the main source of subtle colour.'],
];
const CONTINUITY_CHOICES = [
  'Revisit the central idea with subtly different attack and placement.',
  'Keep the recurring idea recognisable while connecting each phrase naturally.',
  'Give the interpretation continuity through restrained internal repetition.',
] as const;
const intensityText: Record<VariationStrength, string> = {
  conservative: 'Keep this distinction especially understated.',
  balanced: 'Make this focus audible yet controlled.',
  creative: 'Make this focus distinct through expressive phrasing while respecting the selected energy and all musical settings.',
};

type SmartTarget = SunoInterpretation['target'];

function compileFlowWithInterpretation(configuration: MusicConfiguration, target: SmartTarget, instruction: string): string {
  // Preserve the already-approved Flow compiler exactly; inject the variation into
  // the relevant existing paragraph, not as another footer of instructions.
  const paragraphs = compilePrompt(configuration).split('\n\n');
  const index = target === 'rhythm' ? 1 : paragraphs.length - (target === 'harmony' ? 7 : 6);
  if (!paragraphs[index]) throw new Error('Flow prompt paragraph structure changed');
  paragraphs[index] += ' ' + instruction;
  return paragraphs.join('\n\n');
}

export function generateSmartPrompts(
  configuration: MusicConfiguration,
  provider: PromptProvider = 'suno',
  strength: VariationStrength = 'balanced',
  seed = 0,
): SmartPromptResult {
  const enabled = configuration.instruments.filter(p => p.enabled && INSTRUMENT_BY_ID.has(p.instrumentId));
  if (!enabled.length) return { prompts: [], warning: '請先加入至少一件已啟用的樂器，才可以產生有意義的三個音樂版本。' };
  if (enabled.every(p => p.role === 'rhythm' || p.role === 'texture')) {
    return { prompts: [], warning: '目前只有節奏或質感樂器，未能產生有意義的旋律、節奏及和聲三種變化；請先加入主奏或和聲樂器。' };
  }
  const style = getStyle(configuration.styleId);
  const focuses = FAMILY_FOCUSES[style.family] ?? FAMILY_FOCUSES.custom!;
  const names = ['旋律演繹', '節奏律動', '和聲與空間'] as const;
  const titles = ['Melodic Focus', 'Rhythmic Focus', 'Harmonic Focus'] as const;
  const safeSeed = Number.isSafeInteger(seed) ? Math.abs(seed) : 0;
  const offset = safeSeed % 3;
  const continuityIndex = Math.floor(safeSeed / 3) % CONTINUITY_CHOICES.length;
  const continuity = CONTINUITY_CHOICES[continuityIndex]!;
  const prompts = (['A', 'B', 'C'] as const).map((id, index) => {
    const detailIndex = (offset + index) % 3;
    const detail = ALTERNATE_DETAILS[index]![detailIndex]!;
    const styleFocus = index === 1 && style.family === 'gypsy' && enabled.some(part => part.behaviour.toLowerCase().includes('la pompe'))
      ? 'Bring out the selected la pompe guitar rhythm while retaining all other explicitly selected percussion and accompaniment.'
      : focuses[index]!;
    const focus: SmartTarget = index === 0 ? 'melody' : index === 1 ? 'rhythm' : 'harmony';
    const availableHarmony = enabled.some(part => part.role === 'harmony' || part.role === 'bass');
    const availableRhythm = enabled.some(part => part.role === 'rhythm');
    const safeStyleFocus = focus === 'harmony' && !availableHarmony
      ? 'Shape tonal colour through the existing selected melodic voice, without adding chordal accompaniment.'
      : focus === 'rhythm' && !availableRhythm
        ? 'Shape rhythmic placement using only the selected instruments, without adding a drum or percussion part.'
        : focus === 'rhythm' && !style.grooves.some(g => g.id === configuration.grooveId)
          ? 'Shape rhythmic articulation around the explicitly selected groove rather than a different style groove.'
          : styleFocus;
    const override: FocusOverride = focus === 'harmony' && !availableHarmony ? 'no-harmony'
      : focus === 'rhythm' && !availableRhythm ? 'no-rhythm'
        : focus === 'rhythm' && !style.grooves.some(g => g.id === configuration.grooveId) ? 'custom-groove'
          : index === 1 && style.family === 'gypsy' && enabled.some(part => part.behaviour.toLowerCase().includes('la pompe')) ? 'gypsy-pompe' : 'none';
    const safeDetail = focus === 'harmony' && !availableHarmony
      ? 'Use register, note choice and phrase endings to suggest harmony without chordal accompaniment.'
      : detail;
    const intent = safeStyleFocus + ' ' + safeDetail + ' ' + continuity + ' ' + intensityText[strength];
    const intentZh = describeSmartIntentZh(style.family, index, detailIndex, continuityIndex, strength, override);
    return {
      id, title: titles[index]!, labelZh: names[index]!, intent, intentZh,
      prompt: provider === 'suno'
        ? compileSunoSimple(configuration, { target: focus, instruction: intent })
        : compileFlowWithInterpretation(configuration, focus, intent),
    };
  });
  if (new Set(prompts.map(p => p.intent)).size !== 3) return { prompts: [], warning: '目前設定無法產生三個可區分的演奏方向。' };
  return { prompts };
}
