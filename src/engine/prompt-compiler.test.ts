import { describe, expect, it } from 'vitest';
import { compilePrompt } from './prompt-compiler';
import { recommendConfiguration } from './recommendation-engine';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { CONSTRAINTS } from '../data/options';
import type { MusicConfiguration } from '../models/types';

describe('deterministic English prompt compiler', () => {
  it('compiles the Slow Bossa recommendations into a coherent role-based prompt', () => {
    const configuration = recommendConfiguration('slow-bossa');
    const prompt = compilePrompt(configuration);
    expect(prompt).toContain('Slow Bossa Jazz with a subtle Cool Jazz influence.');
    expect(prompt).toContain('58 BPM, 4/4');
    expect(prompt).toContain('Nylon-string guitar carries the main melodic voice');
    expect(prompt).toContain('A soft flugelhorn enters occasionally');
    expect(prompt).toContain('at a very relaxed pace');
    expect(prompt).toContain('Upright bass provides');
    expect(prompt).toContain('Instrumental only, no vocals.');
    expect(prompt).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it('opens Cozy Jazz with music wording without taxonomy meta-text', () => {
    const prompt = compilePrompt(recommendConfiguration('cozy-jazz'));
    expect(prompt.startsWith('Warm, intimate acoustic cozy jazz with a relaxed café character.')).toBe(true);
    expect(prompt).not.toContain('modern mood and tempo descriptor');
    expect(prompt).toContain('Instrumental only, no vocals.');
  });

  it('opens Brisk Jazz with music wording without classification explanation', () => {
    const prompt = compilePrompt(recommendConfiguration('brisk-jazz'));
    expect(prompt.startsWith('Brisk, light acoustic jazz with a buoyant swing feel.')).toBe(true);
    expect(prompt).not.toContain('modern mood and tempo descriptor');
  });

  it('keeps only the most prominent enabled lead as the foreground voice', () => {
    const configuration = recommendConfiguration('cool-jazz');
    configuration.instruments.push({ instrumentId: 'flugelhorn', enabled: true, role: 'lead', prominence: 30, behaviour: 'short, warm responses' });
    const prompt = compilePrompt(configuration);
    expect(prompt.match(/carries the main melodic voice/g)).toHaveLength(1);
    expect(prompt).toContain('foreground melodic voice at a time');
  });

  it('omits instruments explicitly disabled by the user', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.instruments = [{ instrumentId: 'flugelhorn', enabled: false, role: 'lead', prominence: 90, behaviour: 'soft, lyrical phrases' }];
    expect(compilePrompt(configuration)).not.toContain('flugelhorn');
  });

  it('does not invent instruments when the user explicitly clears the ensemble', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.instruments = [];
    const prompt = compilePrompt(configuration);
    expect(prompt).not.toContain('piano carries the main melodic voice');
    expect(prompt).toContain('Instrumental only, no vocals.');
  });

  it('handles incomplete and invalid input by returning a usable default prompt', () => {
    const incomplete = compilePrompt({ styleId: 'slow-bossa', tempo: 0 } as Partial<MusicConfiguration>);
    const invalid = compilePrompt({ styleId: 'not-a-style' } as Partial<MusicConfiguration>);
    expect(incomplete).toContain('BPM,');
    expect(invalid).toContain('Warm, intimate acoustic cozy jazz');
    expect(invalid).toContain('Instrumental only, no vocals.');
  });

  it('is stable across repeated recompilation', () => {
    const configuration = recommendConfiguration('cool-jazz');
    expect(compilePrompt(configuration)).toBe(compilePrompt(configuration));
  });

  it('supports explicit custom meters while keeping the output English', () => {
    const configuration = recommendConfiguration('cool-jazz');
    configuration.meter = 'custom';
    configuration.customMeter = '5/4';
    const prompt = compilePrompt(configuration);
    expect(prompt).toContain('5/4');
    expect(prompt).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it('keeps a selected groove and tonality readable after changing style', () => {
    const configuration = recommendConfiguration('slow-bossa');
    configuration.styleId = 'cool-jazz';
    configuration.grooveId = 'slow-bossa';
    configuration.tonalityId = 'relative-minor';
    const prompt = compilePrompt(configuration);
    expect(prompt).toContain('straight-eighth bossa groove, gently behind the beat');
    expect(prompt).toContain('Warm major tonality with occasional relative-minor colors.');
  });

  it('does not duplicate a production modifier already present in instrument wording', () => {
    const configuration = recommendConfiguration('nu-jazz');
    configuration.instruments = [{ instrumentId: 'electric-bass', enabled: true, role: 'bass', prominence: 75, behaviour: 'a warm, restrained bass foundation' }];
    configuration.productionIds = ['round-bass'];
    const prompt = compilePrompt(configuration);
    expect(prompt.toLowerCase()).not.toContain('round round');
    expect(prompt).toContain('round electric bass');
  });

  it('groups and limits negative constraints while always requiring instrumental music', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.constraintIds = CONSTRAINTS.map((option) => option.id);
    const prompt = compilePrompt(configuration);
    const constraints = prompt.split('\n\n').at(-1) ?? '';
    expect(prompt).toContain('Instrumental only, no vocals.');
    expect(constraints.match(/Avoid|Keep/g)?.length).toBe(3);
    for (const option of CONSTRAINTS) expect(constraints).toContain(option.prompt);
    expect(prompt).not.toContain('scat singing');
  });

  it.each(CONSTRAINTS)('selecting only $id emits exactly that optional restriction', (option) => {
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.constraintIds = [option.id];
    const constraints = compilePrompt(configuration).split('\n\n').at(-1);
    expect(constraints).toBe('Instrumental only, no vocals. Avoid ' + option.prompt + '.');
  });

  it('combines selected constraints without adding their unselected siblings', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.constraintIds = ['electronic', 'bright-brass'];
    const constraints = compilePrompt(configuration).split('\n\n').at(-1);
    expect(constraints).toBe('Instrumental only, no vocals. Avoid electronic instruments and overly bright brass.');
    expect(constraints).not.toContain('heavy bass');
    expect(constraints).not.toContain('chromatic runs');
  });

  it('always requires instrumental music and has no optional vocals or scat controls', () => {
    expect(CONSTRAINTS.some((option) => ['vocals', 'scat'].includes(option.id))).toBe(false);
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.constraintIds = [];
    expect(compilePrompt(configuration).split('\n\n').at(-1)).toBe('Instrumental only, no vocals.');
    // Old preset IDs cannot reintroduce optional vocal controls.
    configuration.constraintIds = ['vocals', 'scat'];
    expect(compilePrompt(configuration).split('\n\n').at(-1)).toBe('Instrumental only, no vocals.');
  });

  it('compiles every built-in style without throwing or leaking UI localization', () => {
    for (const style of JAZZ_STYLES) {
      const prompt = compilePrompt(recommendConfiguration(style.id));
      expect(prompt).toContain('Instrumental only, no vocals.');
      expect(prompt).not.toMatch(/[\u3400-\u9fff]/u);
      expect(prompt).not.toContain('modern mood and tempo descriptor');
    }
  });

  const semanticChecks: Array<{ styleId: string; includes: string[]; excludes?: string[] }> = [
    { styleId: 'swing-jazz', includes: ['138 BPM', 'clear swing eighths', 'walking bass line', 'ride-cymbal swing'] },
    { styleId: 'modal-jazz', includes: ['modal tonality', 'long modal harmonies', 'pedal tone', 'quartal voicings'] },
    { styleId: 'spiritual-jazz', includes: ['repeating modal motif', 'repeating modal ostinato', 'gradual ensemble intensification', 'gradually introduce the ensemble', 'hand-percussion'] },
    { styleId: 'smooth-jazz', includes: ['straight-eighth groove', 'straight-eighth backbeat'], excludes: ['swing time'] },
    { styleId: 'latin-jazz', includes: ['clave-informed Latin groove', 'montuno-style', 'Light congas play', 'Soft timbales play', 'interlocking timbales'] },
    { styleId: 'afro-cuban', includes: ['2-3 clave', 'tumbao-style', 'piano montuno', 'Light congas play', 'Soft timbales play', 'jazz improvisation'] },
    { styleId: 'gypsy-jazz', includes: ['Selmer-style Manouche acoustic guitar carries the main melodic voice', 'acoustic guitar maintains steady la pompe rhythm-guitar chords'] },
    { styleId: 'soul-jazz', includes: ['Hammond B3 organ', 'tenor saxophone', 'blues- and gospel-inflected comping', 'blues shuffle', 'soulful backbeat'] },
    { styleId: 'hard-bop', includes: ['walking bass line', 'blues- and gospel-inflected comping', 'hard-bop accents', 'ride-cymbal time'] },
    { styleId: 'jazz-funk', includes: ['straight-16th funk pocket', 'syncopated electric-bass line', 'Jazz-Funk'], excludes: ['swing time'] },
    { styleId: 'jazz-fusion', includes: ['straight funk-rock fusion drive', 'asymmetrical accents', 'Jazz improvisation'], excludes: ['swing time'] },
    { styleId: 'nu-jazz', includes: ['downtempo broken-beat pulse', 'hybrid electronic/live', 'subtle programming', 'light acoustic percussion', 'without an EDM-style drop'], excludes: ['swing time'] },
    { styleId: 'new-orleans', includes: ['trumpet or cornet', 'clarinet', 'trombone', 'tailgate-style', 'collective front-line improvisation', 'overlapping but coherent'], excludes: ['Only one foreground melodic voice at a time.'] },
    { styleId: 'dixieland', includes: ['trumpet or cornet', 'clarinet', 'trombone', 'tailgate-style', 'collective front-line improvisation', 'overlapping but coherent'], excludes: ['Only one foreground melodic voice at a time.'] },
  ];

  it.each(semanticChecks)('$styleId default prompt matches its benchmark identity', ({ styleId, includes, excludes = [] }) => {
    const prompt = compilePrompt(recommendConfiguration(styleId));
    for (const phrase of includes) expect(prompt.toLowerCase()).toContain(phrase.toLowerCase());
    for (const phrase of excludes) expect(prompt.toLowerCase()).not.toContain(phrase.toLowerCase());
  });

  it('checks every fixed style default for unique supported parts, deterministic English and instrumental output', () => {
    const fixedStyles = JAZZ_STYLES.filter((style) => style.classification !== 'custom');
    expect(fixedStyles).toHaveLength(25);
    for (const style of fixedStyles) {
      const configuration = recommendConfiguration(style.id);
      const ids = configuration.instruments.map((part) => part.instrumentId);
      expect(new Set(ids).size, style.id).toBe(ids.length);
      for (const part of configuration.instruments) {
        const instrument = INSTRUMENT_BY_ID.get(part.instrumentId);
        expect(instrument?.roles, style.id + ': ' + part.instrumentId).toContain(part.role);
        expect(instrument?.behaviours, style.id + ': ' + part.instrumentId).toContain(part.behaviour);
      }
      const prompt = compilePrompt(configuration);
      expect(prompt, style.id).toBe(compilePrompt(configuration));
      expect(prompt, style.id).toContain('Instrumental only, no vocals.');
      expect(prompt, style.id).not.toMatch(/[\u3400-\u9fff]/u);
      if (['smooth-jazz', 'jazz-funk', 'jazz-fusion', 'nu-jazz'].includes(style.id)) {
        expect(prompt.toLowerCase(), style.id).not.toContain('swing time');
      }
      if (['new-orleans', 'dixieland'].includes(style.id)) {
        expect(configuration.foregroundRule, style.id).toBe('collective');
        expect(prompt, style.id).not.toContain('Only one foreground melodic voice at a time.');
      }
    }
  });

  it('does not give Custom any fixed-style rhythmic or collective-interplay defaults', () => {
    const prompt = compilePrompt(recommendConfiguration('custom')).toLowerCase();
    expect(prompt).toContain('user-defined jazz');
    expect(prompt).not.toMatch(/2-3 clave|tumbao|montuno|la pompe|collective front-line improvisation/);
  });
});
