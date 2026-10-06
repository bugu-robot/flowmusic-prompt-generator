import { CONSTRAINTS, HARMONY_BY_ID, MOODS, OPTION_BY_ID, PRODUCTION, SCENES, TONALITIES } from '../data/options';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { getStyle, recommendConfiguration } from './recommendation-engine';
import { FLOW_PROMPT_RULES } from './prompt-rules';
import { normalizeConfiguration } from '../storage/local-storage';
import type { InstrumentPart, MusicConfiguration } from '../models/types';

const MOOD_BY_ID = OPTION_BY_ID(MOODS);
const SCENE_BY_ID = OPTION_BY_ID(SCENES);
const PRODUCTION_BY_ID = OPTION_BY_ID(PRODUCTION);
const CONSTRAINT_BY_ID = OPTION_BY_ID(CONSTRAINTS);
const TONALITY_BY_ID = OPTION_BY_ID(TONALITIES);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const asList = (items: string[]) => items.length < 2 ? items.join('') : items.length === 2 ? items[0] + ' and ' + items[1] : items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim();
}

function addModifiers(base: string, modifiers: string[]): string {
  const words = new Set(base.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? []);
  const missing = modifiers.filter((modifier) => !modifier.toLocaleLowerCase().split(/\s+/).every((word) => words.has(word)));
  return [...missing, base].filter(Boolean).join(' ');
}

function isEnglish(value: string): boolean {
  return !/[\u3400-\u9fff]/u.test(value);
}

function roleOrder(part: InstrumentPart): number {
  const order: Record<InstrumentPart['role'], number> = { lead: 0, response: 1, countermelody: 2, harmony: 3, bass: 4, rhythm: 5, texture: 6 };
  return order[part.role];
}

function describePart(part: InstrumentPart, isAdditionalLead: boolean): string | undefined {
  const instrument = INSTRUMENT_BY_ID.get(part.instrumentId);
  if (!instrument || !part.enabled) return undefined;
  const name = instrument.wording;
  const plainName = name.replace(/^(very soft|soft|light) /, '');
  const behaviour = clean(part.behaviour) || instrument.behaviours[0] || '';
  const role = isAdditionalLead ? 'response' : part.role;
  const restrained = part.prominence < 35;
  switch (role) {
    case 'lead':
      return name[0]!.toUpperCase() + name.slice(1) + ' carries the main melodic voice with ' + (behaviour || 'clear, measured phrases') + '.';
    case 'response':
      return (restrained ? 'A very soft ' : 'A soft ') + plainName + ' enters occasionally with ' + (behaviour || 'short, gentle responses') + ', never competing with the lead.';
    case 'countermelody':
      return name[0]!.toUpperCase() + name.slice(1) + ' offers a restrained countermelody between lead phrases.';
    case 'harmony':
      return name[0]!.toUpperCase() + name.slice(1) + ' supports the harmony with ' + (behaviour || 'soft, spacious voicings') + '.';
    case 'bass':
      return name[0]!.toUpperCase() + name.slice(1) + ' provides ' + (behaviour || 'a warm, restrained foundation') + '.';
    case 'rhythm':
      return (restrained ? 'A very soft ' : 'A light ') + plainName + ' maintains ' + (behaviour || 'a subtle, steady pulse') + '.';
    case 'texture':
      return (restrained ? 'A barely audible ' : 'A subtle ') + name + ' adds gentle background colour without obscuring the ensemble.';
  }
}

function melodyDescription(configuration: MusicConfiguration): string {
  const density = clamp(configuration.melodyDensity, 0, 100);
  const densityText = density <= 20 ? 'very sparse' : density <= 40 ? 'sparse and understated' : density <= 65 ? 'moderately spacious' : density <= 82 ? 'active' : 'busy';
  const phrase = { short: 'short motifs', medium: 'balanced phrases', long: 'long, flowing phrases' }[configuration.phraseLength];
  const space = { high: 'long pauses and generous breathing space', medium: 'natural pauses and breathing space', low: 'short transitions between phrases' }[configuration.breathingSpace];
  const complexity = { minimal: 'minimal', simple: 'simple', moderate: 'moderately developed', complex: 'complex', virtuosic: 'virtuosic' }[configuration.melodyComplexity];
  const improvisation = clamp(configuration.improvisation, 0, 100);
  const improvText = improvisation < 20 ? 'very little improvisation' : improvisation < 45 ? 'subtle improvisation' : improvisation < 72 ? 'measured improvisation' : 'expressive improvisation';
  const densityDetail = density <= 25 ? 'very low information density' : density <= 40 ? 'low information density' : '';
  const detailParts = [phrase, space, densityDetail, improvText].filter(Boolean);
  const line = 'Keep the melody ' + densityText + ' and ' + complexity + ', with ' + asList(detailParts) + '.';
  const interaction = configuration.foregroundRule === 'gentle'
    ? 'Allow gentle call-and-response between instruments, leaving space around each phrase.'
    : configuration.foregroundRule === 'collective'
      ? 'Allow restrained ensemble interaction while keeping each part distinct.'
      : 'Only one foreground melodic voice at a time.';
  return line + ' ' + interaction;
}

