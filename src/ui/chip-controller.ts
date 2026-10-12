import type { MusicConfiguration } from '../models/types';
import { canSelectOption, selectionLimitNotice, type SelectionProvider } from './simplified-options';
import { guidanceLevel } from '../engine/musical-guidance';
import { zhHK as t } from '../i18n/zh-HK';

// Update the actual DOM on each toggle or settings change; no stale disabled chips.
export function synchronizeChoiceButtons(root: Pick<ParentNode,'querySelectorAll'>, config: MusicConfiguration, provider: SelectionProvider): void {
  for (const chip of root.querySelectorAll<HTMLButtonElement>('[data-action="toggle-chip"]')) {
    const group = chip.dataset.group ?? '', id = chip.dataset.value ?? '';
    const foreground = group === 'foregroundRule';
    if (!foreground && !['harmonyIds','moodIds','productionIds','constraintIds'].includes(group)) continue;
    const values = foreground ? [] : config[group as 'harmonyIds' | 'moodIds' | 'productionIds' | 'constraintIds'];
    const selected = foreground ? config.foregroundRule === id : values.includes(id);
    const enabled = foreground || canSelectOption(group, values, id, provider);
    chip.classList.toggle('is-selected', selected);
    chip.setAttribute('aria-pressed', String(selected));
    chip.disabled = !enabled;
    if (group === 'moodIds' || group === 'productionIds') {
      const level = guidanceLevel(config, group, id);
      chip.classList.toggle('is-style-recommended', level === 'recommended');
      chip.classList.toggle('is-caution', level === 'caution');
      const badge = chip.querySelector<HTMLElement>('.choice-status');
      const status = level === 'recommended' ? '推薦' : level === 'caution' ? '留意' : '實驗';
      if (badge) badge.textContent = status;
      const label = chip.querySelector<HTMLElement>('.chip-label')?.textContent ?? id;
      chip.setAttribute('aria-label', label + ' · ' + status);
      chip.title = !enabled ? t.limitReached : level === 'recommended' ? '此 Jazz Style 的推薦選項' :
        level === 'caution' ? '可能與目前配置衝突；仍可自由選擇' : '可作實驗性創作配搭';
    } else if (enabled) chip.removeAttribute('title');
    else chip.title = t.limitReached;
  }
  for (const note of root.querySelectorAll<HTMLElement>('.chip-limit-notice')) {
    const group = note.dataset.limitGroup;
    if (group === 'harmonyIds' || group === 'moodIds' || group === 'productionIds')
      note.textContent = selectionLimitNotice(group, config[group], provider);
  }
}
