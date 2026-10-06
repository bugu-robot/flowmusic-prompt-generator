# Architecture decisions

## D-001 — No inference API

Prompt generation, recommendations, compatibility and variations use deterministic local rules. No OpenAI, Gemini, Claude or paid inference service is part of the application.

## D-002 — No backend

The production output is static. There is no Python or Node application server and no external database. Current configuration and user presets are stored in the browser.

## D-003 — Deterministic prompt compiler

Prompt output uses explicit section order, data-backed style guidance, instrument role templates and bounded constraint groups. Groups contain only the selected restrictions and do not drop selections to meet the sentence limit. Recompiling the same valid configuration produces the same English text.

## D-004 — Traditional Chinese interface, English prompt

The product interface targets Traditional Chinese users in Hong Kong (zh-HK). Flow Music output remains English. Established English Jazz terms are retained where they are clearer.

## D-005 — Vanilla TypeScript

Vite and Vanilla TypeScript keep the client small and the layers easy to inspect. No framework is needed for this form-driven application.

## D-006 — Local-first PWA

The manifest and service worker provide installation and offline shell support. The service worker offers a waiting update for user-triggered reload. Browser and device installation behavior remains a manual verification item.

## D-007 — Data-driven Jazz styles

Style and instrument knowledge is held in typed data modules, separate from UI code and Flow/Lyria compiler rules. Modern descriptors such as Cozy Jazz and Brisk Jazz are explicitly not labelled as formal historical genres.

Default warning candidates are evaluated against the relevant instrument families and exclusions, producing a style-specific list. Explicit style lists and derived defaults exclude every instrument recommended by that style. Clearly incompatible warnings remain, while family-appropriate instruments such as Tuba in traditional Jazz and Synthesizer in Fusion/Nu Jazz are not flagged by a universal default.

## D-008 — Compatibility is advisory

Unusual instrument combinations are not blocked. The numeric score exposes its rule factors and is labelled as a reference heuristic.

## D-009 — No automatic reset when changing styles

Selecting a new style preserves the current musical choices. Applying the new style's recommendations is a separate explicit action.

## D-010 — Build-derived service-worker cache identity

Vite hashes the app version, lockfile, HTML, source modules, public assets, Vite build config, service-worker template, build mode and base path to create a deterministic cache identity. The build emits the service worker from a checked-in template without adding a PWA dependency. Activation removes older caches with the FlowMusic prefix, while the existing in-app action keeps updates user-controlled.

## D-011 — V1 is always instrumental

`Instrumental only, no vocals.` is a fixed compiler rule. Vocal and scat exclusions are not selectable options because toggling them cannot change this requirement. The existing constraints section displays a non-editable Traditional Chinese instrumental indication. Legacy preset IDs are filtered during normalization.

## D-012 — Supported, audited development toolchain

CI uses Node.js 24 LTS; the project also supports Node.js 22.13+. ESLint 10.12.0 with @eslint/js 10.0.1 and TypeScript-ESLint 8.71.1 replaces the unsupported ESLint 9 line without disabling lint rules or changing the configuration architecture.

Vitest 4.1.11 is the smallest maintained major containing the mocker path-traversal fix. Vitest 3 has no backport. Version 4 also removes the vulnerable Tinypool dependency used by version 3. These narrowly required major upgrades replace `npm audit fix --force`; Vite stays on version 7 and TypeScript stays on version 5.9. All packages are development-only, but compromised test/build tools can affect developer machines or generated artifacts, so their audit findings are resolved rather than ignored. CI runs `npm audit` as a gate.

References: [Vitest advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Tinypool worker-options advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [Tinypool run-options advisory](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [ESLint version support](https://eslint.org/version-support/).
