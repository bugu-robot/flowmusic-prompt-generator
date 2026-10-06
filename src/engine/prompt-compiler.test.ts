import { describe, expect, it } from 'vitest';
import { compilePrompt } from './prompt-compiler';
import { recommendConfiguration } from './recommendation-engine';
import { JAZZ_STYLES } from '../data/jazz-styles';
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
});
