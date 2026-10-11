import { CONSTRAINTS, HARMONY_BY_ID, MOODS, PRODUCTION, SCENES, TONALITIES } from '../data/options';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { trackDurationPrompt } from '../data/track-duration';
import { getStyle, recommendConfiguration } from './recommendation-engine';
import { normalizeConfiguration } from '../storage/local-storage';
import type { MusicConfiguration } from '../models/types';

const join = (items: string[]): string => items.join(', ');
const capitalise = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
const degree = (value: number, low: number, high: number, labels: readonly [string, string, string]): string =>
  value <= low ? labels[0] : value >= high ? labels[2] : labels[1];

export interface SunoInterpretation {
  target: 'melody' | 'rhythm' | 'harmony';
  instruction: string;
}

function instrumentSentence(name: string, role: MusicConfiguration['instruments'][number]['role'], behaviour: string, prominence: number, alternateLead: boolean): string {
  const action: Record<MusicConfiguration['instruments'][number]['role'], string> = {
    lead: 'leads', response: 'responds', countermelody: 'weaves a countermelody',
    harmony: 'supports the harmony', bass: 'anchors the bass line',
    rhythm: 'maintains the pulse', texture: 'adds background texture',
  };
  const emphasis = prominence < 35 ? 'very quietly' : prominence < 65 ? 'subtly' : prominence > 82 ? 'prominently' : 'clearly';
  const verb = alternateLead ? 'takes alternating featured lead turns' : action[role];
  return capitalise(name) + ' ' + verb + ' ' + emphasis + (behaviour ? ' with ' + behaviour : '') + '.';
}
const tempoFeel: Record<MusicConfiguration['tempoFeelId'], string> = { auto: 'tempo-appropriate', 'very-slow': 'very slow', 'very-relaxed': 'very relaxed', relaxed: 'relaxed', moderate: 'moderate', brisk: 'brisk', fast: 'fast' };
const clean = (value: string): string => value.trim().replace(/\s+/g, ' ').replace(/[. ]+$/g, '');
const english = (value: unknown): value is string => typeof value === 'string' && !/[\u3400-\u9fff<>]/u.test(value);

