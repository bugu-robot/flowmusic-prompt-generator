import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { compilePrompt } from './prompt-compiler';
import { recommendConfiguration } from './recommendation-engine';
import { generateVariations } from './variation-engine';
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

  it('keeps the Custom default prompt byte-for-byte stable', () => {
    const prompt = compilePrompt(recommendConfiguration('custom'));
    expect(createHash('sha256').update(prompt).digest('hex')).toBe('aa3f2be9702a71f12329391230808681f625b6074f7720f3dca6fd3d8875ca1d');
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
    { styleId: 'lofi-jazz', includes: ['Lo-fi Jazz / Chill Jazz', '78 BPM', 'slightly behind-the-beat hip-hop-influenced pocket', 'major 7th', 'minor 9th', 'tenor saxophone', 'very low information density'], excludes: ['trap', 'EDM'] },
    { styleId: 'acid-jazz', includes: ['Acid Jazz', '112 BPM', 'straight-16th funk-soul pocket', 'syncopated electric-bass line', 'live jazz improvisation', 'dominant 13th', 'Rhodes electric piano', 'electric bass', 'clean jazz electric guitar'], excludes: ['swing time', 'four-on-the-floor', 'heavy rock guitar', 'avoid electronic instruments'] },
    { styleId: 'big-band', includes: ['Big Band Jazz', '150 BPM', 'swing', 'walking bass line', 'ride-cymbal', 'saxophone, trumpet and trombone sections', 'arranged ensemble', 'sectional call-and-response', 'shout chorus'], excludes: ['collective front line'] },
    { styleId: 'samba-jazz', includes: ['Samba Jazz', '132 BPM', 'driving Brazilian samba pulse', 'Brazilian percussion', 'pandeiro-like', 'measured melodic improvisation'], excludes: ['bossa', 'clave', 'tumbao', 'montuno'] },
    { styleId: 'jazz-waltz', includes: ['Jazz Waltz', '126 BPM', '3/4', 'phrasing in three', 'across all three beats', 'jazz brush pulse'], excludes: ['6/8'] },
    { styleId: 'piano-cafe-jazz', includes: ['café piano jazz', '76 BPM', 'Piano carries the main melodic voice', 'upright bass', 'jazz brush pulse', 'quiet café', 'very low information density'], excludes: ['saxophone carries the main melodic voice', 'virtuosic solo density'] },
    { styleId: 'contemporary-jazz', includes: ['Contemporary Jazz', '118 BPM', 'interactive modern phrasing', 'quartal voicings', 'modal interchange', 'asymmetrical accents', 'altered dominant chords'] },
    { styleId: 'free-jazz', includes: ['Free Jazz / Avant-Garde Jazz', 'variable time', 'no fixed backbeat', 'collective improvisation', 'fragmented motifs', 'nonfunctional chromatic and modal clusters', 'pedal fields', 'dissonant extended intervals', 'no permanent lead hierarchy', 'expand and contract'], excludes: ['Only one foreground melodic voice at a time.', 'carries the main melodic voice', 'minor 7th harmony', 'smooth conventional voice leading', 'ii-V-I loop'] },
    { styleId: 'jazz-hop', includes: ['Jazz-Hop / Hip-Hop Jazz', '88 BPM', 'Boom-Bap', 'kick-snare relationship', 'lightly humanized hats', 'Jazz'], excludes: ['trap', 'vinyl hiss', 'EDM'] },
    { styleId: 'neo-soul-jazz', includes: ['Neo-Soul Jazz', '86 BPM', 'behind-the-beat', '16th-note pocket', 'Rhodes', 'maj9', 'min9', '11th and 13th chords', 'slash voicings', 'chromatic voice leading', 'ghost notes'], excludes: ['swing ride', 'trap'] },
    { styleId: 'dark-jazz', includes: ['Dark Jazz / Noir Jazz', '64 BPM', 'Dark modal tonality', 'negative space', 'Muted trumpet', 'deep low-register notes', 'intimate nocturnal space'], excludes: ['cinematic orchestral score', 'giant string swells', 'bright major jazz'] },
    { styleId: 'third-stream', includes: ['Third Stream Jazz', '88 BPM', 'composed chamber counterpoint', 'restrained jazz improvisation', 'composed chamber counterline', 'extended jazz harmony', 'classical voice leading'], excludes: ['cinematic film score', 'fusion synth'] },
  ];

  it.each(semanticChecks)('$styleId default prompt matches its benchmark identity', ({ styleId, includes, excludes = [] }) => {
    const prompt = compilePrompt(recommendConfiguration(styleId));
    for (const phrase of includes) expect(prompt.toLowerCase()).toContain(phrase.toLowerCase());
    for (const phrase of excludes) expect(prompt.toLowerCase()).not.toContain(phrase.toLowerCase());
  });

  it('keeps Free Jazz collective across A/B/C without a fixed melodic leader or conventional harmony', () => {
    for (const [index, variation] of generateVariations(recommendConfiguration('free-jazz')).entries()) {
      const prompt = compilePrompt(variation).toLowerCase();
      expect(prompt, 'variation ' + ['A', 'B', 'C'][index]).toContain('collective improvisation');
      expect(prompt, 'variation ' + ['A', 'B', 'C'][index]).toContain('no permanent lead hierarchy');
      expect(prompt).not.toContain('carries the main melodic voice');
      expect(prompt).not.toContain('only one foreground melodic voice at a time');
      expect(prompt).not.toContain('minor 7th harmony');
      expect(prompt).not.toContain('smooth conventional voice leading');
    }
  });

  it('keeps Big Band sectional wording and a single featured soloist in every variation', () => {
    const style = JAZZ_STYLES.find((candidate) => candidate.id === 'big-band')!;
    for (const [index, variation] of generateVariations(recommendConfiguration('big-band')).entries()) {
      const prompt = compilePrompt(variation).toLowerCase();
      expect(prompt, 'variation ' + ['A', 'B', 'C'][index]).not.toContain('collective front line');
      expect(prompt).toContain('walking bass line');
      expect(prompt).toContain('ride-cymbal swing');
      expect(prompt).toContain('saxophone-section');
      expect(prompt).toContain('trumpet section');
      expect(prompt).toContain('trombone-section');
      expect(variation.instruments.filter((part) => part.behaviour.includes('featured solo'))).toHaveLength(1);
      expect(style.variations[index]?.ensemble?.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('uses the requested taxonomy for all 12 added styles', () => {
    const classifications: Record<string, string> = {
      'lofi-jazz': 'modern-descriptor', 'acid-jazz': 'historical-derived-style', 'big-band': 'historical-style',
      'samba-jazz': 'historical-derived-style', 'jazz-waltz': 'historical-derived-style', 'piano-cafe-jazz': 'modern-descriptor',
      'contemporary-jazz': 'modern-descriptor', 'free-jazz': 'historical-style', 'jazz-hop': 'modern-descriptor',
      'neo-soul-jazz': 'modern-descriptor', 'dark-jazz': 'modern-descriptor', 'third-stream': 'historical-derived-style',
    };
    for (const [styleId, classification] of Object.entries(classifications)) {
      expect(JAZZ_STYLES.find((style) => style.id === styleId)?.classification, styleId).toBe(classification);
    }
  });

  it('keeps the 25 previously accepted built-in default prompts byte-for-byte stable', () => {
    const hashes: Record<string, string> = {
      'cozy-jazz': '9811f413f1289f1f14c8b0633ad1fa7650ed432fbfe39df9b3d8d0d160d5eb83',
      'slow-bossa': '68db65afd948befd24da12ebb439c7896d7eea04271537f7aad665369a9fd31e',
      'bossa-nova': '6856fb4f18c93209444396ae017d5a08fab2ea9bfe5914aba92b56600aac0a22',
      'cool-jazz': '21e46329be49e677d2ea8733552f89a70a503fd490a7782807b13032a15075a6',
      'west-coast': '47444d665f8a36a5ce601da43b82a9d393bfde5d6c42dec90a41223f1b01b3de',
      'soft-swing': '55526cfd7a92de6750b8f65f6c5b4a34d08d30e31c4c3c6045d7be98424cfa68',
      'swing-jazz': '93681409e4750b1368d9f1815cb3da1c9dca8cfc3d220c53de9493867ebb7181',
      'jazz-ballad': 'b9338bc8aefcf943c76c8510da84539346564d9a4bbab7cb3479c23d42dc4866',
      'modal-jazz': '55601cc23522e80b69b8d4eae695bd47b6a0cd8b80a91e69d0deedc47911db5a',
      'nordic-chamber': 'b537b73bdf3bdbc1472f654c5d35ed83aac63c68f5406a097bad275633a4b686',
      'spiritual-jazz': 'c3440278f8cbaad72e6ca78e3d690d5c578ac56fde82fa4540e984faeceed761',
      'brisk-jazz': 'a5d14859968bfdecc6df38d9ccfbe350cc0dd7d571e2ccb06345736f6ea5e3b7',
      'smooth-jazz': '626cf7fc2b49f4280deb440c4c99e75892a8fa635a59f5209f2f85a3c7ad1333',
      'latin-jazz': 'a8458987540326b5ef064527221f9a1213063897f4334500a57bdd5e062f386a',
      'afro-cuban': '6db9b74c5b196ffd8ea1d00a2dee341d176a217375b692e484258534615641fd',
      'gypsy-jazz': '28eeee4dbd9ce072f8a7ee813d9608bcb5b1984e2e85582c7fdb65b61358b094',
      'soul-jazz': '13bd3a042994aa21da102085fb37d17335407df52918bb8980522927ae7a7c89',
      'hard-bop': '4e9fc0ef6c38562a1c6f5d77fae779e71ddf652c1c4eb9a6b529379656d2f900',
      'bebop': '3852e070153ad9dbc5d1fc1d90937f0e54a73aecbd817527f53bfc8aa83247f7',
      'post-bop': 'c5deb288e2c9606619033c4df5056ebc60487df7f999d5be1cf5a681f9ad484e',
      'jazz-funk': '4ac42f47aa77105d56075dcdd0874ad1f9117c30b1a778dedd80cd13f18f45d1',
      'jazz-fusion': 'd6b705b7e46a9a9690c6b15a2739ede668497e0fff12492288a965013a481653',
      'nu-jazz': '6d8a894d226ac23dbee0777b6bbcfd46e6c707d2713e946221b09725ecdb60e6',
      'new-orleans': 'cfe0706349d3b638728440deaec9a65be4c21204a09f4cfae8db779b5ca5c50b',
      'dixieland': '7111de059f81ef8e49d9aac4a2c44a6c137f0d3c9162b481740010628b16e885',
    };
    expect(Object.keys(hashes)).toHaveLength(25);
    for (const [styleId, expected] of Object.entries(hashes)) {
      const prompt = compilePrompt(recommendConfiguration(styleId));
      expect(createHash('sha256').update(prompt).digest('hex'), styleId).toBe(expected);
    }
  });

  it('checks every fixed style default for unique supported parts, deterministic English and instrumental output', () => {
    const fixedStyles = JAZZ_STYLES.filter((style) => style.classification !== 'custom');
    expect(fixedStyles).toHaveLength(37);
    expect(JAZZ_STYLES).toHaveLength(38);
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
