import { describe, expect, it } from 'vitest';
import { checkCompatibility } from './compatibility-engine';
import { recommendConfiguration } from './recommendation-engine';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';

describe('advisory compatibility engine', () => {
  it.each(JAZZ_STYLES)('$name does not warn about its own recommended instruments', (style) => {
    const configuration = recommendConfiguration(style.id);
    const result = checkCompatibility(configuration);
    for (const part of configuration.instruments) {
      const name = INSTRUMENT_BY_ID.get(part.instrumentId)!.name;
      expect(result.messages.some((item) => item.message.startsWith(name + ' '))).toBe(false);
    }
    // Check alternatives too: Tuba and Synthesizer need not be the first recommendation.
    for (const id of [...style.lead, ...style.response, ...style.harmonyInstruments, ...style.bass, ...style.rhythm]) {
      const instrument = INSTRUMENT_BY_ID.get(id)!;
      const alternative = { ...configuration, instruments: [{ instrumentId: id, enabled: true, role: instrument.roles[0]!, prominence: 60, behaviour: instrument.behaviours[0] ?? '' }] };
      expect(checkCompatibility(alternative).messages.some((item) => item.message.startsWith(instrument.name + ' '))).toBe(false);
    }
  });

  it('warns when an unusual distorted guitar is selected for Slow Bossa', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.instruments.push({ instrumentId: 'distorted-guitar', enabled: true, role: 'lead', prominence: 50, behaviour: 'driving electric lead phrases' });
    const result = checkCompatibility(configuration);
    expect(result.messages.some((item) => item.message.includes('Distorted Electric Guitar'))).toBe(true);
    expect(result.messages.some((item) => item.suggestions?.includes('尼龍弦結他（Nylon-string Guitar）'))).toBe(true);
    configuration.instruments.push({ instrumentId: 'heavy-rock-drums', enabled: true, role: 'rhythm', prominence: 60, behaviour: 'forceful backbeat with heavy fills' });
    expect(checkCompatibility(configuration).messages.some((item) => item.message.startsWith('Heavy Rock Drum Kit '))).toBe(true);
  });

  it('warns about BPM outside the selected style range', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.tempo = 120;
    const result = checkCompatibility(configuration);
    expect(result.messages.some((item) => item.message.includes('50–80 BPM'))).toBe(true);
    expect(result.factors.find((factor) => factor.label === '速度')?.score).toBeLessThan(18);
  });

  it('retains warnings for heavy rock drums outside their supported Jazz families', () => {
    const configuration = recommendConfiguration('bebop');
    configuration.instruments.push({ instrumentId: 'heavy-rock-drums', enabled: true, role: 'rhythm', prominence: 60, behaviour: 'forceful backbeat with heavy fills' });
    expect(checkCompatibility(configuration).messages.some((item) => item.message.startsWith('Heavy Rock Drum Kit '))).toBe(true);
    const fusion = recommendConfiguration('jazz-fusion');
    fusion.instruments.push({ instrumentId: 'heavy-rock-drums', enabled: true, role: 'rhythm', prominence: 60, behaviour: 'forceful backbeat with heavy fills' });
    expect(checkCompatibility(fusion).messages.some((item) => item.message.startsWith('Heavy Rock Drum Kit '))).toBe(false);
  });

  it('advises when a common meter is unusual for the selected style', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.meter = '3/4';
    expect(checkCompatibility(configuration).messages.some((item) => item.message.includes('3/4'))).toBe(true);
  });

  it('reports the selected value for a custom meter', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.meter = 'custom';
    configuration.customMeter = '5/4';
    expect(checkCompatibility(configuration).messages.some((item) => item.message.includes('5/4'))).toBe(true);
  });

  it('returns a bounded reference score and transparent factors', () => {
    const result = checkCompatibility(recommendConfiguration('bebop'));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors.reduce((total, factor) => total + factor.max, 0)).toBe(100);
  });
});
