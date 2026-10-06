# Architecture decisions

## D-001 — No inference API

Prompt generation, recommendations, compatibility and variations use deterministic local rules. No OpenAI, Gemini, Claude or paid inference service is part of the application.

## D-002 — No backend

The production output is static. There is no Python or Node application server and no external database. Current configuration and user presets are stored in the browser.

## D-003 — Deterministic prompt compiler

Prompt output uses explicit section order, data-backed style guidance, instrument role templates and bounded constraint groups. Recompiling the same valid configuration produces the same English text.

## D-004 — Traditional Chinese interface, English prompt

The product interface targets Traditional Chinese users in Hong Kong (zh-HK). Flow Music output remains English. Established English Jazz terms are retained where they are clearer.

## D-005 — Vanilla TypeScript

Vite and Vanilla TypeScript keep the client small and the layers easy to inspect. No framework is needed for this form-driven application.

## D-006 — Local-first PWA

The manifest and service worker provide installation and offline shell support. The service worker offers a waiting update for user-triggered reload. Browser and device installation behavior remains a manual verification item.

## D-007 — Data-driven Jazz styles

Style and instrument knowledge is held in typed data modules, separate from UI code and Flow/Lyria compiler rules. Modern descriptors such as Cozy Jazz and Brisk Jazz are explicitly not labelled as formal historical genres.

## D-008 — Compatibility is advisory

Unusual instrument combinations are not blocked. The numeric score exposes its rule factors and is labelled as a reference heuristic.

## D-009 — No automatic reset when changing styles

Selecting a new style preserves the current musical choices. Applying the new style's recommendations is a separate explicit action.

## D-010 — Build-derived service-worker cache identity

Vite hashes the app version, lockfile, HTML, source modules, public assets, Vite build config, service-worker template, build mode and base path to create a deterministic cache identity. The build emits the service worker from a checked-in template without adding a PWA dependency. Activation removes older caches with the FlowMusic prefix, while the existing in-app action keeps updates user-controlled.
