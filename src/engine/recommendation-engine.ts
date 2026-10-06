import { HARMONIES, MOODS, PRODUCTION, SCENES } from '../data/options';
import { INSTRUMENTS, INSTRUMENT_BY_ID } from '../data/instruments';
import { STYLE_BY_ID } from '../data/jazz-styles';
import type { InstrumentPart, JazzStyle, MusicConfiguration } from '../models/types';

function part(instrumentId: string, role: InstrumentPart['role'], prominence: number, behaviourIndex = 0): InstrumentPart {
  const instrument = INSTRUMENT_BY_ID.get(instrumentId);
  return { instrumentId, enabled: true, role, prominence, behaviour: instrument?.behaviours[behaviourIndex] ?? '' };
}

function uniqueParts(style: JazzStyle): InstrumentPart[] {
  if (style.recommendedParts) {
    const used = new Set<string>();
    return style.recommendedParts.flatMap((recommendation) => {
      const instrument = INSTRUMENT_BY_ID.get(recommendation.instrumentId);
      if (!instrument?.roles.includes(recommendation.role) || used.has(recommendation.instrumentId)) return [];
      used.add(recommendation.instrumentId);
      return [{
        instrumentId: recommendation.instrumentId,
        enabled: true,
        role: recommendation.role,
        prominence: recommendation.prominence,
        behaviour: instrument.behaviours.includes(recommendation.behaviour) ? recommendation.behaviour : instrument.behaviours[0] ?? '',
      }];
    });
  }

  const parts: InstrumentPart[] = [];
  const add = (id: string | undefined, role: InstrumentPart['role'], prominence: number) => {
    const instrument = id ? INSTRUMENT_BY_ID.get(id) : undefined;
    if (id && instrument?.roles.includes(role) && !parts.some((item) => item.instrumentId === id)) parts.push(part(id, role, prominence));
  };
  add(style.lead[0], 'lead', 90);
  add(style.response.find((id) => id !== style.lead[0]), 'response', 58);
  add(style.harmonyInstruments.find((id) => !parts.some((item) => item.instrumentId === id)), 'harmony', 44);
  add(style.bass[0], 'bass', 70);
  add(style.rhythm[0], 'rhythm', 36);
  return parts;
}

export function recommendConfiguration(styleId: string): MusicConfiguration {
  const style = STYLE_BY_ID.get(styleId) ?? STYLE_BY_ID.get('cozy-jazz')!;
  const sceneId = style.scenes.find((id) => SCENES.some((scene) => scene.id === id)) ?? 'quiet-cafe';
  const moodIds = style.moods.filter((id) => MOODS.some((mood) => mood.id === id)).slice(0, 4);
  const productionIds = style.production.filter((id) => PRODUCTION.some((trait) => trait.id === id));
  const harmonyIds = style.harmony.filter((id) => HARMONIES.some((harmony) => harmony.id === id));
  const defaultGroove = style.grooves[0]?.id ?? 'open';
  const defaultTonality = style.tonalities[0]?.id ?? 'warm-major';
  return {
    styleId: style.id,
    tempo: style.tempo.default,
    tempoFeelId: 'auto',
    meter: style.meters[0] ?? '4/4',
    customMeter: '4/4',
    grooveId: defaultGroove,
    tonalityId: defaultTonality,
    key: 'auto',
    harmonyIds,
    sceneId,
    moodIds,
    instruments: uniqueParts(style),
    energy: style.energy,
    melodyDensity: style.melodyDensity,
    improvisation: style.improvisation,
    foregroundRule: style.foregroundRule ?? 'single',
    phraseLength: style.melodyDensity < 35 ? 'short' : 'medium',
    breathingSpace: style.melodyDensity < 35 ? 'high' : 'medium',
    melodyComplexity: style.melodyDensity < 25 ? 'simple' : style.melodyDensity > 75 ? 'complex' : 'moderate',
    dynamics: style.dynamics,
    structure: style.arrangement,
    productionIds,
    constraintIds: style.constraints,
    secondaryStyleId: style.compatibleStyles.includes('cool-jazz') && style.id === 'slow-bossa' ? 'cool-jazz' : undefined,
  };
}

export function getStyle(styleId: string): JazzStyle {
  return STYLE_BY_ID.get(styleId) ?? STYLE_BY_ID.get('cozy-jazz')!;
}

export function availableInstruments(): typeof INSTRUMENTS {
  return INSTRUMENTS;
}
