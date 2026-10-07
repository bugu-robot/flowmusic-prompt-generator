#!/usr/bin/env python3
"""Offline FluidSynth renderer; uses the C API so no audio device is opened."""
import ctypes
import json
import os
import sys
import wave
from array import array

SAMPLE_RATE = 44100
CHUNK = 4096
lib_path = ctypes.util.find_library("fluidsynth") if hasattr(ctypes, "util") else None
if not lib_path:
    import ctypes.util
    lib_path = ctypes.util.find_library("fluidsynth")
if not lib_path:
    raise SystemExit("libfluidsynth is required; run npm run audio:install")
fs = ctypes.CDLL(lib_path)
P = ctypes.c_void_p
fs.new_fluid_settings.restype = P
fs.fluid_settings_setnum.argtypes = [P, ctypes.c_char_p, ctypes.c_double]
fs.fluid_settings_setint.argtypes = [P, ctypes.c_char_p, ctypes.c_int]
fs.new_fluid_synth.argtypes = [P]
fs.new_fluid_synth.restype = P
fs.fluid_synth_sfload.argtypes = [P, ctypes.c_char_p, ctypes.c_int]
fs.fluid_synth_sfload.restype = ctypes.c_int
fs.fluid_synth_program_change.argtypes = [P, ctypes.c_int, ctypes.c_int]
fs.fluid_synth_noteon.argtypes = [P, ctypes.c_int, ctypes.c_int, ctypes.c_int]
fs.fluid_synth_noteoff.argtypes = [P, ctypes.c_int, ctypes.c_int]
fs.fluid_synth_all_sounds_off.argtypes = [P, ctypes.c_int]
fs.fluid_synth_write_s16.argtypes = [P, ctypes.c_int, P, ctypes.c_int, ctypes.c_int, P, ctypes.c_int, ctypes.c_int]
fs.fluid_synth_write_s16.restype = ctypes.c_int


def render_samples(synth, wav_file, count):
    left = (ctypes.c_short * count)()
    right = (ctypes.c_short * count)()
    if fs.fluid_synth_write_s16(synth, count, left, 0, 1, right, 0, 1) != 0:
        raise RuntimeError("FluidSynth failed to render samples")
    interleaved = array("h")
    for a, b in zip(left, right):
        interleaved.extend((a, b))
    if sys.byteorder != "little":
        interleaved.byteswap()
    wav_file.writeframesraw(interleaved.tobytes())


def main():
    soundfont, spec_path = sys.argv[1:3]
    specs = json.load(open(spec_path, encoding="utf-8"))
    settings = fs.new_fluid_settings()
    fs.fluid_settings_setnum(settings, b"synth.sample-rate", SAMPLE_RATE)
    fs.fluid_settings_setnum(settings, b"synth.gain", 0.8)
    fs.fluid_settings_setint(settings, b"synth.polyphony", 96)
    fs.fluid_settings_setint(settings, b"synth.reverb.active", 0)
    fs.fluid_settings_setint(settings, b"synth.chorus.active", 0)
    synth = fs.new_fluid_synth(settings)
    if not synth:
        raise RuntimeError("Unable to create FluidSynth instance")
    sfid = fs.fluid_synth_sfload(synth, os.fsencode(soundfont), 1)
    if sfid < 0:
        raise RuntimeError("Unable to load SoundFont: " + soundfont)

    for item in specs:
        spec = item["spec"]
        bpm = spec["bpm"]
        events = []
        for track in spec["tracks"]:
            channel = track["channel"]
            fs.fluid_synth_program_change(synth, channel, track["program"])
            for note in track["notes"]:
                on = round(note["beat"] * 60 * SAMPLE_RATE / bpm)
                off = round((note["beat"] + note["duration"]) * 60 * SAMPLE_RATE / bpm)
                events.append((on, 1, channel, note["pitch"], note["velocity"]))
                events.append((off, 0, channel, note["pitch"], 0))
        events.sort(key=lambda event: (event[0], event[1]))
        last_sample = max((event[0] for event in events), default=0) + int(0.22 * SAMPLE_RATE)
        os.makedirs(os.path.dirname(item["wav"]), exist_ok=True)
        for channel in range(16):
            fs.fluid_synth_all_sounds_off(synth, channel)
        with wave.open(item["wav"], "wb") as out:
            out.setnchannels(2)
            out.setsampwidth(2)
            out.setframerate(SAMPLE_RATE)
            cursor = 0
            for sample, kind, channel, pitch, velocity in events:
                while cursor < sample:
                    size = min(CHUNK, sample - cursor)
                    render_samples(synth, out, size)
                    cursor += size
                if kind:
                    fs.fluid_synth_noteon(synth, channel, pitch, velocity)
                else:
                    fs.fluid_synth_noteoff(synth, channel, pitch)
            while cursor < last_sample:
                size = min(CHUNK, last_sample - cursor)
                render_samples(synth, out, size)
                cursor += size
        print(item["id"])
    fs.delete_fluid_synth.argtypes = [P]
    fs.delete_fluid_synth(synth)
    fs.delete_fluid_settings.argtypes = [P]
    fs.delete_fluid_settings(settings)


if __name__ == "__main__":
    import ctypes.util
    main()
