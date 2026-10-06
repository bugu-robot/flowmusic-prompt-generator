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
- Before proposing completion, run npm run typecheck, npm run lint, npm test and npm run build. Update STATUS.md with the actual results.
- Preserve the GitHub Pages base path /flowmusic-prompt-generator/; the Pages workflow must remain static.
