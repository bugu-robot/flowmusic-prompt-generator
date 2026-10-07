# Audio preview asset licenses

## SoundFont

- **Source:** FluidR3 General MIDI SoundFont, GM subset (`FluidR3_GM.sf2`), version 3.1.
- **Copyright:** Frank Wen, 2000–2002 and 2008; the upstream README says FluidR3 is released under the MIT license.
- **Official package/source location used for this build:** Ubuntu 24.04 (Noble) `fluid-soundfont` source package 3.1-5.3 and binary package `fluid-soundfont-gm` 3.1-5.3. Ubuntu package record: <https://packages.ubuntu.com/source/noble/fluid-soundfont>. The package's installed copyright notice identifies the original upstream author, the original Fluid R3 release, and the MIT license. The upstream project reproduces the original README and COPYING notice at <https://github.com/musescore/MuseScore/blob/main/share/sound/FluidR3Mono_License.md>.
- **Build environment version:** `fluid-soundfont-gm` 3.1-5.3; SHA-256 of the rendered source file used for this build: `74594e8f4250680adf590507a306655a299935343583256f3b722c48a1bc1cb0`.
- **Source file committed:** No. The 148 MB SF2 remains a build-time package dependency and is automatically installed by `npm run audio:install` on Debian/Ubuntu. It is not copied into the repository, preview ZIP, or website.
- **Rendered audio distribution:** The MIT notice permits use, modification, and distribution. The source license does not state a separate restriction on rendered audio. This repository distributes only newly specified MIDI/event performances rendered through the SoundFont, not the SF2 samples themselves. The copyright and license attribution in this file is included in the review ZIP and repository.
- **Attribution:** “FluidR3 General MIDI SoundFont by Frank Wen, © 2000–2002, 2008; released under the MIT License.”
- **Render process:** Catalog-derived event specifications → deterministic Standard MIDI files and the same ordered MIDI events → offline FluidSynth C API rendering, with reverb and chorus disabled → FFmpeg silence trim, short fades, EBU R128 loudness normalization and MP3 encoding.

## Renderer and encoder

FluidSynth is used as a system package and is not bundled. FluidSynth is LGPL-2.1-or-later; FFmpeg and its MP3 encoder are system build tools and are not distributed by this project. Neither tool contributes separately licensed source assets to the preview files. The MP3 previews contain the generated compositions and the rendered timbres from the MIT-licensed SoundFont.

## Verified percussion presets and articulation map

The renderer enumerates the loaded FluidR3 presets, requires the preset names shown below, selects each kit through FluidSynth's `fluid_synth_program_select(synth, channel, soundfont_id, bank, preset)` API, and reads the active bank/program back before rendering. A MIDI `program_change()` alone does not select the required drum bank. All percussion presets below are in SoundFont bank 128; the program values are the zero-based preset numbers exposed by FluidSynth for the exact licensed FluidR3 3.1-5.3 package.

| Preview identity | Bank / program | FluidR3 preset | Notes / articulation |
|---|---:|---|---|
| Acoustic Drum Kit | 128 / 32 | Jazz | Acoustic jazz kit with kick, snare, ride and cymbal timekeeping. |
| Brush Drums | 128 / 40 | Brush | Native Brush kit. MIDI 40 resolves to the SoundFont sample named “Brush Swirl”; MIDI 38 and 39 resolve to brush snare samples. |
| Heavy Rock Drums | 128 / 16 | Power | Power kit with stronger kick/snare samples, crash and tom accents. |
| Congas | 128 / 0 | Standard | GM percussion keys 62–64: muted high, open high, and low conga. |
| Bongos | 128 / 0 | Standard | GM percussion keys 60–61: high and low bongo. |
| Timbales | 128 / 0 | Standard | GM percussion keys 65–66: high and low timbale; cowbell accents use key 56. |
| Soft Shaker | 128 / 0 | Standard | Low-velocity maracas at GM key 70; labeled `TIMBRE_APPROXIMATION` because FluidR3 has no dedicated soft-shaker preset. |
| Brazilian Percussion | 128 / 0 | Standard | Surdo, snare, agogo and maracas pattern using GM keys 36, 38, 67, 68 and 70; labeled `TIMBRE_APPROXIMATION` for the pandeiro/tamborim/chocalho section. |

The Brush kit also has separate metadata/articulation families for swirl, light taps and restrained pulse. Acoustic Drum Kit behaviors that explicitly request brushes select the Brush kit for that behavior preview; its generic instrument-tone preview remains the Jazz kit. The committed similarity report and review page record the actual bank, program, preset, articulation family and any approximation status.

## Timbral limits

FluidR3 is a General MIDI SoundFont, not a set of professional live recordings. Brush Drums use the actual FluidR3 Brush kit and its `Brush Swirl` sample, rather than a standard kit carrying a brush label. Soft Shaker and Brazilian Percussion use documented General MIDI approximations described above. Flugelhorn resolves to the same GM Trumpet program as Trumpet, and Manouche guitar uses FluidR3's Jazz Guitar program; both are explicitly marked `TIMBRE_APPROXIMATION`. Upright Bass uses the GM Acoustic Bass patch. The specifications and QC verify preset selection, percussion note/articulation mapping, MIDI structure, roles, register, meter, timing, and technical audio properties; they do not claim a live performance or exact acoustic-instrument reproduction.
