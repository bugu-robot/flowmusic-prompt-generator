import { CONSTRAINTS, HARMONY_BY_ID, MOODS, PRODUCTION, SCENES, TONALITIES } from '../data/options';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { trackDurationPrompt } from '../data/track-duration';
import { getStyle, recommendConfiguration } from './recommendation-engine';
import { normalizeConfiguration } from '../storage/local-storage';
import type { MusicConfiguration } from '../models/types';

const join = (items: string[]): string => items.join(', ');
const clean = (value: string): string => value.trim().replace(/\s+/g, ' ').replace(/[. ]+$/g, '');
const english = (value: unknown): value is string => typeof value === 'string' && !/[\u3400-\u9fff<>]/u.test(value);
const labelForRole: Record<MusicConfiguration['instruments'][number]['role'], string> = {
  lead: 'lead', response: 'response', countermelody: 'countermelody',
  harmony: 'harmony', bass: 'bass', rhythm: 'rhythm', texture: 'texture',
};

// One natural-language prompt for the Suno Simple text box. No Suno Custom, Exclude,
// Lyrics or provider-specific controls are added; all selections remain positive
// musical guidance with a short final instrumental/instrumentation restriction.
export function compileSunoSimple(input: MusicConfiguration | Partial<MusicConfiguration> | null | undefined): string {
  const normalized = normalizeConfiguration(input);
  const recommended = recommendConfiguration(normalized?.styleId ?? 'cozy-jazz');
  const explicitParts = typeof input === 'object' && input !== null && Array.isArray(input.instruments);
  const config = normalized
    ? { ...recommended, ...normalized, instruments: explicitParts ? normalized.instruments : recommended.instruments }
    : recommended;
  const style = getStyle(config.styleId);
  const opening = style.id === 'custom' && english(config.customStyleName) && clean(config.customStyleName)
    ? clean(config.customStyleName) : style.name;
  const influence = config.secondaryStyleId ? ' with subtle ' + getStyle(config.secondaryStyleId).name + ' influence' : '';
  const groove = style.grooves.find(g => g.id === config.grooveId)
    ?? JAZZ_STYLES.flatMap(s => s.grooves).find(g => g.id === config.grooveId);
  const meter = config.meter === 'custom' ? config.customMeter ?? '4/4' : config.meter;
  const tonality = style.tonalities.find(t => t.id === config.tonalityId)?.prompt
    ?? TONALITIES.find(t => t.id === config.tonalityId)?.prompt ?? 'jazz tonality';
  const key = config.key && config.key !== 'auto' ? ' in ' + config.key : '';
  const moods = config.moodIds.map(id => MOODS.find(x => x.id === id)?.prompt).filter((v): v is string => !!v).slice(0, 4);
  const scene = config.sceneId === 'custom' && english(config.customSceneName) && clean(config.customSceneName)
    ? clean(config.customSceneName) : SCENES.find(x => x.id === config.sceneId)?.prompt ?? 'a quiet café';

  const active = config.instruments.filter(part => part.enabled && INSTRUMENT_BY_ID.has(part.instrumentId));
  const names = [...new Set(active.map(part => INSTRUMENT_BY_ID.get(part.instrumentId)!.wording))];
  const parts = active.map(part => {
    const name = INSTRUMENT_BY_ID.get(part.instrumentId)!.wording;
    const behaviour = clean(part.behaviour);
    return name + ' (' + labelForRole[part.role] + ')' + (behaviour ? ': ' + behaviour : '');
  });
  const harm = config.harmonyIds.map(id => HARMONY_BY_ID.get(id)?.prompt).filter((v): v is string => !!v).slice(0, 6);
  const harmony = harm.length ? join(harm) + ' harmony' : 'jazz harmony';
  const interaction = style.id === 'free-jazz'
    ? 'Coherent collective improvisation with no permanent lead hierarchy.'
    : ['new-orleans', 'dixieland'].includes(style.id)
      ? 'Maintain interlocking collective front-line improvisation, with overlapping voices only from the selected instruments.'
      : style.id === 'big-band'
        ? (['trumpet','trombone'].some(id => active.some(p => p.instrumentId === id)) && active.some(p => p.instrumentId.includes('sax'))
          ? 'Use coordinated arranged sections and sectional call-and-response around one featured soloist.'
          : 'Use arranged sectional phrasing only among the selected parts.')
        : config.foregroundRule === 'collective'
          ? 'Keep coherent overlapping collective lines from the selected instruments.'
          : config.foregroundRule === 'gentle'
            ? 'Gentle call-and-response between selected instruments.'
            : 'Only one foreground melodic voice at a time.';
  const density = config.melodyDensity < 30 ? 'sparse' : config.melodyDensity > 75 ? 'dense and active' : 'moderately spaced';
  const improvisation = config.improvisation < 25 ? 'minimal' : config.improvisation > 75 ? 'high' : 'measured';
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
  const production = config.productionIds.map(id => PRODUCTION.find(p => p.id === id)?.prompt).filter((v): v is string => !!v).slice(0, 5);
  const exclusions = config.constraintIds.map(id => CONSTRAINTS.find(c => c.id === id)?.prompt).filter((v): v is string => !!v);
  const openingParagraph = 'Instrumental ' + opening + influence + ', ' + config.tempo + ' BPM in ' + meter
    + ', ' + (groove?.prompt ?? 'relaxed jazz groove') + '. ' + (moods.length ? join(moods) + ' mood. ' : '')
    + 'A ' + scene + ' atmosphere.';
  const ensembleParagraph = names.length
    ? 'Use only these instruments: ' + join(names) + '. ' + parts.join('; ') + '.'
    : 'No instruments are selected; do not invent an ensemble.';
  const musicParagraph = 'Keep ' + tonality + key + ' with ' + harmony + '. '
    + (style.harmonyGuidance ? clean(style.harmonyGuidance) + '. ' : '')
    + density + ' melodic phrasing and ' + improvisation + ' improvisation. '
    + interaction + ' ' + (dynamics ?? 'controlled dynamics') + ', ' + (structure ?? 'natural arrangement') + '.';
  const closing = (production.length ? 'Recording: ' + join(production) + '. ' : '')
    + trackDurationPrompt(config.trackDurationId) + ' No vocals or singing. '
    + 'No instruments beyond the listed ensemble, including additional percussion.'
    + (exclusions.length ? ' Avoid ' + join(exclusions) + '.' : '');
  return [openingParagraph, ensembleParagraph, musicParagraph, closing].join('\n\n');
}