// One natural-language prompt for the Suno Simple text box. No Suno Custom, Exclude,
// Lyrics or provider-specific controls are added; all selections remain positive
// musical guidance with a short final instrumental/instrumentation restriction.
export function compileSunoSimple(input: MusicConfiguration | Partial<MusicConfiguration> | null | undefined, interpretation?: SunoInterpretation): string {
  const normalized = normalizeConfiguration(input);
  const recommended = recommendConfiguration(normalized?.styleId ?? 'cozy-jazz');
  const explicitParts = typeof input === 'object' && input !== null && Array.isArray(input.instruments);
  const config = normalized
    ? { ...recommended, ...normalized, instruments: explicitParts ? normalized.instruments : recommended.instruments }
    : recommended;
  const style = getStyle(config.styleId);
  const opening = style.id === 'custom'
    ? (english(config.customStyleName) && clean(config.customStyleName) ? clean(config.customStyleName) : 'user-defined jazz')
    : style.name;
  const influence = config.secondaryStyleId ? ' with subtle ' + getStyle(config.secondaryStyleId).name + ' influence' : '';
  const groove = style.grooves.find(g => g.id === config.grooveId)
    ?? JAZZ_STYLES.flatMap(s => s.grooves).find(g => g.id === config.grooveId);
  const meter = config.meter === 'custom' ? config.customMeter ?? '4/4' : config.meter;
  const tonality = style.tonalities.find(t => t.id === config.tonalityId)?.prompt
    ?? TONALITIES.find(t => t.id === config.tonalityId)?.prompt ?? 'jazz tonality';
  const key = config.key && config.key !== 'auto' ? ' in ' + config.key : '';
  const moods = config.moodIds.map(id => MOODS.find(x => x.id === id)?.prompt).filter((v): v is string => !!v);
  const scene = config.sceneId === 'custom' && english(config.customSceneName) && clean(config.customSceneName)
    ? clean(config.customSceneName) : SCENES.find(x => x.id === config.sceneId)?.prompt ?? 'a quiet café';

  const active = config.instruments.filter(part => part.enabled && INSTRUMENT_BY_ID.has(part.instrumentId));
  const names = [...new Set(active.map(part => INSTRUMENT_BY_ID.get(part.instrumentId)!.wording))];
  const primaryLead = active.filter(part => part.role === 'lead').sort((a, b) => b.prominence - a.prominence)[0];
  const parts = active.map(part => {
    const name = INSTRUMENT_BY_ID.get(part.instrumentId)!.wording;
    const behaviour = clean(part.behaviour);
    // Single-foreground mode alternates lead turns rather than reassigning any selected role.
    const alternateLead = part.role === 'lead' && part !== primaryLead && config.foregroundRule === 'single';
    return instrumentSentence(name, part.role, behaviour, part.prominence, alternateLead);
  });
  const harm = config.harmonyIds.map(id => HARMONY_BY_ID.get(id)?.prompt).filter((v): v is string => !!v);
  const harmony = harm.length ? join(harm) + ' harmony' : 'jazz harmony';
  const interaction = config.foregroundRule === 'single'
    ? 'Only one foreground melodic voice at a time.'
    : config.foregroundRule === 'gentle'
      ? 'Gentle call-and-response between selected instruments.'
      : style.id === 'free-jazz'
        ? 'Coherent collective improvisation with no permanent lead hierarchy.'
        : ['new-orleans', 'dixieland'].includes(style.id)
          ? 'Maintain interlocking collective front-line improvisation, with overlapping voices only from the selected instruments.'
          : style.id === 'big-band'
            ? (['trumpet','trombone'].some(id => active.some(p => p.instrumentId === id)) && active.some(p => p.instrumentId.includes('sax'))
              ? 'Use coordinated arranged sections and sectional call-and-response around one featured soloist.'
              : 'Use arranged sectional phrasing only among the selected parts.')
            : 'Keep coherent overlapping collective lines from the selected instruments.';
  const density = degree(config.melodyDensity, 30, 76, ['sparse and understated', 'moderately spaced', 'active and intricate']);
  const improvisation = degree(config.improvisation, 25, 76, ['minimal', 'measured', 'expressive and adventurous']);
  const energy = degree(config.energy, 25, 76, ['very restrained', 'moderate', 'confident and energetic']);
  const complexity = {
    minimal: 'minimal', simple: 'simple', moderate: 'moderately developed',
    complex: 'complex', virtuosic: 'virtuosic',
  }[config.melodyComplexity];
  const phrases = { short: 'short motifs', medium: 'balanced phrases', long: 'long, flowing phrases' }[config.phraseLength];
  const breathing = { high: 'generous breathing space', medium: 'natural breathing space', low: 'closely connected phrases' }[config.breathingSpace];
  const dynamics = {
    'very-stable': 'very soft, steady dynamics',
    stable: 'consistent restrained dynamics',
    'gentle-evolution': 'gently evolving dynamics',
    'gradual-build': 'a gradual controlled build',
    dynamic: 'expressive dynamic contrast',
  }[config.dynamics];
  const structure = {
    continuous: 'continuous background-friendly arrangement',
    'gentle-evolution': 'gradually evolving arrangement with a natural return',
    'traditional-sections': 'theme, concise solos and a return to the theme',
    custom: 'natural well-connected arrangement sections',
  }[config.structure];
  const production = config.productionIds.map(id => PRODUCTION.find(p => p.id === id)?.prompt).filter((v): v is string => !!v);
  const exclusions = config.constraintIds.map(id => CONSTRAINTS.find(c => c.id === id)?.prompt).filter((v): v is string => !!v);
  const openingParagraph = 'Instrumental ' + opening + influence + ', ' + config.tempo + ' BPM in ' + meter
    + ', ' + (groove?.prompt ?? 'relaxed jazz groove')
    + (config.tempoFeelId === 'auto' ? '' : ', ' + tempoFeel[config.tempoFeelId] + ' feel')
    + '. ' + (moods.length ? join(moods) + ' mood. ' : '')
    + 'A ' + scene + ' atmosphere.'
    + (interpretation?.target === 'rhythm' ? ' ' + interpretation.instruction : '');
  const ensembleParagraph = names.length
    ? 'Use only these instruments: ' + join(names) + '. ' + parts.join(' ')
    : 'No instruments are selected; do not invent an ensemble.';
  const harmonySentence = 'Harmony: ' + tonality + key + ' with ' + harmony + '. '
    + (style.harmonyGuidance ? clean(style.harmonyGuidance) + '. ' : '')
    + (interpretation?.target === 'harmony' ? interpretation.instruction + ' ' : '');
  const melodySentence = 'Melody: ' + density + ', ' + complexity + ' ' + phrases + ', '
    + breathing + ', ' + improvisation + ' improvisation and ' + energy + ' energy. '
    + (interpretation?.target === 'melody' ? interpretation.instruction + ' ' : '');
  const musicParagraph = harmonySentence + melodySentence + interaction + ' '
    + (dynamics ?? 'controlled dynamics') + ', ' + (structure ?? 'natural arrangement') + '.';
  const closing = (production.length ? 'Recording: ' + join(production) + '. ' : '')
    + trackDurationPrompt(config.trackDurationId) + ' No vocals or singing. '
    + 'No instruments beyond the listed ensemble, including additional percussion.'
    + (exclusions.length ? ' Avoid ' + join(exclusions) + '.' : '');
  return [openingParagraph, ensembleParagraph, musicParagraph, closing].join('\n\n');
}
