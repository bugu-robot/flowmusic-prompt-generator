# Project Status

## PR #6 source-intent equivalence correction — local verification (2026-10-07)

- Continued `fix/audio-preview-fidelity` from reviewed head `ac344985816b1b498d61dc2a7dbe0344f82b167e`. Prompt generation, musical option catalogs, recommendations, compatibility, variations and the product UI are unchanged.
- Removed all generated family/pattern equivalence exemptions. Accepted reuse now requires an identical complete behaviour description or one of four explicitly reviewed source-ID/description alias rules, each with a musical rationale. Edited descriptions invalidate their old exemption. Spec comparisons use actual SoundFont bank/program and events; instrument/role names and channel numbers cannot disguise identical performances.
- Expected variations require actual tempo, articulation, attack spacing, density, voicing/contour, relative accents or sounding-voice differences. Role/pattern renaming, uniform velocity gain and pure melodic transposition alone cannot exempt a collision.
- Separated the six reviewed swing descriptions through tempo and performance/arrangement choices, Big Band horn calls/answers and punches from small-combo Hard Bop, and sparse Vibraphone notes from sustained chords. Reviewed all prior exact/near duplicate groups and further shared behaviour patterns, including Rhodes extended voice leading, bass/percussion support, occasional versus regular replies, foreground piano, Bossa, waltz, free-time and shuffle variants.
- Assigned conflicting SoundFont selections separate channels and added channel/preset conflict checks. The offline renderer now explicitly selects/verifies bank 0 for pitched tracks and the recorded bank/program for percussion; section presets cannot overwrite each other or leak into later previews.
- Regenerated the complete library: 32/32 instrument tones, 146/146 instrument/behaviour pairs (142 unique descriptions), 64/64 grooves; 242 MP3s and 112 reusable patterns. Technical/music-rule failures, missing/orphan/silent/clipping files and manifest errors are all zero. Independent committed-audio decoding and SHA-256 checks passed 242/242.
- Final similarity report: 5 exact-spec groups, 1 near-spec group, 19 near-audio groups; 4 ACCEPTED_EQUIVALENT groups with intent rules, 20 EXPECTED_VARIANT groups, 0 INVALID_COLLISION groups and 0 invalid pairs. All 17 reviewed swing/Big Band/Vibraphone comparisons and all 8 percussion identities passed. The existing documented Trumpet/Flugelhorn SoundFont approximation remains an expected variant, never an accepted semantic-equivalence exemption.
- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` (259 tests / 10 files), `npm audit` (0 vulnerabilities), `npm run audio:build`, `npm run audio:similarity`, `npm run audio:qc`, `npm run audio:verify`, `npm run audio:package`, `npm run build`, and `npm run build -- --mode pages` passed locally. Both outputs retain their manifest, worker, Apple touch icon and all manifest icons; Pages keeps `/flowmusic-prompt-generator/`, separate worker identity, and review-ZIP exclusion.
- Independently compared 152 prompt outputs (all 38 style defaults plus A/B/C variations) against the reviewed starting head: every output is byte-for-byte unchanged. Existing prompt hash regressions also passed.
- Existing Draft PR #6 is the only target. Final GitHub Actions verification follows the source update; no merge or production deployment is authorized.

## Audio preview correction — local verification (2026-10-07)

- Synced `feat/audio-preview-system` with current `main` (`bf0f414d7cc55a9a2b96f68fdf33ca0461c11f31`) in PR head merge commit `c62d5bc`; no conflicts.
- Corrected semantic preview classification for melodic keyboard and bass parts, quartal piano, modal ostinatos, jazz waltz meter, contemporary straight-eighth phrasing, Neo-Soul, Jazz-Hop, Free Jazz, Noir brushes and Third Stream. Added focused regression coverage; recommendation, compatibility, variation and prompt compiler behavior were not changed.
- Rebuilt all current catalog previews: 32/32 instrument tones, 146/146 instrument/behavior pairs (142 unique behavior strings), and 64/64 grooves; 242 MP3 previews total.
- Structural and technical QC passed for all 242 previews, with zero music-rule or technical failures, missing/silent/clipping files, manifest errors or orphans. Every committed MP3 was independently decoded and its SHA-256 checked against the manifest; runtime-index and catalog consistency passed.
- `npm ci`, `npm audit` (0 vulnerabilities), `npm run typecheck`, `npm run lint`, `npm test` (239 tests across 8 files), `npm run build`, `npm run build -- --mode pages`, and `npm run audio:verify` passed locally. Both build modes passed; the Pages build retains `/flowmusic-prompt-generator/` paths and all manifest-linked icons.
- GitHub Actions Audio preview verification run #6 for `c62d5bc` passed on Node.js 24.21.0: all nine job steps succeeded, the committed-audio/catalog/index/QC checks passed, and the 24,028,077-byte review artifact uploaded successfully (artifact ID `11461645289`). The Pages check built successfully; its deploy job was skipped for the PR event.
- The review ZIP now lives under ignored `.artifacts/` for CI upload and is excluded from production builds; normal builds no longer invoke the Python packager.
- PR #4 remains Draft. No merge, deploy, browser UAT, or subjective assessment of the preview sound has been performed.

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

## Final Big Band compatibility correction (2026-10-07)

- Added an explicit `allowsMultipleLeadRoles` style capability. Free Jazz, New Orleans Jazz and Dixieland retain intentional collective lead behavior; Big Band remains an arranged-section style and now warns when a second instrument is manually promoted to lead.
- Reproduced the manual Big Band case by promoting trumpet to lead and selecting its featured-solo behavior: compatibility is 96/100 with a warning that Big Band Jazz normally uses one featured soloist. The prompt renders trumpet as an arranged trumpet-section participant without assigning it another solo.
- SHA-256 regressions confirm all 12 expanded default prompts and Big Band A/B/C prompts match reviewed HEAD `dce5392`; the existing 25 default prompt hashes and Custom hash also pass unchanged.
- Local verification on Node.js 24.19.0: `npm ci`, `npm audit` (0 vulnerabilities), `npm run typecheck`, `npm run lint`, `npm test` (230 tests across 6 files), `npm run build`, and `npm run build -- --mode pages` pass. Both outputs contain the manifest, service worker, Apple touch icon and all five manifest-linked icons. The Pages output uses `/flowmusic-prompt-generator/`; normal and Pages worker cache identities differ.
- The Draft PR remains open and draft-only. GitHub Actions verification for the correction commit is required before consolidated manual UAT.

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

## Audio preview fidelity pass — local verification (2026-10-07)

- Started `fix/audio-preview-fidelity` directly at production `main` SHA `76ef93c8170dbc67d99397c59540150108f21f36`; no generator, recommendation, compatibility, variation or prompt wording semantics were changed.
- Rebuilt the full catalog: 32/32 instrument tones, 146/146 instrument/behavior pairs (142 unique behavior strings), and 64/64 grooves; 242 MP3 previews total. The reusable pattern count is 91 (38 on the base revision).
- Technical and semantic QC passed all 242 assets: zero missing files, orphans, silent files, clipping failures, manifest errors, technical failures or music-rule failures. SHA-256 was recorded and independently verified for all 242 files; runtime index and catalog coverage passed.
- Added explicit FluidR3 percussion selection and articulation metadata. Acoustic drums use bank 128/program 32 (Jazz), brush drums 128/40 (Brush), and heavy rock 128/16 (Power). Brush uses the SoundFont's Brush Swirl articulation (pitch 40) and brush snare notes; it is not a brush-timbre approximation. Congas, bongos, timbales, shaker and Brazilian percussion use distinct note/articulation mappings on Standard bank 128/program 0; shaker and Brazilian ensemble colors are documented approximations.
- Similarity report: 24 exact-spec groups, 3 near-spec groups, 24 near-audio groups, 28 ACCEPTED_EQUIVALENT groups, 18 EXPECTED_VARIANT groups, and 0 INVALID_COLLISION groups. Eight percussion identity families passed. Of 496 instrument-tone comparisons, 35 were flagged near-audio; the single indistinguishable pair is Trumpet/Flugelhorn, explicitly documented as a FluidR3 trumpet-patch approximation.
- Decoded-PCM regression comparisons pass: Acoustic vs Brush 0.54294, Acoustic vs Heavy Rock 0.89112, Brush vs Heavy Rock 0.57344. The report records the weighted feature breakdown; hashes are not used as the similarity metric.
- `npm ci`, `npm audit` (0 vulnerabilities), `npm run typecheck`, `npm run lint`, `npm test` (247 tests across 9 files), `npm run audio:build`, `npm run audio:qc`, `npm run audio:similarity`, `npm run audio:verify`, `npm run build`, and `npm run build -- --mode pages` pass locally.
- Created Draft PR #6 into `main`; base is `76ef93c8170dbc67d99397c59540150108f21f36`. Final source commit `40c983797c1b8d35d77df0ce47059e3372407576` passed both PR workflows: Audio preview verification run #12 and Pages build run #24. Audio review artifact ID `11475891272` uploaded; Pages artifact ID `11476520344` uploaded. The Pages deploy job was skipped for the PR event. No merge or production deployment has occurred.
