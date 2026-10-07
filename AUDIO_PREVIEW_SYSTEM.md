# Audio Preview System

Audio previews are a parallel presentation layer. The existing English instrument behaviours, recommendations, saved configuration, compatibility scoring, variation generation, and prompt compiler remain the product source of truth. Preview playback reads generated metadata and never writes to configuration or local storage.

## Build pipeline

`src/data/instruments.ts` and the current `JAZZ_STYLES` groove catalog are read at build time. The preview builder creates a specification for each instrument tone, every selectable instrument/behaviour pair, and each unique catalog groove. Specifications use a reusable pattern library and carry objective structure rules. A deterministic SMF MIDI file and matching ordered event list are generated for each specification. The event list is rendered offline through the FluidSynth C API, then FFmpeg downmixes to mono before measuring and normalizing each clip in two passes. Pitched and mixed-ensemble previews target -18 LUFS integrated; isolated percussion previews target -22.5 LUFS so short, high-crest transients retain headroom without heavy compression. Both use a -2.8 dBTP normalization ceiling. The final mono files are 44.1 kHz CBR MP3 at 96 kb/s; encoded-file QC requires decoded true peaks at or below -1 dBTP and loudness within ±2 LU for pitched/mixed previews or ±2.5 LU for isolated percussion. The wider isolated-percussion tolerance accounts for brief SoundFont transients while retaining audible peak headroom.

FluidSynth runs without an audio device, with its reverb and chorus disabled. The build requires Debian or Ubuntu packages for FFmpeg, FluidSynth, and the FluidR3 General MIDI SoundFont. `npm run audio:install` installs these automatically; `AUDIO_SOUNDFONT` may point to an equivalent licensed local file. The exact SoundFont source, package version, SHA-256, license, and attribution are documented in [AUDIO_ASSET_LICENSES.md](AUDIO_ASSET_LICENSES.md).

## Commands

```sh
npm ci
npm run audio:install
npm run audio:build
npm run audio:qc
npm run audio:verify
```

`audio:build` regenerates `src/audio-preview/generated-index.ts`, the complete committed MP3 library, JSON manifest, Markdown/JSON QC reports, the public review page's data, and `public/audio-preview-review.zip`. Temporary WAV and MIDI files are removed after rendering. `audio:qc` re-decodes every MP3 with FFprobe/FFmpeg and refreshes reports and the review ZIP. `audio:verify` is the fast committed-asset gate: it derives expected coverage from the current source catalog, checks the music rules, validates files and manifest paths, checks QC records, and rejects orphan previews.

## Catalog updates and parallel style work

After `feat/expanded-jazz-styles` merges, sync this branch with `main` and run `npm run audio:verify`. The validator reports any new catalogue behaviours or grooves without relying on fixed item counts. Add or refine reusable music specs for new techniques where needed, then run `npm run audio:build`, `npm run audio:verify`, and the normal test suite. Do not copy unfinished catalogue values into this branch before they exist in `main`.

## Review

Run `npm run dev` and open `/audio-preview-review.html` for instrument tones, behaviour examples, grooves, the 19-item representative QC playlist, coverage counters, structural rule results, technical measurements, and download links. The full library and its license/QC material are in `public/audio-preview-review.zip`. Normal page playback is user-triggered, loads a file only on demand, stops any previous preview, and stores successfully fetched MP3s in the service worker runtime cache. Audio is not in the install precache and audio failures do not affect prompt generation.

The SoundFont gives approximate General MIDI timbres, not professional live recordings. Machine rules validate structure such as meter, timing grid, note range, repetition, role, and program mapping; they do not claim to prove subjective musical quality.
