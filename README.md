# FlowMusic Prompt Generator

FlowMusic Prompt Generator is a local-first Progressive Web App for building clear English Jazz prompts for Google Flow Music. Its controls, presets and guidance use Hong Kong Traditional Chinese. Prompt generation runs in the browser using deterministic TypeScript rules; the app does not call an AI API or require a server.

## Features

- Searchable, data-driven Jazz styles, including historical genres and clearly labelled modern descriptors such as Cozy Jazz and Brisk Jazz.
- Role-based instrument setup, tempo, meter, groove, harmony, tonality, mood, arrangement and production controls.
- Live English prompt compilation and an advisory compatibility score with visible rule factors.
- Curated, repeatable arrangement variations.
- Local presets with rename, duplicate, delete, JSON import and export.
- Installable PWA with an offline shell and local-only prompt generation.

## Local development

Requires Node.js 22 or later.

~~~sh
npm install
npm run dev
~~~

## Checks and production build

~~~sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
~~~

For a local preview using the GitHub Pages path:

~~~sh
npm run build -- --mode pages
npm run preview
~~~

## GitHub Pages

The deployment workflow builds to /flowmusic-prompt-generator/ and publishes the static dist directory. In the repository settings, set Pages to use GitHub Actions. A push to main deploys the checked and tested build. Pull requests can run the same verification command without publishing.

## Install and offline use

Serve the site over HTTPS (or localhost), open it once while connected, then use the browser's install action. The service worker caches the app shell and same-origin assets as they are requested. Configuration and saved presets stay in localStorage on the current browser. A waiting update is offered with an in-app reload action.

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
  manifest.webmanifest
  sw.js
~~~

The style and instrument catalogs contain musical recommendations. Flow Music prompt rules live separately in src/engine/prompt-rules.ts and src/engine/prompt-compiler.ts. Add a style to the data catalog and focused engine tests; no UI rewrite or hosted service is needed.
