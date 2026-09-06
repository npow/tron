#!/usr/bin/env python3
"""Synthesize the original 120-second score; no samples or network assets.
Requires numpy and ffmpeg. Produces a mastered WAV and the browser MP3.
"""
from pathlib import Path
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE, SECONDS = 48000, 120
rng = np.random.default_rng(812)
audio = np.zeros((RATE * SECONDS, 2), dtype=np.float32)

def add(signal, start, gain=1., pan=0.):
    offset = int(start * RATE)
    if offset >= len(audio):
        return
    n = min(len(signal), len(audio) - max(0, offset))
    signal = signal[max(0, -offset):max(0, -offset) + n]
    offset = max(0, offset)
    audio[offset:offset + len(signal), 0] += signal * gain * np.sqrt((1 - pan) / 2)
    audio[offset:offset + len(signal), 1] += signal * gain * np.sqrt((1 + pan) / 2)

def tone(freq, duration, decay=2., kind='pluck'):
    t = np.arange(int(RATE * duration)) / RATE
    if kind == 'pad':
        signal = (np.sin(2 * np.pi * freq * t) + .3 * np.sin(2 * np.pi * freq * 1.003 * t) + .16 * np.sin(2 * np.pi * freq * 2 * t))
        envelope = np.minimum(t / 1.2, 1) * np.minimum((duration - t) / 1.6, 1)
    else:
        signal = np.sin(2 * np.pi * freq * t) + .3 * np.sin(2 * np.pi * freq * 2 * t) + .1 * np.sin(2 * np.pi * freq * 3 * t)
        envelope = np.minimum(t / .006, 1) * np.exp(-t * decay) * np.minimum((duration - t) / .04, 1)
    return (signal * envelope).astype(np.float32)

def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)

# E minor / C major / G major / D major. A repeating eighth-note pulse at 100 BPM.
chords = [(40, 55, 59, 64), (36, 55, 60, 64), (43, 55, 59, 62), (38, 54, 57, 62)]
beat = .6
for bar in range(50):
    start = bar * 4 * beat
    chord = chords[(bar // 2) % 4]
    intensity = .55 if start < 8 or start >= 114 else 1.
    for n, note in enumerate(chord[1:]):
        add(tone(hz(note), 4.6, kind='pad'), start, .048 * intensity, (n - 1) * .55)
    for step in range(8):
        when = start + step * beat / 2
        note = chord[1 + [0, 1, 2, 1, 0, 2, 1, 2][step]] + (12 if bar % 4 > 1 else 0)
        pluck = tone(hz(note), 1.1, 5)
        add(pluck, when, .067 * intensity, np.sin(step * 2) * .45)
        add(pluck, when + .45, .018 * intensity, -np.sin(step * 2) * .6)
    if 8 <= start < 114:
        for step in range(4):
            when = start + step * beat
            t = np.arange(int(RATE * .45)) / RATE
            kick = np.sin(2 * np.pi * (48 * t + 7 * (1 - np.exp(-t * 35)))) * np.exp(-t * 12)
            add(kick, when, .46)
            add(tone(hz(chord[0]), .42, 8), when + .15, .21)
            if step % 2:
                t = np.arange(int(RATE * .22)) / RATE
                noise = rng.standard_normal(len(t)).astype(np.float32)
                snare = np.diff(noise, prepend=0) * np.exp(-t * 28) * .35 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 24) * .4
                add(snare, when, .14)
            for half in range(2):
                t = np.arange(int(RATE * .08)) / RATE
                noise = rng.standard_normal(len(t)).astype(np.float32)
                hat = np.diff(noise, prepend=0) * np.exp(-t * 70)
                add(hat, when + half * .3, .017 if half == 0 else .025, -.25 if half == 0 else .25)

# Airy transitions coincide with the four tile expansions.
for start in [8, 35, 62, 89]:
    t = np.arange(int(RATE * 2.5)) / RATE
    noise = rng.standard_normal(len(t)).astype(np.float32)
    filtered = np.convolve(noise, np.ones(18) / 18, mode='same')
    envelope = np.sin(np.pi * t / 2.5) ** 2
    sweep = np.sin(2 * np.pi * (110 * t + 100 * t * t)) * .15
    add((filtered + sweep) * envelope, start - 1.2, .11, -.2)

# Soft engine bed rises through each featured run.
for start, pitch in [(10, 52), (37, 65), (64, 58), (91, 60)]:
    t = np.arange(RATE * 21) / RATE
    envelope = np.minimum(t / 3, 1) * np.minimum((21 - t) / 3, 1)
    phase = 2 * np.pi * (pitch * t + 1.5 * np.sin(t * .8))
    engine = (np.sin(phase) + .15 * np.sin(phase * 3)) * envelope
    add(engine, start, .025)

fade = np.minimum(np.arange(len(audio)) / (RATE * 2), 1) * np.minimum((len(audio) - np.arange(len(audio))) / (RATE * 4), 1)
audio *= fade[:, None]
audio = np.tanh(audio * 1.2)
artifacts = ROOT / 'artifacts'
artifacts.mkdir(exist_ok=True)
raw = artifacts / 'score-raw.wav'
with wave.open(str(raw), 'wb') as wav:
    wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(RATE)
    wav.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())
score = artifacts / 'score.wav'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=8', '-ar', str(RATE), str(score)], check=True)
public = ROOT / 'public' / 'audio'
public.mkdir(parents=True, exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(score), '-c:a', 'libmp3lame', '-b:a', '192k', str(public / 'score.mp3')], check=True)
raw.unlink()
print(score)