function tempoFeel(configuration: MusicConfiguration): string {
  const labels: Record<Exclude<MusicConfiguration['tempoFeelId'], 'auto'>, string> = {
    'very-slow': 'extremely slow',
    'very-relaxed': 'very relaxed',
    relaxed: 'relaxed',
    moderate: 'moderate',
    brisk: 'brisk',
    fast: 'fast',
  };
  if (configuration.tempoFeelId !== 'auto') return labels[configuration.tempoFeelId];
  if (configuration.tempo < 48) return labels['very-slow'];
  if (configuration.tempo < 70) return labels['very-relaxed'];
  if (configuration.tempo < 100) return labels.relaxed;
  if (configuration.tempo < 138) return labels.moderate;
  if (configuration.tempo < 180) return labels.brisk;
  return labels.fast;
}

function dynamicsDescription(id: string, energy: number): string {
  const descriptions: Record<string, string> = {
    'very-stable': 'Keep the dynamics very soft and nearly unchanged throughout.',
    stable: 'Maintain soft, restrained and consistent dynamics throughout.',
    'gentle-evolution': 'Maintain gentle dynamics with only subtle changes in intensity.',
    'gradual-build': 'Build gradually and naturally, without a sudden increase in loudness.',
    dynamic: 'Use expressive dynamic contrast while keeping transitions musical and controlled.',
  };
  const byEnergy = energy < 25 ? 'Keep the overall energy very restrained. ' : energy > 78 ? 'Use confident energy without harshness. ' : '';
  return byEnergy + (descriptions[id] ?? descriptions.stable!);
}

function arrangementDescription(id: string): string {
  const descriptions: Record<string, string> = {
    continuous: 'Keep a continuous, even arrangement suitable for background listening, without abrupt section changes.',
    'gentle-evolution': 'Begin sparsely, gradually introduce the ensemble, maintain a calm central section with subtle instrumental variation, then return naturally to a quieter ending.',
    'traditional-sections': 'Use a clear theme, concise solo passages and a natural return to the theme, with no abrupt transitions.',
    custom: 'Develop the arrangement naturally with clear transitions and room for the instruments to breathe.',
  };
  return descriptions[id] ?? descriptions.continuous!;
}

function constraintSentence(configuration: MusicConfiguration): string {
  const selected = unique(configuration.constraintIds)
    .map((id) => CONSTRAINT_BY_ID.get(id)?.prompt)
    .filter((value): value is string => Boolean(value) && value !== 'vocals' && value !== 'scat singing')
    .slice(0, 20);
  const groups = [
    { ids: ['flashy solos', 'virtuosic runs'], sentence: 'Avoid flashy solos and virtuosic runs.' },
    { ids: ['busy fills', 'aggressive percussion'], sentence: 'Keep fills and percussion restrained.' },
    { ids: ['a dramatic climax', 'large crescendos'], sentence: 'Avoid a dramatic climax or large crescendos.' },
    { ids: ['a dense arrangement', 'cinematic orchestration'], sentence: 'Keep the arrangement uncluttered and non-cinematic.' },
    { ids: ['electronic instruments', 'heavy bass', 'bright brass', 'complex chromatic runs'], sentence: 'Avoid electronic textures, heavy bass and overly bright brass or chromatic runs.' },
  ];
  const selectedSentences = groups.filter((group) => group.ids.some((id) => selected.includes(id)))
    .slice(0, FLOW_PROMPT_RULES.maxOptionalNegativeConstraints)
    .map((group) => group.sentence);
  return ['Instrumental only, no vocals.', ...selectedSentences].join(' ');
}

