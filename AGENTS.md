# Instructions for future Codex sessions

- Read STATUS.md, SPEC.md and DECISIONS.md before changing the workflow.
- Keep all musical knowledge in typed data modules, not in UI components.
- Keep Flow Music prompt behavior in the engine rule and compiler layer. Prompt generation must stay deterministic and entirely local.
- Do not add inference APIs, server code, cloud storage or a database.
- Keep the UI in Hong Kong Traditional Chinese and generated music prompts in English. Add shared UI copy to src/i18n/zh-HK.ts.
- Keep Cozy Jazz and Brisk Jazz classified as modern descriptors.
- Style changes must not silently replace current musical settings. Recommendation application must stay explicit.
- Keep compatibility advisory and expose the score factors.
- Use curated style-specific variations; do not add random instrument combinations.
- Keep every JazzStyle reference, default recommendation and variation recipe valid against the shared data catalogs; extend the referential-integrity tests when catalogs change.
- Instrument role controls should use each instrument's supported roles. Normalize imported unsupported roles to a safe supported fallback.
- Give style prompt openings musical wording in the style data; keep genre classification metadata out of generated Flow Music prompts.
- Preserve the build-derived service-worker cache identity, old-cache cleanup and user-controlled update action. Keep the template in scripts/service-worker.template.js and emitted worker in dist/sw.js.
- Before proposing completion, run npm run typecheck, npm run lint, npm test and npm run build. Update STATUS.md with the actual results.
- Inspect both normal and Pages build outputs for manifest, service-worker, Apple touch icon and all manifest-linked PNG icons. Do not claim browser install/offline verification without manual UAT.
- Preserve the GitHub Pages base path /flowmusic-prompt-generator/; the Pages workflow must remain static.
