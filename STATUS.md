# Project Status

## AUTOMATED VERIFIED

- [x] 38 data-driven style options: 37 fixed built-in Jazz styles plus Custom, using the existing 32-instrument catalog. The 12 added styles are documented in README.md.
- [x] Built-in references, unique IDs, variation recipes and recommended configurations checked against all option catalogs.
- [x] Every style's recommended instrument IDs have zero overlap with unusual instruments; compatibility tests cover default recommendations and all recommended alternatives. Clearly incompatible warnings remain.
- [x] Optional constraints emit only selected restrictions. V1 always emits `Instrumental only, no vocals.` and shows a fixed instrumental indication without vocal/scat controls.
- [x] All style variations remain deterministic, use unique IDs and supported roles, and retain one primary lead, one bass and available ensemble support after duplicate candidate selection.
- [x] Imported shared option IDs are validated and deduplicated; unknown scene, dynamics and structure IDs fall back safely. Non-string enum selections are rejected. Globally valid retained grooves/tonalities survive a style change.
- [x] Gypsy Jazz keeps `maj6` without the redundant `sixth` recommendation.
- [x] Recommendation, compatibility, deterministic prompt compilation, role normalization and local preset serialization covered by unit tests.
- [x] Style-specific recommended part behaviors remain deterministic and editable through the existing instrument behavior controls. All 25 new behavior strings have Traditional Chinese labels; the source behavior strings stay English for prompt generation.
- [x] The added styles use the existing deterministic recommendation, prompt and compatibility engines. Big Band and Free Jazz variations retain their defining large-ensemble and collective-improvisation identities.
- [x] New Orleans Jazz and Dixieland defaults use trumpet/cornet, clarinet and the catalog's trombone for overlapping but coherent collective front-line improvisation.
- [x] All 37 fixed-style default prompts generated and checked; the 12 added styles align with the independent expanded benchmark, and SHA-256 regression checks preserve the prior 25 default prompts byte-for-byte. Custom remains separate and user-defined.
- [x] `npm ci` passes with the regenerated lockfile on Node.js 24.19.0, without EBADENGINE or an ESLint deprecation warning.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm test` passes: 220 tests across 6 files.
- [x] `npm run build` passes.
- [x] `npm run build -- --mode pages` passes.
- [x] GitHub Pages output checked for `/flowmusic-prompt-generator/` paths, manifest, worker registration, Apple touch icon and every manifest icon.
- [x] Standard 192×192 and 512×512 PNG icons, separate maskable icons, and a 180×180 Apple touch icon are present in the build output.
- [x] Normal and Pages builds receive different deterministic service-worker cache identities; the worker removes older FlowMusic caches and preserves user-controlled update activation.
- [x] `npm audit` reports 0 vulnerabilities, including 0 critical findings.
- [x] Node.js 24 LTS is selected in GitHub Actions and recommended in README; Node.js 22.13+ is the supported alternative.
- [x] CI audits dependencies and verifies both normal and Pages builds. Event/ref-specific concurrency prevents PR verification from cancelling a main deployment.
- [x] The expansion is on `feat/expanded-jazz-styles` based on production `main`; the new pull request is draft-only and must not be merged in this pass.

Expanded style pass verified locally on 2026-10-06 with Node.js 24.19.0: `npm ci`, `npm run typecheck`, `npm run lint`, 220 tests across 6 files, `npm run build`, `npm run build -- --mode pages`, and `npm audit` pass; audit reports 0 vulnerabilities. Both build outputs contain the manifest, service worker, Apple touch icon and every manifest icon. The Pages bundle uses `/flowmusic-prompt-generator/`, and the normal and Pages worker cache identities differ. Prompt/style semantics only are verified; no generated audio has been assessed. The Draft PR's GitHub Actions run remains a separate CI gate before manual UAT.

## Security audit triage

The reviewed lockfile reported three affected packages (one moderate, two critical):

| Package before correction | Relation | Severity | Finding / correction |
| --- | --- | --- | --- |
| `vitest@3.2.7` | Direct devDependency | Critical aggregate | Includes its moderate mocker advisory and vulnerable transitive worker dependency; upgraded to `4.1.11`. |
| `@vitest/mocker@3.2.7` | Transitive devDependency | Moderate | GHSA-82fw-gwwq-j7x9: mock-interceptor path traversal / local file read; patched in `4.1.11`. |
| `tinypool@1.1.1` | Transitive devDependency | Critical | GHSA-5gmw-xhrv-c9v3 and GHSA-85c8-ppgw-ccpr: prototype-pollution paths to worker-process code execution; no longer installed with Vitest 4. |

No patched Vitest 3 release is available. Vitest 4.1.11 is the smallest maintained secure major compatible with the current Vite 7 setup; no forced audit fix or dependency overrides were used. ESLint is now 10.12.0 with @eslint/js 10.0.1 and TypeScript-ESLint 8.71.1, using the existing lint configuration and rules.

**Build toolchain risk:** the affected test tools execute with developer/CI permissions and can affect files or generated artifacts, so dev-only findings required correction.

**Shipped runtime risk:** the PWA has no runtime npm dependencies. Both built JavaScript source maps contain only local application sources and no `node_modules` sources; the affected test tools are absent from the static browser bundle. The final full audit has zero remaining findings, so none remain to justify as dev-only exceptions.

## MANUAL UAT STILL REQUIRED

No browser, installation, offline-reopen or update behavior has been manually verified. Consolidated UAT remains for:

- Windows Chrome and iPhone Safari page loading and Traditional Chinese display.
- Style selection, explicit recommendation application, instrument roles, prompt quality, copy action and compatibility feedback.
- Curated variations, local preset save/load, and JSON import/export.
- PWA installation, closing and reopening offline, and the user-controlled update prompt.

No actual Flow Music audio quality is claimed as verified; audio UAT remains the next step after this semantic correction.

## Known limitations and next steps

- Saved presets remain in localStorage on the current browser and are not synchronized.
- Flow Music prompt quality remains deterministic and may respond differently across Flow/Lyria releases.
- Enable GitHub Pages with GitHub Actions in repository settings before publishing from `main`.
- Development stops after the correction commit's GitHub Actions verification. The next step is the consolidated manual UAT above; no additional features are in scope.
