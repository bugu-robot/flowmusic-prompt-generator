import { describe, expect, it } from 'vitest';
import { compilePrompt } from './prompt-compiler';
import { recommendConfiguration } from './recommendation-engine';
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

  it('labels Cozy Jazz as a modern descriptor rather than a historical genre', () => {
    const prompt = compilePrompt(recommendConfiguration('cozy-jazz'));
    expect(prompt).toContain('Cozy Jazz as a modern mood and tempo descriptor');
    expect(prompt).toContain('Instrumental only, no vocals.');
  });

  it('labels Brisk Jazz as a modern descriptor', () => {
    const prompt = compilePrompt(recommendConfiguration('brisk-jazz'));
    expect(prompt).toContain('Brisk Jazz as a modern mood and tempo descriptor');
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

  it('handles incomplete and invalid input by returning a usable default prompt', () => {
    const incomplete = compilePrompt({ styleId: 'slow-bossa', tempo: 0 } as Partial<MusicConfiguration>);
    const invalid = compilePrompt({ styleId: 'not-a-style' } as Partial<MusicConfiguration>);
    expect(incomplete).toContain('BPM,');
    expect(invalid).toContain('Cozy Jazz');
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

  it('groups and limits negative constraints while always requiring instrumental music', () => {
    const configuration = recommendConfiguration('cozy-jazz');
    configuration.constraintIds = ['vocals', 'scat', 'flashy-solos', 'virtuosic-runs', 'busy-fills', 'aggressive-percussion', 'dramatic-climax', 'large-crescendos', 'dense-arrangement'];
    const prompt = compilePrompt(configuration);
    const constraints = prompt.split('\n\n').at(-1) ?? '';
    expect(prompt).toContain('Instrumental only, no vocals.');
    expect(prompt).toContain('Avoid flashy solos and virtuosic runs.');
    expect(constraints.match(/Avoid|Keep/g)?.length).toBe(3);
    expect(prompt).not.toContain('scat singing');
  });

  it('compiles every built-in style without throwing or leaking UI localization', () => {
    for (const styleId of ['cozy-jazz', 'slow-bossa', 'bossa-nova', 'cool-jazz', 'west-coast', 'soft-swing', 'swing-jazz', 'jazz-ballad', 'modal-jazz', 'nordic-chamber', 'spiritual-jazz', 'brisk-jazz', 'smooth-jazz', 'latin-jazz', 'afro-cuban', 'gypsy-jazz', 'soul-jazz', 'hard-bop', 'bebop', 'post-bop', 'jazz-funk', 'jazz-fusion', 'nu-jazz', 'new-orleans', 'dixieland', 'custom']) {
      const prompt = compilePrompt(recommendConfiguration(styleId));
      expect(prompt).toContain('Instrumental only, no vocals.');
      expect(prompt).not.toMatch(/[\u3400-\u9fff]/u);
    }
  });
});
