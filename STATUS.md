# Project Status

## AUTOMATED VERIFIED

- [x] 26 data-driven Jazz styles and 32 instruments, including Manouche / Selmer-style acoustic guitar.
- [x] Built-in references, unique IDs, variation recipes and recommended configurations checked against all option catalogs.
- [x] Recommendation, compatibility, deterministic prompt compilation, role normalization and local preset serialization covered by unit tests.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm test` passes: 39 tests across 6 files.
- [x] `npm run build` passes.
- [x] `npm run build -- --mode pages` passes.
- [x] GitHub Pages output checked for `/flowmusic-prompt-generator/` paths, manifest, worker registration, Apple touch icon and every manifest icon.
- [x] Standard 192×192 and 512×512 PNG icons, separate maskable icons, and a 180×180 Apple touch icon are present in the build output.
- [x] Normal and Pages builds receive different deterministic service-worker cache identities; the worker removes older FlowMusic caches and preserves user-controlled update activation.
- [x] Node.js 22.12 is selected in GitHub Actions; Node.js 20.19+ or 22.12+ is documented for local development.
- [x] This correction pass targets the existing open Draft PR #1 on `feat/initial-pwa`; it remains unmerged.

## MANUAL UAT STILL REQUIRED

No browser, installation, offline-reopen or update behavior has been manually verified. Consolidated UAT remains for:

- Windows Chrome and iPhone Safari page loading and Traditional Chinese display.
- Style selection, explicit recommendation application, instrument roles, prompt quality, copy action and compatibility feedback.
- Curated variations, local preset save/load, and JSON import/export.
- PWA installation, closing and reopening offline, and the user-controlled update prompt.

## Known limitations and next steps

- Saved presets remain in localStorage on the current browser and are not synchronized.
- Flow Music prompt quality remains deterministic and may respond differently across Flow/Lyria releases.
- Enable GitHub Pages with GitHub Actions in repository settings before publishing from `main`.
- Run the consolidated manual UAT above after the correction commit's GitHub Actions check completes.
