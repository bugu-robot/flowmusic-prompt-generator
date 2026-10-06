# Product and engineering specification

## Workflow

1. Start with Cozy Jazz recommendations and a live prompt.
2. Choose or search a style. Changing the style updates the style context and recommendations, while retaining current controls.
3. Explicitly apply that style's recommended setup when desired.
4. Edit instruments, roles, musical controls, mood, structure, production and constraints.
5. Review advisory style-compatibility factors and warnings.
6. Copy the deterministic English prompt or recompile it without changing the configuration.
7. Save, rename, load, duplicate, delete, import or export local presets.

## Data model

JazzStyle stores an ID, display names, classification, family, Traditional Chinese description, an optional English `promptStyle` opening, tempo range, meters, grooves, tonalities, harmony, recommended instruments by role, moods, scenes, density, improvisation, energy, dynamics, arrangement, production, constraints, compatible styles, atypical instruments and three curated variation recipes. A style may specify deterministic role-specific recommended parts with a selected instrument behavior, plus an appropriate default foreground interaction. If it does not, recommendations use the instrument's existing default behavior and single-foreground rule. `promptStyle` describes the sound directly; historical versus modern-descriptor classification remains metadata for the Traditional Chinese interface and documentation.

Instrument stores bilingual display names, category, supported roles, musical families, atypical families, prompt wording and role-neutral playing-behavior choices. InstrumentPart holds the selected instrument, enabled state, role, prominence and behavior.

MusicConfiguration is the complete editable setup. Presets are versioned JSON objects that contain a configuration snapshot. Input is normalized and bounded when loaded or imported; invalid style IDs and unknown instruments are rejected. Unsupported instrument roles are replaced by a safe role declared by that instrument. Harmony, mood, production and constraint arrays filter unknown IDs and remove duplicates; an unknown scene falls back to `quiet-cafe`. Invalid dynamics and structure IDs fall back to `stable` and `continuous`; enum selections must be strings, so arrays cannot masquerade as valid IDs. Grooves and tonalities are checked against the complete catalogs rather than just the selected style, preserving valid values retained across style changes. Unknown groove and tonality IDs fall back to `open` and `warm-major`. Built-in style data, recommendations and variation recipes are covered by referential-integrity tests against their shared catalogs.

## Jazz-style classifications

- historical-style: a named historical or established Jazz style.
- historical-derived-style: a recognized hybrid or later style rooted in Jazz practice.
- modern-descriptor: a mood or tempo description, not a claim of a formal historical genre.
- custom: a user-named description.

Cozy Jazz and Brisk Jazz use modern-descriptor.

## Instrument schema

Roles are lead, response, harmony, bass, rhythm, texture and countermelody. The prompt compiler chooses the highest-prominence enabled lead as the foreground lead. Other instruments assigned to lead are rendered as response parts, so the prompt does not ask for several simultaneous foreground melodies.

## Prompt compiler

FLOW_PROMPT_RULES contains versioned output rules. compilePrompt assembles the prompt in a stable order:

1. Style and optional compatible influence
2. BPM, meter and groove
3. Tonality and optional key
4. Scene and mood
5. Instrument roles and interactions
6. Harmonic language
7. Melody density, complexity, phrase length, breathing space, improvisation and foreground rule
8. Dynamics
9. Arrangement development
10. Recording character
11. Instrumental requirement and a small set of grouped constraints

Compiler rules describe intended sound before exclusions. V1 always emits `Instrumental only, no vocals.` and has no vocals mode. The interface displays a non-editable instrumental indication; `vocals` and `scat` are absent from the selectable constraint catalog and are discarded from legacy imports. Every optional constraint uses only its selected catalog wording; grouping never adds an unselected restriction. Selections are combined into at most three optional sentences without dropping selected items. Compilation is deterministic and local.

## Recommendation and compatibility

The recommendation engine creates a full, editable configuration from the selected style data. The compatibility engine returns a 0–100 reference score plus each factor's contribution: tempo 18, meter 8, groove 14, instruments and roles 26, harmony 10, melody density 8, improvisation 8 and production 8.

This score is a transparent product heuristic, not a music-science measurement. Unusual combinations remain allowed; warnings are advisory. Default warning candidates are evaluated against instrument-family compatibility and exclusions, while explicit style-specific lists remain supported. All recommended lead, response, harmony, bass and rhythm IDs are excluded from that style's atypical list. Recommended configurations and alternatives must not receive instrument warnings for their own recommendations.

The variation engine keeps the existing three curated recipes from the selected style record. If a requested instrument is already used, it selects the next unused, role-supported candidate from that style's relevant recommendation list. Harmonic and rhythmic support is retained where candidates are available; each generated ensemble has unique IDs, one primary lead and one bass where the style provides bass. No randomness is used.

## Localization

The application document and user-facing controls use Traditional Chinese for Hong Kong (zh-HK). English remains for common Jazz and production terminology, and selected controls use bilingual terminology where helpful. Generated prompts remain English. UI copy belongs in src/i18n/zh-HK.ts; the style and instrument data hold their domain-specific bilingual names and descriptions. Instrument role selectors expose only the roles listed in each instrument's supported-role catalog during normal editing.

## Offline and deployment

Vite builds static assets. The PWA manifest uses relative scope and start URL and includes install-size PNG icons, maskable PNG icons, an SVG icon and an Apple touch icon. A Vite build plugin hashes the app version, lockfile, source, public assets, HTML and service-worker template into a deterministic cache identity and emits `dist/sw.js`. The service worker precaches the app shell and manifest icons, removes prior FlowMusic caches on activation and waits for user action before activating an update. GitHub Pages builds with the repository path /flowmusic-prompt-generator/. There is no runtime server, cloud database or inference API.