export function compilePrompt(input: MusicConfiguration | Partial<MusicConfiguration> | null | undefined): string {
  const normalized = normalizeConfiguration(input);
  const recommendation = recommendConfiguration(normalized?.styleId ?? 'cozy-jazz');
  const hasExplicitInstrumentList = typeof input === 'object' && input !== null && Array.isArray(input.instruments);
  const configuration = normalized
    ? { ...recommendation, ...normalized, instruments: hasExplicitInstrumentList ? normalized.instruments : recommendation.instruments }
    : recommendation;
  const style = getStyle(configuration.styleId);
  const influence = configuration.secondaryStyleId ? getStyle(configuration.secondaryStyleId).name : '';
  const opening = configuration.styleId === 'custom'
    ? (configuration.customStyleName && isEnglish(configuration.customStyleName) ? clean(configuration.customStyleName) : 'User-defined jazz') + (influence ? ' with a subtle ' + influence + ' influence.' : ' with a relaxed jazz character.')
    : clean(style.promptStyle ?? style.name) + (influence ? ' with a subtle ' + influence + ' influence.' : '.');

  const groove = style.grooves.find((item) => item.id === configuration.grooveId)?.prompt
    ?? JAZZ_STYLES.flatMap((candidate) => candidate.grooves).find((item) => item.id === configuration.grooveId)?.prompt
    ?? (configuration.grooveId ? configuration.grooveId.replace(/[-_]/g, ' ') + ' groove' : style.grooves[0]?.prompt ?? 'relaxed, open phrasing');
  const tempo = clamp(Math.round(configuration.tempo), 20, 400);
  const meter = configuration.meter === 'custom' ? configuration.customMeter ?? '4/4' : (configuration.meter || '4/4');
  const tonality = style.tonalities.find((item) => item.id === configuration.tonalityId)?.prompt
    ?? TONALITY_BY_ID.get(configuration.tonalityId)?.prompt
    ?? (configuration.tonalityId ? configuration.tonalityId.replace(/[-_]/g, ' ') + ' tonality' : 'warm major tonality');
  const keyText = configuration.key && configuration.key !== 'auto' ? ' in ' + configuration.key : '';
  const feel = tempoFeel(configuration);
  const grooveCore = groove.startsWith(feel + ' ') ? groove.slice(feel.length + 1) : groove;
  const tempoSentence = tempo + ' BPM, ' + meter + ', at ' + (feel.startsWith('extremely') ? 'an ' : 'a ') + feel + ' pace with a ' + grooveCore + '.';
  const tonalitySentence = tonality[0]!.toUpperCase() + tonality.slice(1) + keyText + '.';

  const scene = configuration.sceneId === 'custom' && configuration.customSceneName && isEnglish(configuration.customSceneName)
    ? clean(configuration.customSceneName)
    : SCENE_BY_ID.get(configuration.sceneId)?.prompt ?? 'a quiet café';
  const moodList = unique(configuration.moodIds).map((id) => MOOD_BY_ID.get(id)?.prompt).filter((value): value is string => Boolean(value)).slice(0, 4);
  const sceneSentence = (scene[0]!.toUpperCase() + scene.slice(1)) + ' atmosphere' + (moodList.length ? ': ' + moodList.join(', ') + '.' : '.');

  const enabledParts = configuration.instruments.filter((part) => part.enabled && INSTRUMENT_BY_ID.has(part.instrumentId))
    .sort((a, b) => roleOrder(a) - roleOrder(b) || b.prominence - a.prominence);
  const sortedLead = enabledParts.filter((part) => part.role === 'lead').sort((a, b) => b.prominence - a.prominence);
  const lead = sortedLead[0];
  const additionalLeadIds = new Set(sortedLead.slice(1).map((part) => part.instrumentId));
  const instrumentSentences = enabledParts
    .filter((part) => part !== lead)
    .map((part) => describePart(part, additionalLeadIds.has(part.instrumentId)))
    .filter((sentence): sentence is string => Boolean(sentence));
  if (lead) instrumentSentences.unshift(describePart(lead, false)!);

  const harmonyNames = unique(configuration.harmonyIds).map((id) => HARMONY_BY_ID.get(id)?.prompt).filter((value): value is string => Boolean(value));
  const harmonySentence = harmonyNames.length
    ? 'Use ' + asList(harmonyNames.slice(0, 6)) + ' harmony, with smooth voice leading and restrained tension.'
    : 'Use restrained jazz harmony with smooth voice leading and gentle tension.';
  const melody = melodyDescription(configuration);
  const dynamics = dynamicsDescription(configuration.dynamics, configuration.energy);
  const arrangement = arrangementDescription(configuration.structure);
  const productionIds = unique(configuration.productionIds).filter((id) => PRODUCTION_BY_ID.has(id));
  const productionDescriptors = productionIds.filter((id) => !['warm', 'intimate', 'acoustic', 'clean', 'spacious', 'dark', 'airy', 'close-mic', 'round-bass', 'smooth-highs'].includes(id));
  const recordingCharacter = productionIds.filter((id) => ['warm', 'intimate', 'acoustic', 'clean', 'spacious', 'dark', 'airy', 'close-mic'].includes(id))
    .map((id) => PRODUCTION_BY_ID.get(id)!.prompt).slice(0, 3);
  if (!recordingCharacter.length) recordingCharacter.push('natural');
  const production = productionDescriptors.map((id) => PRODUCTION_BY_ID.get(id)!.prompt).slice(0, 4);
  const bassId = enabledParts.find((part) => part.role === 'bass')?.instrumentId;
  const bassWord = bassId ? INSTRUMENT_BY_ID.get(bassId)?.wording : undefined;
  const useRoundBass = productionIds.includes('round-bass');
  const bassPhrase = bassWord
    ? addModifiers(bassWord, useRoundBass ? ['round'] : [])
    : useRoundBass ? 'a round, restrained bass foundation' : 'a restrained low-end foundation';
  const highPhrase = productionIds.includes('smooth-highs') ? 'smooth high frequencies' : 'balanced high frequencies';
  const details = [...production, bassPhrase, highPhrase];
  const productionSentence = 'A ' + asList(recordingCharacter) + ' recording with ' + asList(details) + '.';

  const paragraphs = [
    opening,
    tempoSentence,
    tonalitySentence,
    sceneSentence,
    instrumentSentences.join('\n\n'),
    harmonySentence,
    melody,
    dynamics,
    arrangement,
    productionSentence,
    constraintSentence(configuration),
  ];
  return paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean).join('\n\n');
}
