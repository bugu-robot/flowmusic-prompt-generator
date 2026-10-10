# FlowMusic Prompt Generator

FlowMusic Prompt Generator is a local-first Progressive Web App for building clear English Jazz prompts for Google Flow Music. Its controls, presets and guidance use Hong Kong Traditional Chinese. Prompt generation runs in the browser using deterministic TypeScript rules; the app does not call an AI API or require a server.

## Features

- Searchable, data-driven Jazz styles, including historical genres and clearly labelled modern descriptors such as Cozy Jazz and Brisk Jazz.
- Role-based instrument setup, tempo, meter, groove, harmony, tonality, mood, arrangement and production controls.
- Live English prompt compilation and an advisory compatibility score with visible rule factors.
- Curated, repeatable arrangement variations.
- Local presets with rename, duplicate, delete, JSON import and export.
- Installable PWA with an offline shell and local-only prompt generation.

The catalog has 38 options: 37 fixed built-in styles plus Custom. The 12 expanded styles are Lo-fi Jazz / Chill Jazz, Acid Jazz, Big Band Jazz, Samba Jazz, Jazz Waltz, Piano Jazz / Café Piano Jazz, Contemporary Jazz, Free Jazz / Avant-Garde Jazz, Jazz-Hop / Hip-Hop Jazz, Neo-Soul Jazz, Dark Jazz / Noir Jazz, and Third Stream Jazz.

## Local development

Node.js 24 LTS is recommended and used in CI. Node.js 22.13+ is also supported; Node.js 22.0–22.12 is unsupported by the lint toolchain.

~~~sh
npm ci
npm run dev
~~~

## Checks and production build

~~~sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run build -- --mode pages
npm audit
npm run preview
~~~

For a local preview using the GitHub Pages path:

~~~sh
npm run build -- --mode pages
npm run preview
~~~

## GitHub Pages

The deployment workflow builds to /flowmusic-prompt-generator/ and publishes the static dist directory. In the repository settings, set Pages to use GitHub Actions. A push to main deploys the checked and tested build. Pull requests run dependency audit, verification and both builds without publishing. Concurrency groups are isolated by event and ref so PR verification cannot cancel a main deployment.

## Install and offline use

Serve the site over HTTPS (or localhost), open it once while connected, then use the browser's install action. The service worker precaches the app shell, generated bundles, manifest and manifest icons. Each build receives a deterministic cache identity derived from the app version and production inputs; activation removes older FlowMusic caches. Configuration and saved presets stay in localStorage on the current browser. A waiting update is offered with an in-app reload action and is not activated until the user chooses to reload.

The PWA shell and prompt compiler work without a network connection after the first successful load. Browser installation and offline behavior depend on the browser and device and should be verified on the target device.

## Project architecture

~~~text
src/
  data/       Jazz styles, instrument catalog, music options
  engine/     recommendation, compatibility, prompt and variation rules
  i18n/       Traditional Chinese UI copy
  models/     TypeScript domain types
  storage/    localStorage and JSON preset serialization
  ui/         responsive browser interface
public/
  apple-touch-icon.png
  manifest.webmanifest
  icon-192.png
  icon-512.png
  icon-maskable-192.png
  icon-maskable-512.png
  icon.svg
  icon-maskable.svg
scripts/
  service-worker.template.js
vite.config.ts  build identity and emitted dist/sw.js
~~~

Every generated prompt ends with a fixed instruction to use only the explicitly selected instruments and not introduce any additional instruments or percussion. This applies to all styles, including Custom and A/B/C variations, and does not add a new option or change saved configurations.

The style and instrument catalogs contain musical recommendations. Each style can provide a musical `promptStyle` opening; classification metadata remains for UI and documentation. Flow Music prompt rules live separately in src/engine/prompt-rules.ts and src/engine/prompt-compiler.ts. V1 always compiles `Instrumental only, no vocals.`; the interface shows a fixed instrumental indication, and optional avoidance selections emit only the selected restrictions. Preset imports validate IDs against the shared catalogs while preserving globally valid grooves and tonalities retained after a style change.

All npm packages are development tools, not runtime services. The shipped bundle contains only the browser application; security audit findings in test/build tools still matter because those tools run with developer or CI permissions. See STATUS.md for the audit triage and verification results.
