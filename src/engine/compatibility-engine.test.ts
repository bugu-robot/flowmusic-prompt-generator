import { describe, expect, it } from 'vitest';
import { checkCompatibility } from './compatibility-engine';
import { recommendConfiguration } from './recommendation-engine';

describe('advisory compatibility engine', () => {
  it('warns when an unusual distorted guitar is selected for Slow Bossa', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.instruments.push({ instrumentId: 'distorted-guitar', enabled: true, role: 'lead', prominence: 50, behaviour: 'driving electric lead phrases' });
    const result = checkCompatibility(configuration);
    expect(result.messages.some((item) => item.message.includes('Distorted Electric Guitar'))).toBe(true);
    expect(result.messages.some((item) => item.suggestions?.includes('尼龍弦結他（Nylon-string Guitar）'))).toBe(true);
  });

  it('warns about BPM outside the selected style range', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.tempo = 120;
    const result = checkCompatibility(configuration);
    expect(result.messages.some((item) => item.message.includes('50–80 BPM'))).toBe(true);
    expect(result.factors.find((factor) => factor.label === '速度')?.score).toBeLessThan(18);
  });

  it('advises when a common meter is unusual for the selected style', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.meter = '3/4';
    expect(checkCompatibility(configuration).messages.some((item) => item.message.includes('3/4'))).toBe(true);
  });

  it('returns a bounded reference score and transparent factors', () => {
    const result = checkCompatibility(recommendConfiguration('bebop'));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors.reduce((total, factor) => total + factor.max, 0)).toBe(100);
  });
});
