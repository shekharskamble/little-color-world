"""An original, calm music-box lullaby for the App Store preview video (docs/ASO.md).

Written from scratch here, so there is no licence to clear. Plain Python (no numpy): a waltz in C major at 90 bpm,
12 bars of 2 s, with a music-box melody, a soft chord pad and a light stereo reverb, fading in and out.

Usage: python3 tools/store/music.py <out.wav> [seconds]   (48 kHz, 16-bit stereo WAV)
"""
import math
import struct
import sys
import wave
from array import array

RATE = 48000
BEAT = 60 / 90  # waltz: three beats a bar, a bar is 2 s

# Note names to frequencies (A4 = 440 Hz).
NAMES = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}


def freq(note: str) -> float:
    return 440.0 * 2 ** ((NAMES[note[0]] + 12 * (int(note[1:]) - 4)) / 12)


# Melody: (note, beats) per bar. Simple, stepwise and resolving, like a nursery lullaby.
MELODY = [
    [('E5', 1), ('G5', 1), ('E5', 1)],
    [('C5', 1), ('E5', 1), ('A5', 1)],
    [('A5', 2), ('G5', 1)],
    [('F5', 1), ('D5', 1), ('G5', 1)],
    [('E5', 1), ('G5', 1), ('C6', 1)],
    [('B5', 1), ('A5', 1), ('E5', 1)],
    [('F5', 1), ('A5', 1), ('B5', 1)],
    [('C6', 3)],
    [('A5', 1), ('F5', 1), ('C6', 1)],
    [('G5', 1), ('E5', 1), ('C5', 1)],
    [('D5', 1), ('G5', 1), ('B5', 1)],
    [('C6', 3)],
]
# Chords for each bar: bass note, then two upper chord tones played on beats 2 and 3.
CHORDS = [
    ('C3', 'G3', 'E4'), ('A2', 'E3', 'C4'), ('F2', 'C3', 'A3'), ('G2', 'D3', 'B3'),
    ('C3', 'G3', 'E4'), ('A2', 'E3', 'C4'), ('F2', 'C3', 'A3'), ('C3', 'G3', 'E4'),
    ('F2', 'C3', 'A3'), ('C3', 'G3', 'E4'), ('G2', 'D3', 'B3'), ('C3', 'G3', 'E4'),
]


def bell(buf: array, start: float, f: float, gain: float, decay: float) -> None:
    """A music-box tine: a bright attack and a long ring that fades, with a few soft overtones."""
    partials = ((1.0, 1.0), (2.0, 0.28), (3.0, 0.08), (4.16, 0.05))
    n0, n = int(start * RATE), int(decay * 5 * RATE)
    for i in range(min(n, len(buf) - n0)):
        t = i / RATE
        env = min(1.0, t / 0.004) * math.exp(-t / decay)
        s = 0.0
        for mult, amp in partials:
            s += amp * math.sin(2 * math.pi * f * mult * t) * math.exp(-t * (mult - 1) * 1.5)
        buf[n0 + i] += gain * env * s


def pad(buf: array, start: float, length: float, f: float, gain: float) -> None:
    """A soft, slow-swelling tone for the chords underneath."""
    n0, n = int(start * RATE), int((length + 0.8) * RATE)
    for i in range(min(n, len(buf) - n0)):
        t = i / RATE
        env = min(1.0, t / 0.35) * (1.0 if t < length else math.exp(-(t - length) / 0.25))
        s = math.sin(2 * math.pi * f * t) + 0.25 * math.sin(4 * math.pi * f * t)
        buf[n0 + i] += gain * env * s


def reverb(dry: array, delays: tuple, feedback: float) -> array:
    """A light room: a few feedback delays mixed under the dry sound (Schroeder comb filters)."""
    wet = array('f', bytes(4 * len(dry)))
    for d in delays:
        k = int(d * RATE)
        line = array('f', dry)
        for i in range(k, len(line)):
            line[i] += feedback * line[i - k]
        for i in range(len(wet)):
            wet[i] += line[i]
    mix = 0.22 / len(delays)
    return array('f', (dry[i] + mix * wet[i] for i in range(len(dry))))


def main(out: str, seconds: float) -> None:
    n = int(seconds * RATE)
    mel, low = array('f', bytes(4 * n)), array('f', bytes(4 * n))
    for bar, (notes, chord) in enumerate(zip(MELODY, CHORDS)):
        t = bar * 3 * BEAT
        for note, beats in notes:
            bell(mel, t, freq(note), 0.32, 0.9 if beats == 1 else 1.4)
            t += beats * BEAT
        bass, mid, top = chord
        bar_t = bar * 3 * BEAT
        pad(low, bar_t, 3 * BEAT, freq(bass), 0.10)
        bell(low, bar_t + BEAT, freq(mid), 0.10, 0.6)
        bell(low, bar_t + 2 * BEAT, freq(top), 0.09, 0.6)
    mix = array('f', (mel[i] + low[i] for i in range(n)))
    # Slightly different rooms left and right give a gentle stereo width.
    left = reverb(mix, (0.0297, 0.0371, 0.0411, 0.0437), 0.78)
    right = reverb(mix, (0.0313, 0.0353, 0.0427, 0.0451), 0.78)
    peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
    scale = 0.5 / peak  # about -6 dBFS: quiet and calm
    fade_in, fade_out = 0.6 * RATE, 2.5 * RATE
    frames = bytearray()
    for i in range(n):
        g = scale * min(1.0, i / fade_in, (n - i) / fade_out)
        frames += struct.pack('<hh', int(32767 * left[i] * g), int(32767 * right[i] * g))
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(frames))
    print(f'wrote {out}: {seconds:.2f} s')


if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 24.3)
