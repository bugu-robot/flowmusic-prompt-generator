import { describe, expect, it } from 'vitest';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { recommendConfiguration } from './recommendation-engine';
import { generateSmartPrompts } from './smart-prompt-planner';
import { compilePrompt } from './prompt-compiler';
import { compileSunoSimple } from './suno-simple-compiler';
import { describePromptZh } from './prompt-zh-reference';
import { FAMILY_FOCUS_ZH, describeSmartIntentZh } from '../i18n/smart-intent-zh-HK';

describe('Offline Traditional Chinese prompt reading', () => {
  it('has complete human-authored genre-family translations and three distinct bilingual focuses', () => {
    for (const style of JAZZ_STYLES) {
      expect(FAMILY_FOCUS_ZH[style.family], style.id + ' (' + style.family + ')').toHaveLength(3);
      for (const provider of ['suno', 'flow'] as const) {
        for (const strength of ['conservative', 'balanced', 'creative'] as const) {
          const configuration = recommendConfiguration(style.id);
          const unmodified = JSON.stringify(configuration);
          const smart = generateSmartPrompts(configuration, provider, strength, 2);
          expect(smart.prompts, style.id).toHaveLength(3);
          expect(new Set(smart.prompts.map(x => x.intentZh)).size, style.id).toBe(3);
          for (const [i, item] of smart.prompts.entries()) {
            expect(item.intentZh, style.id).toMatch(/[\u3400-\u9fff]/u);
            expect(item.intentZh, style.id).not.toContain('undefined');
            expect(item.intentZh, style.id).not.toContain('Make this focus');
            const chinese = describePromptZh(configuration, item.intentZh, i);
            expect(chinese, style.id).toContain(item.intentZh);
            expect(chinese.split('\n\n'), style.id).toHaveLength(4);
            expect(chinese).toContain(String(configuration.tempo) + ' BPM');
            expect(chinese).toContain('純音樂');
            expect(chinese).toContain('不加入未選的樂器');
            expect(item.prompt, style.id).not.toMatch(/[\u3400-\u9fff]/u);
          }
          expect(JSON.stringify(configuration), style.id).toBe(unmodified);
        }
      }
    }
  });

  it('Chinese reading tracks selected instruments, groove, scene, mood and duration while leaving provider text untouched', () => {
    const c = recommendConfiguration('slow-bossa');
    const flowBefore = compilePrompt(c);
    const sunoBefore = compileSunoSimple(c);
    c.tempo = 54;
    c.trackDurationId = '6-8';
    c.sceneId = 'seaside-cafe';
    c.moodIds = ['warm', 'peaceful'];
    const zh = describePromptZh(c);
    expect(zh).toContain('54 BPM');
    expect(zh).toContain('6–8 分鐘');
    expect(zh).toContain('海邊');
    expect(zh).toContain('溫暖');
    for (const part of c.instruments.filter(x => x.enabled)) {
      expect(zh).toContain(part.instrumentId === 'unknown' ? 'unknown' : part.role === 'lead' ? '主奏' : '（');
    }
    expect(compilePrompt(c)).not.toBe(flowBefore);
    expect(compileSunoSimple(c)).not.toBe(sunoBefore);
    // Neither compiler depends on the translation or chosen viewing mode.
    const en = compileSunoSimple(c);
    describePromptZh(c, '加入柔和表情', 0);
    expect(compileSunoSimple(c)).toBe(en);
  });

  it('covers special override translations and conservative/balanced/creative strength', () => {
    for (const override of ['none','gypsy-pompe','no-harmony','no-rhythm','custom-groove'] as const) {
      for (const strength of ['conservative', 'balanced', 'creative'] as const) {
        const output = describeSmartIntentZh('gypsy', 1, 2, 0, strength, override);
        expect(output).toMatch(/[\u3400-\u9fff]/u);
        expect(output).not.toContain('undefined');
      }
    }
  });

  it('keeps HTML-like user-supplied custom prose as data, not markup', () => {
    const config = recommendConfiguration('custom');
    config.sceneId = 'custom';
    config.customSceneName = '<script>alert(1)</script>';
    const explanation = describePromptZh(config);
    expect(explanation).toContain('<script>alert(1)</script>');
    // The view renderer must escape this value before assigning it as HTML.
  });
});
