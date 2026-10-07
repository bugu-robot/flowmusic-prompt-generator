import { describe, expect, it } from 'vitest';
import { INSTRUMENTS } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import type { PreviewInstrument, PreviewGroove } from './music';
import { makeBehaviourSpec, makeGrooveSpec, validateMusicSpec } from './music';

function behaviourSpec(instrumentId: string, match: RegExp) {
  const instrument = INSTRUMENTS.find((item) => item.id === instrumentId);
  expect(instrument, instrumentId).toBeDefined();
  const index = instrument!.behaviours.findIndex((behaviour) => match.test(behaviour));
  expect(index, `${instrumentId} behaviour ${match}`).toBeGreaterThanOrEqual(0);
  return makeBehaviourSpec(instrument as PreviewInstrument, instrument!.behaviours[index]!, index);
}

function grooveSpec(grooveId: string) {
  const groove = JAZZ_STYLES.flatMap((style) => style.grooves).find((item) => item.id === grooveId);
  expect(groove, grooveId).toBeDefined();
  return makeGrooveSpec(groove as PreviewGroove);
}

function expectSemanticQcToPass(spec: ReturnType<typeof makeGrooveSpec>) {
  expect(validateMusicSpec(spec).filter((rule) => !rule.ok), spec.source).toEqual([]);
}

describe('audio preview semantic mapping and QC', () => {
  it('classifies melodic and modal instrument behaviours before applying category fallbacks', () => {
    const melodicPiano = behaviourSpec('piano', /understated melodic phrases/);
    expect(melodicPiano.source).toBe('lyrical-phrase');
    expect(melodicPiano.tracks.some((track) => track.role === 'lead')).toBe(true);

    const quartalPiano = behaviourSpec('piano', /open quartal voicings/);
    expect(quartalPiano.source).toBe('quartal-voicing');
    expect(quartalPiano.semanticFamily).toBe('quartal-harmony');

    const modalBass = behaviourSpec('upright-bass', /a repeating modal ostinato/);
    expect(modalBass.source).toBe('modal-ostinato');
    expect(modalBass.semanticFamily).toBe('modal-bass-ostinato');

    for (const spec of [melodicPiano, quartalPiano, modalBass]) {
      expect(validateMusicSpec(spec).filter((rule) => !rule.ok), spec.source).toEqual([]);
    }
  });

  it('keeps the catalogued three-beat bass line in 3/4', () => {
    const bass = behaviourSpec('upright-bass', /across three beats/);
    expect(bass.source).toBe('jazz-waltz');
    expect(bass.meter).toEqual([3, 4]);
    expect(validateMusicSpec(bass).some((rule) => rule.rule === 'jazz-waltz-bass-three-beats' && rule.ok)).toBe(true);

    const groove = grooveSpec('jazz-waltz-three');
    expect(groove.meter).toEqual([3, 4]);
    expectSemanticQcToPass(groove);

    const chamberWaltz = grooveSpec('waltz');
    expect(chamberWaltz.source).toBe('jazz-waltz');
    expect(chamberWaltz.meter).toEqual([3, 4]);
    expectSemanticQcToPass(chamberWaltz);
  });

  it('keeps Contemporary Jazz flexible eighths in 4/4 with asymmetrical accents', () => {
    const spec = grooveSpec('contemporary-flex');
    expect(spec.source).toBe('contemporary-flex');
    expect(spec.semanticFamily).toBe('contemporary-flexible-eighths');
    expect(spec.meter).toEqual([4, 4]);
    expectSemanticQcToPass(spec);
  });

  it('separates Neo-Soul pocket, Boom-Bap, and its half-time variant', () => {
    const neoSoul = grooveSpec('neo-soul-pocket');
    expect(neoSoul.source).toBe('neo-soul');
    expect(neoSoul.semanticFamily).toBe('neo-soul-pocket');
    expect(neoSoul.source).not.toBe('straight-16-funk');
    expectSemanticQcToPass(neoSoul);

    const boomBap = grooveSpec('jazz-hop-boombap');
    expect(boomBap.source).toBe('boom-bap');
    expect(boomBap.semanticFamily).toBe('hip-hop-boom-bap');
    expectSemanticQcToPass(boomBap);

    const halfTime = grooveSpec('jazz-hop-half-time');
    expect(halfTime.source).toBe('boom-bap-half-time');
    expect(halfTime.semanticFamily).toBe('hip-hop-half-time');
    expectSemanticQcToPass(halfTime);

    const lofi = grooveSpec('lofi-chill');
    expect(lofi.source).toBe('straight-eighth');
    expectSemanticQcToPass(lofi);
  });

  it('uses loose, non-backbeat timing for Free Jazz and sparse brush timing for Noir', () => {
    const free = grooveSpec('free-time');
    expect(free.source).toBe('free-time');
    expect(free.semanticFamily).toBe('free-improvisation');
    expectSemanticQcToPass(free);

    const noir = grooveSpec('noir-slow-brush');
    expect(noir.source).toBe('noir-brushes');
    expect(noir.bpm).toBeLessThanOrEqual(64);
    expectSemanticQcToPass(noir);

    const noirOpen = grooveSpec('noir-open');
    expect(noirOpen.source).toBe('noir-brushes');
    expect(noirOpen.semanticFamily).toBe('noir-sparse-brushes');
    expectSemanticQcToPass(noirOpen);
  });

  it('requires chamber counterline and jazz harmony for Third Stream previews', () => {
    for (const id of ['third-stream-pulse', 'third-stream-light']) {
      const spec = grooveSpec(id);
      expect(spec.source).toBe('third-stream');
      expect(spec.semanticFamily).toBe('third-stream-chamber-jazz');
      expectSemanticQcToPass(spec);
    }
  });
});
