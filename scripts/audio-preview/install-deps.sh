#!/usr/bin/env bash
set -euo pipefail
soundfont="${AUDIO_SOUNDFONT:-/usr/share/sounds/sf2/FluidR3_GM.sf2}"
if command -v ffmpeg >/dev/null 2>&1 && python3 -c 'import ctypes.util; assert ctypes.util.find_library("fluidsynth")' >/dev/null 2>&1 && [[ -f "$soundfont" ]]; then
  exit 0
fi
if ! command -v apt-get >/dev/null 2>&1; then
  echo "Install FFmpeg, FluidSynth, and fluid-soundfont-gm or set AUDIO_SOUNDFONT." >&2
  exit 1
fi
if [[ "$(id -u)" -eq 0 ]]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg fluidsynth libfluidsynth3 fluid-soundfont-gm
else
  sudo apt-get update
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg fluidsynth libfluidsynth3 fluid-soundfont-gm
fi
