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

## Timbral limits

FluidR3 is a General MIDI soundfont, not a set of professional live recordings. Flugelhorn, muted trumpet, Manouche guitar, brushes, upright bass, congas, timbales, and Brazilian percussion are approximate GM timbres. The specifications and QC verify MIDI structure, roles, register, meter, timing, and technical audio properties; they do not claim subjective performance or live-instrument fidelity.
