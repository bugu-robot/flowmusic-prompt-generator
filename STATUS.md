# Project status

## Implemented

- [x] Vite, TypeScript and Vanilla client foundation.
- [x] Hong Kong Traditional Chinese interface copy and English prompt output.
- [x] Data-driven Jazz style and instrument catalogs.
- [x] Style recommendations, advisory compatibility factors and curated variations.
- [x] Deterministic Flow Music prompt compiler and concise grouped constraints.
- [x] Responsive configuration interface, live prompt preview and clipboard action.
- [x] Local configuration and preset JSON import/export.
- [x] PWA manifest, service worker shell cache and waiting update action.
- [x] GitHub Pages build path and deployment workflow.
- [x] Project specification and contributor guidance.

## Verification

- [x] TypeScript typecheck (`npm run typecheck`)
- [x] ESLint (`npm run lint`)
- [x] Unit tests (`npm test`: 28 tests across 6 files)
- [x] Production build (`npm run build`)
- [x] GitHub Pages path build (`npm run build -- --mode pages`)
- [ ] Draft PR review

## Pending / limitations

- Browser installation and offline behavior need verification on a target desktop and mobile browser.
- Prompt phrasing is deterministic and rule-based; different Flow Music model releases may respond differently.
- localStorage presets remain on the current browser and are not synchronized.
- No live generation API is connected by design.
