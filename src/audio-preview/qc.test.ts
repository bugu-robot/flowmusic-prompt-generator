import { describe, expect, it } from 'vitest';
import { initialSilenceFromDetection } from './qc';

describe('initial silence measurement', () => {
  it('measures a true leading silent interval from zero', () => {
    expect(initialSilenceFromDetection([0], [0.12])).toBe(0.12);
  });

  it('does not treat a quiet gap after an audible first attack as initial silence', () => {
    expect(initialSilenceFromDetection([0.054, 0.39], [0.30, 0.64])).toBe(0);
  });
});
