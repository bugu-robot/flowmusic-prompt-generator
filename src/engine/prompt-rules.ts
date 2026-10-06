export const FLOW_PROMPT_RULES = {
  version: '1.0',
  requiredOpening: 'style',
  order: ['style', 'tempo-meter-groove', 'key-tonality', 'scene-mood', 'instrument-roles', 'harmony', 'melody', 'dynamics', 'arrangement', 'production', 'constraints'],
  alwaysInstrumental: true,
  maxOptionalNegativeConstraints: 3,
  roleRule: 'Emit a single foreground lead voice; additional lead assignments are rewritten as quiet response roles.',
  preference: 'Describe intended musical behavior before concise exclusions.',
  englishPrompt: true,
} as const;
