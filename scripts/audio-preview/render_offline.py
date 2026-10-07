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
fs.fluid_synth_get_sfont_by_id.argtypes = [P, ctypes.c_int]
fs.fluid_synth_get_sfont_by_id.restype = P
fs.fluid_sfont_iteration_start.argtypes = [P]
fs.fluid_sfont_iteration_next.argtypes = [P]
fs.fluid_sfont_iteration_next.restype = P
fs.fluid_preset_get_banknum.argtypes = [P]
fs.fluid_preset_get_banknum.restype = ctypes.c_int
fs.fluid_preset_get_num.argtypes = [P]
fs.fluid_preset_get_num.restype = ctypes.c_int
fs.fluid_preset_get_name.argtypes = [P]
fs.fluid_preset_get_name.restype = ctypes.c_char_p
fs.fluid_synth_program_change.argtypes = [P, ctypes.c_int, ctypes.c_int]
fs.fluid_synth_program_change.restype = ctypes.c_int
fs.fluid_synth_program_select.argtypes = [P, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int]
fs.fluid_synth_program_select.restype = ctypes.c_int
fs.fluid_synth_get_program.argtypes = [P, ctypes.c_int, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)]
fs.fluid_synth_get_program.restype = ctypes.c_int
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


def preset_table(synth, sfid):
    sfont = fs.fluid_synth_get_sfont_by_id(synth, sfid)
    if not sfont:
        raise RuntimeError("FluidSynth could not inspect the loaded SoundFont")
    fs.fluid_sfont_iteration_start(sfont)
    presets = {}
    while True:
        preset = fs.fluid_sfont_iteration_next(sfont)
        if not preset:
            break
        bank = fs.fluid_preset_get_banknum(preset)
        program = fs.fluid_preset_get_num(preset)
        name = fs.fluid_preset_get_name(preset).decode("utf-8", "replace")
        presets[(bank, program)] = name
    return presets


def select_track_preset(synth, sfid, track, presets, spec_id):
    mapping = track.get("percussionMapping")
    if mapping:
        bank = int(mapping["soundFontBank"])
        program = int(mapping["soundFontProgram"])
        expected_name = mapping["soundFontPreset"]
        actual_name = presets.get((bank, program))
        if actual_name != expected_name:
            raise RuntimeError(
                f"{spec_id}/{track['name']}: requested FluidR3 preset "
                f"bank {bank}, program {program} ({expected_name}); found {actual_name!r}"
            )
        if int(track["program"]) != program:
            raise RuntimeError(f"{spec_id}/{track['name']}: track program disagrees with percussion mapping")
        result = fs.fluid_synth_program_select(synth, int(track["channel"]), sfid, bank, program)
        if result != 0:
            raise RuntimeError(f"{spec_id}/{track['name']}: FluidSynth rejected bank {bank}, program {program}")
        current_sfont, current_bank, current_program = ctypes.c_int(), ctypes.c_int(), ctypes.c_int()
        if fs.fluid_synth_get_program(synth, int(track["channel"]), ctypes.byref(current_sfont), ctypes.byref(current_bank), ctypes.byref(current_program)) != 0:
            raise RuntimeError(f"{spec_id}/{track['name']}: could not verify selected FluidSynth kit")
        if (current_sfont.value, current_bank.value, current_program.value) != (sfid, bank, program):
            raise RuntimeError(f"{spec_id}/{track['name']}: FluidSynth selected an unexpected kit preset")
    else:
        # Explicitly restore melodic bank 0: another preview may previously
        # have used this channel for a separately selected percussion preset.
        if fs.fluid_synth_program_select(synth, int(track["channel"]), sfid, 0, int(track["program"])) != 0:
            raise RuntimeError(f"{spec_id}/{track['name']}: FluidSynth rejected GM program {track['program']}")
        current_sfont, current_bank, current_program = ctypes.c_int(), ctypes.c_int(), ctypes.c_int()
        if fs.fluid_synth_get_program(synth, int(track["channel"]), ctypes.byref(current_sfont), ctypes.byref(current_bank), ctypes.byref(current_program)) != 0:
            raise RuntimeError(f"{spec_id}/{track['name']}: could not verify melodic preset")
        if (current_sfont.value, current_bank.value, current_program.value) != (sfid, 0, int(track["program"])):
            raise RuntimeError(f"{spec_id}/{track['name']}: FluidSynth retained an unexpected melodic bank/program")


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
    presets = preset_table(synth, sfid)
    required = {(128, 0): "Standard", (128, 16): "Power", (128, 32): "Jazz", (128, 40): "Brush"}
    missing = [(bank, program, name) for (bank, program), name in required.items() if presets.get((bank, program)) != name]
    if missing:
        raise RuntimeError(f"FluidR3 required percussion presets do not match: {missing}")
    print("Verified FluidR3 percussion kits: " + ", ".join(f"bank {bank}/program {program} {name}" for (bank, program), name in sorted(required.items())))

    for item in specs:
        spec = item["spec"]
        bpm = spec["bpm"]
        events = []
        channel_presets = {}
        for track in spec["tracks"]:
            channel = track["channel"]
            mapping = track.get("percussionMapping") or {}
            selection = (mapping.get("soundFontBank", 0), mapping.get("soundFontProgram", track["program"]))
            if channel in channel_presets and channel_presets[channel] != selection:
                raise RuntimeError(f"{item['id']}: conflicting SoundFont presets on channel {channel}")
            channel_presets[channel] = selection
            select_track_preset(synth, sfid, track, presets, item["id"])
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
