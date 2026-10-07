import { CONSTRAINTS, HARMONIES, MOODS, PRODUCTION, SCENES, ROLES, TONALITIES } from '../data/options';
import { INSTRUMENTS, INSTRUMENT_BY_ID } from '../data/instruments';
import { JAZZ_STYLES, STYLE_BY_ID } from '../data/jazz-styles';
import { checkCompatibility } from '../engine/compatibility-engine';
import { compilePrompt } from '../engine/prompt-compiler';
import { recommendConfiguration } from '../engine/recommendation-engine';
import { generateVariations } from '../engine/variation-engine';
import { deletePreset, exportPresetJson, importPresetJson, isValidMeter, listPresets, loadCurrentConfiguration, saveCurrentConfiguration, savePreset } from '../storage/local-storage';
import type { InstrumentPart, InstrumentRole, JazzStyle, MusicConfiguration, UserPreset } from '../models/types';
import { instrumentBehaviourLabelZhHK } from '../i18n/instrument-behaviour-zh-HK';
import { grooveLabelZhHK } from '../i18n/groove-zh-HK';
import { zhHK as t } from '../i18n/zh-HK';
import { stopPreview, togglePreview } from '../audio-preview/player';

const STYLE_CLASS: Record<JazzStyle['classification'], string> = {
  'historical-style': t.classificationHistorical,
  'historical-derived-style': t.classificationDerived,
  'modern-descriptor': t.classificationDescriptor,
  custom: t.classificationCustom,
};
const MATCH_LABEL: Record<string, string> = { excellent: t.matchExcellent, good: t.matchGood, unusual: t.matchUnusual, conflict: t.matchConflict };
const DYNAMICS = [['very-stable', t.dynamicsVeryStable], ['stable', t.dynamicsStable], ['gentle-evolution', t.dynamicsGentle], ['gradual-build', t.dynamicsBuild], ['dynamic', t.dynamicsDynamic]];
const STRUCTURES = [['continuous', t.structureContinuous], ['gentle-evolution', t.structureEvolution], ['traditional-sections', t.structureSections], ['custom', t.structureCustom]];
const ROLE_LABEL: Record<InstrumentRole, string> = { lead: t.roleLead, response: t.roleResponse, harmony: t.roleHarmony, bass: t.roleBass, rhythm: t.roleRhythm, texture: t.roleTexture, countermelody: t.roleCountermelody };
const TEMPO_FEELS = [
  ['auto', t.tempoAuto], ['very-slow', t.feelVerySlow], ['very-relaxed', t.feelRelaxed], ['relaxed', t.feelEasy],
  ['moderate', t.feelModerate], ['brisk', t.feelBrisk], ['fast', t.feelFast],
];
const COMMON_METERS = ['4/4', '3/4', '6/8', '2/4'];
const CHIP_GROUP_LABEL: Record<string, string> = {
  harmonyIds: t.recommendedHarmony,
  foregroundRule: t.foreground,
  moodIds: t.moods,
  productionIds: t.productionTitle,
  constraintIds: t.constraintsTitle,
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function selectOptions(options: { id: string; label: string }[], selected: string): string {
  return options.map((option) => '<option value="' + escapeHtml(option.id) + '"' + (option.id === selected ? ' selected' : '') + '>' + escapeHtml(option.label) + '</option>').join('');
}
function tempoFeelLabel(configuration: MusicConfiguration): string {
  if (configuration.tempoFeelId !== 'auto') {
    const item = TEMPO_FEELS.find(([id]) => id === configuration.tempoFeelId);
    return item?.[1] ?? t.feelEasy;
  }
  return configuration.tempo < 48 ? t.feelVerySlow : configuration.tempo < 70 ? t.feelRelaxed : configuration.tempo < 100 ? t.feelEasy : configuration.tempo < 138 ? t.feelModerate : configuration.tempo < 180 ? t.feelBrisk : t.feelFast;
}
function meterLabel(configuration: MusicConfiguration): string {
  return configuration.meter === 'custom' ? configuration.customMeter ?? '4/4' : configuration.meter;
}
function chipGroup(group: string, items: { id: string; label: string }[], selected: string[], className = ''): string {
  return '<div class="chips ' + className + '" role="group" aria-label="' + escapeHtml(CHIP_GROUP_LABEL[group] ?? group) + '">' + items.map((item) => {
    const active = selected.includes(item.id);
    return '<button type="button" class="chip' + (active ? ' is-selected' : '') + '" data-action="toggle-chip" data-group="' + escapeHtml(group) + '" data-value="' + escapeHtml(item.id) + '" aria-pressed="' + active + '">' + escapeHtml(item.label) + '</button>';
  }).join('') + '</div>';
}
function renderStyleCards(filter: string): string {
  const query = filter.trim().toLocaleLowerCase();
  const matches = JAZZ_STYLES.filter((style) => !query || (style.name + ' ' + style.nameZh + ' ' + style.descriptionZh).toLocaleLowerCase().includes(query));
  if (!matches.length) return '<p class="empty-inline">' + t.searchEmpty + '</p>';
  return matches.map((style) => '<button type="button" class="style-card' + (appState.configuration.styleId === style.id ? ' is-active' : '') + '" data-action="select-style" data-id="' + escapeHtml(style.id) + '" aria-pressed="' + (appState.configuration.styleId === style.id) + '"><span class="style-name">' + escapeHtml(style.name) + '</span><span class="style-kind">' + escapeHtml(STYLE_CLASS[style.classification]) + '</span><span class="style-description">' + escapeHtml(style.descriptionZh) + '</span></button>').join('');
}

function renderRecommendation(style: JazzStyle): string {
  const roleLines: [string, string[]][] = [[t.lead, style.lead.slice(0, 3)], [t.response, style.response.slice(0, 3)], [t.bass, style.bass], [t.rhythm, style.rhythm.slice(0, 3)]];
  const harmonyLabels = style.harmony.map((id) => HARMONIES.find((item) => item.id === id)?.label).filter((label): label is string => Boolean(label));
  const recommendedGroove = style.grooves[0];
  return '<section class="panel recommendation" aria-labelledby="recommendation-heading"><div class="panel-heading"><div><p class="eyebrow">' + t.recommendedDefault + '</p><h2 id="recommendation-heading">' + t.recommendationTitle + '</h2></div><button class="button button-secondary" type="button" data-action="apply-recommendation">' + t.applyRecommendation + '</button></div>'
    + '<div class="recommendation-intro"><strong>' + escapeHtml(style.name) + '</strong><span>' + escapeHtml(STYLE_CLASS[style.classification]) + '</span><p>' + escapeHtml(style.descriptionZh) + '</p></div>'
    + '<div class="recommendation-grid"><div><span class="mini-label">' + t.tempo + '</span><strong>' + style.tempo.default + ' BPM</strong><small>' + t.tempoRange + ' ' + style.tempo.min + '–' + style.tempo.max + ' BPM</small></div>'
    + '<div><span class="mini-label">' + t.meter + '</span><strong>' + escapeHtml(style.meters.slice(0, 2).join(' / ')) + '</strong><small>' + t.groove + ' ' + escapeHtml(recommendedGroove ? grooveLabelZhHK(recommendedGroove.id, recommendedGroove.label) : '') + '</small></div>'
    + '<div><span class="mini-label">' + t.recommendedHarmony + '</span><div class="mini-tags">' + harmonyLabels.map((label) => '<span>' + escapeHtml(label) + '</span>').join('') + '</div></div></div>'
    + '<div class="role-recommendations">' + roleLines.map(([label, ids]) => '<div><span>' + escapeHtml(label) + '</span><strong>' + ids.map((id) => INSTRUMENT_BY_ID.get(id)?.nameZh + ' (' + INSTRUMENT_BY_ID.get(id)?.name + ')').filter(Boolean).map(escapeHtml).join(' · ') + '</strong></div>').join('') + '</div>'
    + '<p class="recommendation-footnote">' + t.recommendationPreserves + '</p></section>';
}

function previewControl(category: 'instrument' | 'behaviour' | 'groove', key: string, name: string, tone = false): string {
  const idle = tone ? t.previewTone : t.preview;
  return '<button type="button" class="preview-control" data-action="preview-audio" data-preview-category="' + category + '" data-preview-key="' + escapeHtml(key) + '" data-preview-name="' + escapeHtml(name) + '" data-preview-idle="' + idle + '" data-preview-stop="' + t.stopPreview + '" aria-label="' + idle + ' ' + escapeHtml(name) + '" aria-pressed="false">' + idle + '</button>';
}
function renderInstrument(part: InstrumentPart, index: number): string {
  const instrument = INSTRUMENT_BY_ID.get(part.instrumentId);
  if (!instrument) return '';
  const roles = ROLES.filter((role) => instrument.roles.includes(role.id)).map((role) => ({ id: role.id, label: ROLE_LABEL[role.id] }));
  return '<article class="instrument-row' + (part.enabled ? '' : ' is-disabled') + '"><div class="instrument-title"><div><strong>' + escapeHtml(instrument.nameZh) + '</strong><span>' + escapeHtml(instrument.name) + '</span></div><div class="instrument-title-actions"><label class="instrument-enabled"><input type="checkbox" data-part-index="' + index + '" data-part-field="enabled"' + (part.enabled ? ' checked' : '') + '><span>' + t.includeInstrument + '</span></label>' + previewControl('instrument', instrument.id, instrument.nameZh, true) + '<button type="button" class="icon-button" data-action="remove-instrument" data-index="' + index + '" aria-label="' + t.remove + ' ' + escapeHtml(instrument.nameZh) + '">×</button></div></div>'
    + '<div class="instrument-fields"><label><span>' + t.role + '</span><select data-part-index="' + index + '" data-part-field="role">' + selectOptions(roles, part.role) + '</select></label>'
    + '<label><span>' + t.prominence + ' · ' + part.prominence + '</span><input type="range" min="0" max="100" value="' + part.prominence + '" data-part-index="' + index + '" data-part-field="prominence" aria-label="' + t.prominence + ' ' + escapeHtml(instrument.nameZh) + '"></label></div>'
    + '<div class="behaviour-controls"><label class="behaviour-field"><span>' + t.behaviour + '</span><select data-part-index="' + index + '" data-part-field="behaviour">' + selectOptions(instrument.behaviours.map((behaviour, i) => ({ id: String(i), label: instrumentBehaviourLabelZhHK(behaviour) })), String(Math.max(0, instrument.behaviours.indexOf(part.behaviour)))) + '</select></label>' + previewControl('behaviour', instrument.id + '::' + part.behaviour, instrument.nameZh + ' · ' + instrumentBehaviourLabelZhHK(part.behaviour)) + '</div></article>';
}
function renderCompatibility(configuration: MusicConfiguration): string {
  const result = checkCompatibility(configuration);
  const factors = result.factors.map((factor) => '<div class="factor-row"><div><span>' + escapeHtml(factor.label) + '</span><small>' + escapeHtml(factor.reason) + '</small></div><strong>' + factor.score + '<small>/' + factor.max + '</small></strong></div>').join('');
  const messages = result.messages.length
    ? result.messages.map((message) => '<li class="' + (message.category === 'conflict' ? 'warning-conflict' : '') + '"><span aria-hidden="true">' + (message.category === 'conflict' ? '!' : '↗') + '</span><div><p>' + escapeHtml(message.message) + '</p>' + (message.suggestions?.length ? '<small>' + t.suggestions + '：' + message.suggestions.map(escapeHtml).join('、') + '</small>' : '') + '</div></li>').join('')
    : '<li class="no-warning">' + t.noWarnings + '</li>';
  return '<section class="panel compact-panel" id="compatibility-panel" aria-labelledby="compatibility-heading"><div class="panel-heading"><div><p class="eyebrow">RULE-BASED · ADVISORY</p><h2 id="compatibility-heading">' + t.compatibilityTitle + '</h2></div><div class="score-badge score-' + result.label + '"><strong>' + result.score + '</strong><span>/100</span></div></div><p class="quiet">' + t.compatibilityNote + '</p><p class="match-label match-' + result.label + '">' + MATCH_LABEL[result.label] + '</p>'
    + '<ul class="warning-list">' + messages + '</ul><details class="factor-details"><summary>' + t.scoreFactors + '</summary><div class="factor-list">' + factors + '</div><small>' + t.confidenceTone + '</small></details></section>';
}
function renderVariations(): string {
  if (!appState.variations.length) return '';
  return '<div class="variation-grid">' + appState.variations.map((configuration, index) => {
    const lead = configuration.instruments.find((part) => part.role === 'lead');
    const names = configuration.instruments.map((part) => INSTRUMENT_BY_ID.get(part.instrumentId)?.nameZh).filter(Boolean).join(' · ');
    return '<article class="variation-card"><span class="variation-kicker">OPTION ' + String.fromCharCode(65 + index) + '</span><h3>' + escapeHtml(lead ? INSTRUMENT_BY_ID.get(lead.instrumentId)?.nameZh : '') + ' ' + t.roleLead + '</h3><p>' + escapeHtml(names) + '</p><button class="button button-small" type="button" data-action="apply-variation" data-index="' + index + '">' + t.applyVariation + '</button></article>';
  }).join('') + '</div>';
}
function renderPreset(preset: UserPreset): string {
  return '<article class="preset-row" data-preset-id="' + escapeHtml(preset.id) + '"><div class="preset-info"><strong>' + escapeHtml(preset.name) + '</strong><small>' + escapeHtml(STYLE_BY_ID.get(preset.configuration.styleId)?.name ?? '') + ' · ' + new Date(preset.updatedAt).toLocaleDateString('zh-HK') + '</small></div><div class="preset-actions">'
    + '<button type="button" data-action="load-preset" data-id="' + escapeHtml(preset.id) + '">' + t.loadPreset + '</button><button type="button" data-action="rename-preset" data-id="' + escapeHtml(preset.id) + '">' + t.renamePreset + '</button><button type="button" data-action="duplicate-preset" data-id="' + escapeHtml(preset.id) + '">' + t.duplicatePreset + '</button><button type="button" data-action="export-preset" data-id="' + escapeHtml(preset.id) + '">' + t.exportPreset + '</button><button type="button" class="danger-text" data-action="delete-preset" data-id="' + escapeHtml(preset.id) + '">' + t.deletePreset + '</button></div></article>';
}
function renderPresets(): string {
  const presets = listPresets();
  return '<section class="panel compact-panel" aria-labelledby="presets-heading"><div class="panel-heading"><div><p class="eyebrow">DEVICE ONLY</p><h2 id="presets-heading">' + t.presetsTitle + '</h2></div><span class="local-lock" aria-label="本機儲存">⌂</span></div>'
    + '<div class="save-row"><label class="visually-hidden" for="preset-name">' + t.presetName + '</label><input id="preset-name" type="text" maxlength="80" placeholder="' + t.presetNamePlaceholder + '"><button class="button button-primary" type="button" data-action="save-preset">' + t.savePreset + '</button></div>'
    + '<div class="preset-list">' + (presets.length ? presets.map(renderPreset).join('') : '<p class="empty-inline">' + t.noPresets + '</p>') + '</div><div class="preset-tools"><button type="button" class="button button-quiet" data-action="import-preset">' + t.importPreset + '</button><input type="file" accept="application/json,.json" class="visually-hidden" id="preset-file"><span>JSON · localStorage</span></div></section>';
}

function render(): void {
  stopPreview();
  const previousFocus = document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
    ? { id: document.activeElement.id, data: { ...document.activeElement.dataset } }
    : undefined;
  const advancedWasOpen = root.querySelector<HTMLDetailsElement>('.advanced-controls')?.open ?? false;
  const configuration = appState.configuration;
  const style = STYLE_BY_ID.get(configuration.styleId) ?? STYLE_BY_ID.get('cozy-jazz')!;
  const grooveOptions = style.grooves.map(({ id, label }) => ({ id, label: grooveLabelZhHK(id, label) }));
  const tonalityOptions = style.tonalities.map(({ id, label }) => ({ id, label }));
  if (!grooveOptions.some((item) => item.id === configuration.grooveId)) {
    const retained = JAZZ_STYLES.flatMap((candidate) => candidate.grooves).find((item) => item.id === configuration.grooveId);
    grooveOptions.push({ id: configuration.grooveId, label: (retained ? grooveLabelZhHK(retained.id, retained.label) : configuration.grooveId) + ' · ' + t.retainedOtherStyle });
  }
  if (!tonalityOptions.some((item) => item.id === configuration.tonalityId)) {
    const retained = TONALITIES.find((item) => item.id === configuration.tonalityId);
    tonalityOptions.push({ id: configuration.tonalityId, label: (retained?.label ?? configuration.tonalityId) + ' · ' + t.retainedOtherStyle });
  }
  const meterOptions = [...new Set([...style.meters, ...COMMON_METERS])].map((item) => ({ id: item, label: style.meters.includes(item) ? item : item + ' · ' + t.meterUnusual }));
  if (configuration.meter === 'custom') meterOptions.push({ id: 'custom', label: t.customMeter + ' (' + (configuration.customMeter ?? '4/4') + ')' });
  else if (!style.meters.includes(configuration.meter)) meterOptions.push({ id: configuration.meter, label: configuration.meter + ' · ' + t.retainedOtherStyle });
  if (!meterOptions.some((item) => item.id === 'custom')) meterOptions.push({ id: 'custom', label: t.customMeter });
  const influenceOptions = [{ id: '', label: t.noInfluence }, ...style.compatibleStyles.map((id) => ({ id, label: STYLE_BY_ID.get(id)?.name ?? id }))];
  if (configuration.secondaryStyleId && !influenceOptions.some((item) => item.id === configuration.secondaryStyleId)) {
    influenceOptions.push({ id: configuration.secondaryStyleId, label: (STYLE_BY_ID.get(configuration.secondaryStyleId)?.name ?? configuration.secondaryStyleId) + ' · ' + t.retainedOtherStyle });
  }
  const categories = [...new Set(INSTRUMENTS.map((instrument) => instrument.category))];
  const categoryLabels: Record<string, string> = { guitar: 'Guitar', keyboard: 'Piano / Keyboard', brass: 'Brass', woodwind: 'Woodwind', strings: 'Strings', bass: 'Bass', percussion: 'Percussion', electronic: 'Electronic', texture: 'Texture' };
  root.innerHTML = '<div class="app-shell"><header class="site-header"><a class="brand" href="#" aria-label="' + t.appName + '"><span class="brand-mark" aria-hidden="true">♪</span><span><strong>' + t.appName + '</strong><small>' + t.eyebrow + '</small></span></a><div class="header-pills"><span><i class="status-dot"></i><span id="offline-status" aria-live="polite">' + t.offlinePreparing + '</span></span><span>' + t.noApi + '</span></div></header>'
    + '<main class="page"><section class="hero"><div><p class="eyebrow">A LOCAL MUSIC TOOL</p><h1>把音樂想法，寫成清晰的 Flow Music prompt。</h1><p>' + t.subtitle + '</p></div><span class="hero-note" aria-hidden="true"><i>♬</i><span>STYLE<br>·<br>SPACE<br>·<br>SOUND</span></span></section>'
    + '<div class="studio-layout"><div class="configuration-column"><section class="panel style-panel" aria-labelledby="style-heading"><div class="panel-heading"><div><p class="eyebrow">01 · STYLE</p><h2 id="style-heading">' + t.styleTitle + '</h2><p class="section-help">' + t.styleHint + '</p></div></div>'
    + '<label class="search-field"><span aria-hidden="true">⌕</span><input id="style-search" type="search" aria-label="' + t.searchStyle + '" placeholder="' + t.searchStyle + '" autocomplete="off"></label><div class="style-grid" id="style-grid">' + renderStyleCards('') + '</div>'
    + (style.id === 'custom' ? '<label class="custom-name-field"><span>' + t.customStyleName + '</span><input type="text" data-field="customStyleName" value="' + escapeHtml(configuration.customStyleName ?? '') + '" placeholder="' + t.customStylePlaceholder + '"></label>' : '') + '</section>'
    + renderRecommendation(style)
    + '<section class="panel" aria-labelledby="instruments-heading"><div class="panel-heading"><div><p class="eyebrow">02 · ENSEMBLE</p><h2 id="instruments-heading">' + t.instrumentTitle + '</h2><p class="section-help">' + t.instrumentHint + ' ' + t.previewReferenceHint + '</p></div></div><div class="instrument-list">' + (configuration.instruments.length ? configuration.instruments.map(renderInstrument).join('') : '<p class="empty-inline">' + t.noneSelected + '</p>') + '</div>'
    + '<div class="add-instrument-row"><label for="instrument-picker">' + t.addInstrument + '</label><select id="instrument-picker"><option value="">' + t.chooseInstrument + '</option>' + categories.map((category) => '<optgroup label="' + escapeHtml(categoryLabels[category] ?? category) + '">' + INSTRUMENTS.filter((item) => item.category === category && !configuration.instruments.some((part) => part.instrumentId === item.id)).map((instrument) => '<option value="' + escapeHtml(instrument.id) + '">' + escapeHtml(instrument.nameZh + ' (' + instrument.name + ')') + '</option>').join('') + '</optgroup>').join('') + '</select></div></section>'
    + '<section class="panel" aria-labelledby="music-heading"><div class="panel-heading"><div><p class="eyebrow">03 · MUSIC</p><h2 id="music-heading">' + t.basicTitle + '</h2></div></div><div class="control-grid"><div class="tempo-control"><div class="label-line"><label for="tempo-number">' + t.tempo + '</label><span>' + t.tempoRange + ' ' + style.tempo.min + '–' + style.tempo.max + '</span></div><div class="tempo-inputs"><input id="tempo-range" type="range" min="20" max="400" value="' + configuration.tempo + '" data-field="tempo" aria-label="' + t.tempo + '"><input id="tempo-number" class="number-input" type="number" min="20" max="400" value="' + configuration.tempo + '" data-field="tempo" aria-label="' + t.tempo + '"><span>BPM</span></div><small class="tempo-feel" id="tempo-feel">' + tempoFeelLabel(configuration) + '</small></div>'
    + '<label><span>' + t.tempoFeel + '</span><select data-field="tempoFeelId">' + selectOptions(TEMPO_FEELS.map(([id, label]) => ({ id: id as string, label: label as string })), configuration.tempoFeelId) + '</select></label>'
    + '<div class="groove-control"><label><span>' + t.groove + '</span><select data-field="grooveId">' + selectOptions(grooveOptions, configuration.grooveId) + '</select></label>' + previewControl('groove', configuration.grooveId, grooveOptions.find(item => item.id === configuration.grooveId)?.label ?? configuration.grooveId) + '</div><label><span>' + t.energy + '</span><div class="range-labels"><small>' + t.energyLow + '</small><small>' + t.energyHigh + '</small></div><input type="range" min="0" max="100" value="' + configuration.energy + '" data-field="energy" aria-label="' + t.energy + '"></label>'
    + '<label><span>' + t.melodyDensity + '</span><div class="range-labels"><small>' + t.densityLow + '</small><small>' + t.densityHigh + '</small></div><input type="range" min="0" max="100" value="' + configuration.melodyDensity + '" data-field="melodyDensity" aria-label="' + t.melodyDensity + '"></label><label><span>' + t.improvisation + '</span><div class="range-labels"><small>' + t.improvLow + '</small><small>' + t.improvHigh + '</small></div><input type="range" min="0" max="100" value="' + configuration.improvisation + '" data-field="improvisation" aria-label="' + t.improvisation + '"></label></div>'
    + '<details class="advanced-controls"><summary>' + t.advancedTitle + '</summary><div class="control-grid advanced-grid"><label><span>' + t.meter + '</span><select data-field="meter">' + selectOptions(meterOptions, configuration.meter) + '</select>' + (configuration.meter === 'custom' ? '<input class="custom-meter-input" type="text" inputmode="numeric" maxlength="5" data-field="customMeter" aria-label="' + t.customMeterValue + '" placeholder="5/4" value="' + escapeHtml(configuration.customMeter ?? '4/4') + '"><small>' + t.customMeterValue + '</small>' : '') + '</label><label><span>' + t.tonality + '</span><select data-field="tonalityId">' + selectOptions(tonalityOptions, configuration.tonalityId) + '</select></label>'
    + '<label><span>' + t.key + '</span><select data-field="key">' + selectOptions(['auto', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((item) => ({ id: item, label: item === 'auto' ? t.automatic : item })), configuration.key) + '</select><small>' + t.keyHelp + '</small></label><label><span>' + t.optionalInfluence + '</span><select data-field="secondaryStyleId">' + selectOptions(influenceOptions, configuration.secondaryStyleId ?? '') + '</select></label>'
    + '<div class="full-field"><span>' + t.recommendedHarmony + '</span>' + chipGroup('harmonyIds', HARMONIES, configuration.harmonyIds, 'checkbox-chips') + '</div><div class="full-field"><span>' + t.foreground + '</span>' + chipGroup('foregroundRule', [{ id: 'single', label: t.singleLead }, { id: 'gentle', label: t.gentleInteraction }, { id: 'collective', label: t.collectiveInteraction }], [configuration.foregroundRule], 'segmented-chips') + '</div>'
    + '<label><span>' + t.phraseLength + '</span><select data-field="phraseLength">' + selectOptions([{ id: 'short', label: t.short }, { id: 'medium', label: t.medium }, { id: 'long', label: t.long }], configuration.phraseLength) + '</select></label><label><span>' + t.breathingSpace + '</span><select data-field="breathingSpace">' + selectOptions([{ id: 'high', label: t.high }, { id: 'medium', label: t.middle }, { id: 'low', label: t.low }], configuration.breathingSpace) + '</select></label>'
    + '<label><span>' + t.melodyComplexity + '</span><select data-field="melodyComplexity">' + selectOptions([{ id: 'minimal', label: t.minimal }, { id: 'simple', label: t.simple }, { id: 'moderate', label: t.moderate }, { id: 'complex', label: t.complex }, { id: 'virtuosic', label: t.virtuosic }], configuration.melodyComplexity) + '</select></label></div></details></section>'
    + '<section class="panel" aria-labelledby="scene-heading"><div class="panel-heading"><div><p class="eyebrow">04 · FEEL</p><h2 id="scene-heading">' + t.moodsScenes + '</h2></div></div><div class="field-block"><span>' + t.moods + '</span>' + chipGroup('moodIds', MOODS, configuration.moodIds) + '</div><div class="scene-controls"><label><span>' + t.scene + '</span><select data-field="sceneId">' + selectOptions(SCENES, configuration.sceneId) + '</select></label>' + (configuration.sceneId === 'custom' ? '<label><span>' + t.customScene + '</span><input type="text" data-field="customSceneName" value="' + escapeHtml(configuration.customSceneName ?? '') + '" placeholder="A quiet room on a rainy evening"></label>' : '') + '</div></section>'
    + '<section class="panel" aria-labelledby="arrangement-heading"><div class="panel-heading"><div><p class="eyebrow">05 · FORM</p><h2 id="arrangement-heading">' + t.arrangementTitle + '</h2></div></div><div class="control-grid"><label><span>' + t.dynamics + '</span><select data-field="dynamics">' + selectOptions(DYNAMICS.map(([id, label]) => ({ id: id as string, label: label as string })), configuration.dynamics) + '</select></label><label><span>' + t.structure + '</span><select data-field="structure">' + selectOptions(STRUCTURES.map(([id, label]) => ({ id: id as string, label: label as string })), configuration.structure) + '</select></label></div></section>'
    + '<section class="panel" aria-labelledby="production-heading"><div class="panel-heading"><div><p class="eyebrow">06 · RECORDING</p><h2 id="production-heading">' + t.productionTitle + '</h2><p class="section-help">' + t.productionHint + '</p></div></div>' + chipGroup('productionIds', PRODUCTION, configuration.productionIds) + '</section>'
    + '<section class="panel" aria-labelledby="constraints-heading"><div class="panel-heading"><div><p class="eyebrow">07 · GUARDRAILS</p><h2 id="constraints-heading">' + t.constraintsTitle + '</h2><p class="section-help">' + t.constraintsHint + '</p><p class="section-help">' + t.instrumentalOnly + '</p></div></div>' + chipGroup('constraintIds', CONSTRAINTS, configuration.constraintIds) + '</section>'
    + renderCompatibility(configuration)
    + '<section class="panel" aria-labelledby="variation-heading"><div class="panel-heading"><div><p class="eyebrow">08 · EXPLORE</p><h2 id="variation-heading">' + t.variationsTitle + '</h2></div><button class="button button-secondary" type="button" data-action="generate-variations">' + t.generateVariations + '</button></div>' + renderVariations() + '</section>'
    + renderPresets() + '<footer class="site-footer">' + t.footer + '</footer></div>'
    + '<aside class="preview-column"><section class="preview-card" aria-labelledby="preview-heading"><div class="preview-heading"><div><p class="eyebrow">FLOW MUSIC · ENGLISH OUTPUT</p><h2 id="preview-heading">' + t.previewTitle + '</h2></div><span class="live-indicator"><i></i>LIVE</span></div><p class="preview-help">' + t.previewHint + '</p><label class="visually-hidden" for="prompt-output">Generated English Flow Music prompt</label><textarea id="prompt-output" readonly spellcheck="false">' + escapeHtml(compilePrompt(configuration)) + '</textarea><div class="preview-actions"><button class="button button-primary copy-button" type="button" data-action="copy-prompt"><span aria-hidden="true">▣</span> ' + t.copyPrompt + '</button><button class="button button-quiet" type="button" data-action="recompile">' + t.compileAgain + '</button></div><p class="preview-metadata"><span>' + escapeHtml(style.name) + '</span><span>·</span><span>' + configuration.tempo + ' BPM</span><span>·</span><span>' + escapeHtml(meterLabel(configuration)) + '</span></p></section><div class="preview-side-note"><span class="note-symbol">✳</span><p>音樂描述先行。只保留少量必要限制，令 Flow Music 更容易掌握整體方向。</p></div></aside></div><div class="toast" id="toast" role="status" aria-live="polite"></div><div class="update-banner" id="update-banner" hidden><span>' + t.updateAvailable + '</span><button type="button" data-action="reload-update">' + t.reload + '</button></div></main></div>';
  const advanced = root.querySelector<HTMLDetailsElement>('.advanced-controls');
  if (advanced && advancedWasOpen) advanced.open = true;
  if (previousFocus) {
    const focusTarget = [...root.querySelectorAll<HTMLElement>('button, input, select, textarea')].find((element) =>
      (previousFocus.id && element.id === previousFocus.id)
      || (Object.keys(previousFocus.data).length > 0 && Object.entries(previousFocus.data).every(([key, value]) => element.dataset[key] === value)),
    );
    focusTarget?.focus({ preventScroll: true });
  }
}

interface AppState { configuration: MusicConfiguration; variations: MusicConfiguration[]; toastTimer?: number; }
const root = document.querySelector<HTMLElement>('#app')!;
const appState: AppState = { configuration: loadCurrentConfiguration() ?? recommendConfiguration('cozy-jazz'), variations: [] };
function persist(): void { try { saveCurrentConfiguration(appState.configuration); } catch { /* Storage may be disabled in private browsing. */ } }
function notify(message: string): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  toast.textContent = message; toast.classList.add('is-visible'); window.clearTimeout(appState.toastTimer);
  appState.toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
}
function refreshDynamicAreas(): void {
  const output = document.querySelector<HTMLTextAreaElement>('#prompt-output');
  if (output) output.value = compilePrompt(appState.configuration);
  const compatibility = document.querySelector<HTMLElement>('#compatibility-panel');
  if (compatibility) { const wrapper = document.createElement('div'); wrapper.innerHTML = renderCompatibility(appState.configuration); compatibility.replaceWith(wrapper.firstElementChild!); }
  const previewMeta = document.querySelector<HTMLElement>('.preview-metadata');
  if (previewMeta) previewMeta.innerHTML = '<span>' + escapeHtml(STYLE_BY_ID.get(appState.configuration.styleId)?.name ?? '') + '</span><span>·</span><span>' + appState.configuration.tempo + ' BPM</span><span>·</span><span>' + escapeHtml(meterLabel(appState.configuration)) + '</span>';
  const feel = document.querySelector<HTMLElement>('#tempo-feel');
  if (feel) feel.textContent = tempoFeelLabel(appState.configuration);
}
function updateConfiguration(field: string, value: unknown): void {
  const current = appState.configuration;
  switch (field) {
    case 'tempo': current.tempo = Math.max(20, Math.min(400, Number(value) || 20)); break;
    case 'tempoFeelId': current.tempoFeelId = value as MusicConfiguration['tempoFeelId']; break;
    case 'energy': current.energy = Number(value); break;
    case 'melodyDensity': current.melodyDensity = Number(value); break;
    case 'improvisation': current.improvisation = Number(value); break;
    case 'meter': current.meter = String(value); break;
    case 'customMeter': current.customMeter = String(value).slice(0, 5); break;
    case 'grooveId': current.grooveId = String(value); break;
    case 'tonalityId': current.tonalityId = String(value); break;
    case 'key': current.key = String(value); break;
    case 'sceneId': current.sceneId = String(value); break;
    case 'customStyleName': current.customStyleName = String(value).slice(0, 100); break;
    case 'customSceneName': current.customSceneName = String(value).slice(0, 100); break;
    case 'dynamics': current.dynamics = String(value); break;
    case 'structure': current.structure = String(value); break;
    case 'foregroundRule': current.foregroundRule = value as MusicConfiguration['foregroundRule']; break;
    case 'phraseLength': current.phraseLength = value as MusicConfiguration['phraseLength']; break;
    case 'breathingSpace': current.breathingSpace = value as MusicConfiguration['breathingSpace']; break;
    case 'melodyComplexity': current.melodyComplexity = value as MusicConfiguration['melodyComplexity']; break;
    case 'secondaryStyleId': current.secondaryStyleId = value ? String(value) : undefined; break;
  }
  persist(); refreshDynamicAreas();
}
function toggleValue(group: string, value: string): void {
  if (group === 'foregroundRule') appState.configuration.foregroundRule = value as MusicConfiguration['foregroundRule'];
  else {
    const target = appState.configuration[group as 'harmonyIds' | 'moodIds' | 'productionIds' | 'constraintIds'];
    const index = target.indexOf(value);
    if (index >= 0) target.splice(index, 1); else target.push(value);
  }
  persist(); refreshDynamicAreas();
  for (const chip of root.querySelectorAll<HTMLButtonElement>('[data-action="toggle-chip"]')) {
    if (chip.dataset.group !== group) continue;
    const selected = group === 'foregroundRule'
      ? appState.configuration.foregroundRule === chip.dataset.value
      : appState.configuration[group as 'harmonyIds' | 'moodIds' | 'productionIds' | 'constraintIds'].includes(chip.dataset.value ?? '');
    chip.classList.toggle('is-selected', selected);
    chip.setAttribute('aria-pressed', String(selected));
  }
}
function downloadJson(name: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url;
  const safeName = Array.from(name.normalize('NFC').trim(), (char) => char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/u.test(char) ? '-' : char)
    .join('').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[.-]+|[. -]+$/g, '').slice(0, 80);
  anchor.download = (safeName || 'flowmusic-preset') + '.json'; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function findPreset(id: string): UserPreset | undefined { return listPresets().find((preset) => preset.id === id); }
function handleClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  if (!button) return;
  const action = button.dataset.action; const id = button.dataset.id ?? '';
  if (action === 'preview-audio') { togglePreview(button, message => notify(message));
  } else if (action === 'select-style') {
    appState.configuration.styleId = id; appState.variations = []; persist(); render();
  } else if (action === 'apply-recommendation') {
    appState.configuration = recommendConfiguration(appState.configuration.styleId); appState.variations = []; persist(); render(); notify(t.recommendedApplied);
  } else if (action === 'toggle-chip') toggleValue(button.dataset.group ?? '', button.dataset.value ?? '');
  else if (action === 'remove-instrument') { appState.configuration.instruments.splice(Number(button.dataset.index), 1); persist(); render(); }
  else if (action === 'copy-prompt') {
    const output = document.querySelector<HTMLTextAreaElement>('#prompt-output');
    if (output && navigator.clipboard?.writeText) navigator.clipboard.writeText(output.value).then(() => notify(t.copied)).catch(() => { output.select(); notify(t.promptCopiedFallback); });
    else if (output) { output.select(); notify(t.promptCopiedFallback); }
  } else if (action === 'recompile') { refreshDynamicAreas(); notify(t.promptRefreshed); }
  else if (action === 'generate-variations') { appState.variations = generateVariations(appState.configuration); render(); }
  else if (action === 'apply-variation') {
    const variation = appState.variations[Number(button.dataset.index)];
    if (variation) { appState.configuration = { ...appState.configuration, instruments: variation.instruments }; persist(); render(); }
  } else if (action === 'save-preset') {
    const input = document.querySelector<HTMLInputElement>('#preset-name');
    if (!input?.value.trim()) { notify(t.presetNameRequired); input?.focus(); return; }
    try { savePreset(input.value, appState.configuration); render(); notify(t.presetSaved); } catch { notify(t.presetNameRequired); }
  } else if (action === 'load-preset') {
    const preset = findPreset(id); if (preset) { appState.configuration = structuredClone(preset.configuration); persist(); render(); notify(t.presetLoaded); }
  } else if (action === 'rename-preset') {
    const preset = findPreset(id); if (!preset) return;
    const name = window.prompt(t.presetName, preset.name);
    if (name?.trim()) { savePreset(name, preset.configuration, undefined, preset.id); render(); }
  } else if (action === 'duplicate-preset') {
    const preset = findPreset(id); if (!preset) return;
    savePreset(preset.name + ' (' + t.presetCopySuffix + ')', preset.configuration); render(); notify(t.presetSaved);
  } else if (action === 'delete-preset') {
    if (window.confirm(t.confirmDelete)) { deletePreset(id); render(); notify(t.presetDeleted); }
  } else if (action === 'export-preset') { const preset = findPreset(id); if (preset) downloadJson(preset.name, exportPresetJson(preset)); }
  else if (action === 'import-preset') document.querySelector<HTMLInputElement>('#preset-file')?.click();
  else if (action === 'reload-update') {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    navigator.serviceWorker.getRegistration().then((registration) => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' }));
  }
}
function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.matches('[data-part-index][data-part-field]')) {
    const part = appState.configuration.instruments[Number(target.dataset.partIndex)]; if (!part) return;
    const field = target.dataset.partField;
    if (field === 'enabled' && target instanceof HTMLInputElement) part.enabled = target.checked;
    else if (field === 'role') {
      const supportedRoles = INSTRUMENT_BY_ID.get(part.instrumentId)?.roles ?? [];
      part.role = supportedRoles.includes(target.value as InstrumentRole) ? target.value as InstrumentRole : supportedRoles[0] ?? part.role;
      target.value = part.role;
    }
    else if (field === 'prominence') part.prominence = Number(target.value);
    else if (field === 'behaviour') part.behaviour = INSTRUMENT_BY_ID.get(part.instrumentId)?.behaviours[Number(target.value)] ?? '';
    persist();
    target.closest('.instrument-row')?.classList.toggle('is-disabled', !part.enabled);
    if (field === 'behaviour' && part) { const instrument = INSTRUMENT_BY_ID.get(part.instrumentId); const preview = target.closest('.instrument-row')?.querySelector<HTMLButtonElement>('[data-preview-category="behaviour"]'); if (preview && instrument) { const label = instrumentBehaviourLabelZhHK(part.behaviour); preview.dataset.previewKey = instrument.id + '::' + part.behaviour; preview.dataset.previewName = instrument.nameZh + ' · ' + label; preview.setAttribute('aria-label', (preview.dataset.previewIdle ?? t.preview) + ' ' + instrument.nameZh + ' · ' + label); } }
    const prominenceLabel = target.closest('label')?.querySelector('span');
    if (field === 'prominence' && prominenceLabel) prominenceLabel.textContent = t.prominence + ' · ' + part.prominence;
    refreshDynamicAreas(); return;
  }
  if (target.id === 'instrument-picker' && target.value) {
    const instrument = INSTRUMENT_BY_ID.get(target.value);
    if (instrument) {
      const rolePriority: InstrumentRole[] = ['lead', 'bass', 'rhythm', 'response', 'harmony', 'countermelody', 'texture'];
      const role = rolePriority.find((candidate) => instrument.roles.includes(candidate)) ?? instrument.roles[0] ?? 'texture';
      appState.configuration.instruments.push({ instrumentId: instrument.id, enabled: true, role, prominence: role === 'lead' ? 60 : 40, behaviour: instrument.behaviours[0] ?? '' });
      persist(); render();
    }
    return;
  }
  if (target.id === 'preset-file' && target instanceof HTMLInputElement && target.files?.[0]) {
    target.files[0].text().then((text) => { if (importPresetJson(text)) { render(); notify(t.presetSaved); } else notify(t.invalidPreset); }).catch(() => notify(t.invalidPreset));
    target.value = ''; return;
  }
  const field = target.dataset.field;
  if (field === 'customMeter' && !isValidMeter(target.value)) {
    target.value = appState.configuration.customMeter ?? '4/4';
    notify(t.invalidMeter);
    return;
  }
  if (field) {
    updateConfiguration(field, target.value);
    if (field === 'tempo') {
      const value = String(appState.configuration.tempo);
      const number = document.querySelector<HTMLInputElement>('#tempo-number');
      const range = document.querySelector<HTMLInputElement>('#tempo-range');
      if (number) number.value = value;
      if (range) range.value = value;
    }
    if (field === 'meter' || field === 'sceneId' || field === 'grooveId') render();
  }
}
function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target.id === 'style-search') { const grid = document.querySelector<HTMLElement>('#style-grid'); if (grid) grid.innerHTML = renderStyleCards(target.value); return; }
  if (target.matches('[data-part-index][data-part-field="prominence"]')) {
    const part = appState.configuration.instruments[Number(target.dataset.partIndex)];
    if (part) {
      part.prominence = Number(target.value);
      const label = target.closest('label')?.querySelector('span');
      if (label) label.textContent = t.prominence + ' · ' + part.prominence;
      persist(); refreshDynamicAreas();
    }
    return;
  }
  const field = target.dataset.field;
  if (field && (target.type === 'range' || field === 'tempo' || field === 'customStyleName' || field === 'customSceneName' || field === 'customMeter')) {
    if (field === 'customMeter' && !isValidMeter(target.value)) return;
    updateConfiguration(field, target.value);
    if (field === 'tempo') {
      const number = document.querySelector<HTMLInputElement>('#tempo-number'); const slider = document.querySelector<HTMLInputElement>('#tempo-range');
      if (target.id === 'tempo-range' && number) number.value = String(appState.configuration.tempo);
      if (target.id === 'tempo-number' && slider) slider.value = String(appState.configuration.tempo);
    }
  }
}
root.addEventListener('click', handleClick); root.addEventListener('change', handleChange); root.addEventListener('input', handleInput);
render();
function registerPwa(): void {
  const status = document.querySelector<HTMLElement>('#offline-status');
  if (!('serviceWorker' in navigator)) {
    if (status) status.textContent = t.offlineUnavailable;
    return;
  }
  const base = import.meta.env.BASE_URL;
  navigator.serviceWorker.register(base + 'sw.js', { scope: base }).then((registration) => {
    const markReady = () => { if (status) status.textContent = t.offlineReady; };
    if (registration.active) markReady();
    else navigator.serviceWorker.ready.then(markReady).catch(() => { if (status) status.textContent = t.offlineUnavailable; });
    const banner = document.querySelector<HTMLElement>('#update-banner');
    const showUpdate = () => { if (registration.waiting && navigator.serviceWorker.controller && banner) banner.hidden = false; };
    showUpdate();
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      installingWorker?.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') showUpdate();
      });
    });
  }).catch(() => { if (status) status.textContent = t.offlineUnavailable; });
}
registerPwa();
