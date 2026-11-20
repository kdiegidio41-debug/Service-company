#!/usr/bin/env python3
"""Turns videos/<id>/script.json into narration (out/<id>/voice.wav) and a timeline of
when every line and word is spoken (out/<id>/timeline.json). The scene and the captions
are both driven by that timeline, so the pictures always land on the words."""
import json
import pathlib
import re
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIN_TOTAL = 62.5      # seconds. TikTok's Creator Rewards only pays on videos over one minute.
MIN_SPEED = 0.9       # slower than this starts to sound sleepy
LEAD = 0.25           # silence before the first word


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ee")):
        n -= 1
    return max(1, n)


def trim(a, sr, thr=0.012):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - int(0.02 * sr)): min(len(a), idx[-1] + int(0.06 * sr))]


def main(vid):
    vdir, out = ROOT / "videos" / vid, ROOT / "out" / vid
    out.mkdir(parents=True, exist_ok=True)
    spec = json.loads((vdir / "script.json").read_text())
    lines = spec["lines"]
    voice = spec.get("voice", "af_heart")
    gap = spec.get("gap", 0.3)
    tail = spec.get("tail", 2.4)
    clean = lambda s: s.replace("*", "")

    kokoro = Kokoro(str(ROOT / ".cache/kokoro-v1.0.int8.onnx"), str(ROOT / ".cache/voices-v1.0.bin"))

    def synth(speed):
        clips, sr = [], 24000
        for ln in lines:
            a, sr = kokoro.create(clean(ln["text"]), voice=voice, speed=speed, lang="en-us")
            clips.append(trim(a, sr))
        return clips, sr

    def total(clips, sr, gap):
        return LEAD + sum(len(c) / sr for c in clips) + gap * (len(clips) - 1) + tail

    speed = spec.get("speed", 1.0)
    clips, sr = synth(speed)
    if total(clips, sr, gap) < MIN_TOTAL:
        speech = sum(len(c) / sr for c in clips)
        need = MIN_TOTAL - LEAD - gap * (len(clips) - 1) - tail
        speed2 = max(MIN_SPEED, round(speed * speech / need - 0.005, 2))
        if speed2 < speed:
            print(f"  narration too short at speed {speed}; re-reading at speed {speed2}")
            speed = speed2
            clips, sr = synth(speed)
    while total(clips, sr, gap) < MIN_TOTAL and gap < 0.45:
        gap = round(gap + 0.02, 2)
    T = total(clips, sr, gap)
    if T < MIN_TOTAL:
        sys.exit(f"Script too short: {T:.1f}s even at speed {speed} with {gap}s pauses. "
                 f"Add about {int((MIN_TOTAL - T) * 3.4) + 1} words.")

    audio, timeline_lines, words = [np.zeros(int(LEAD * sr), dtype=np.float32)], [], []
    t = LEAD
    for i, (ln, clip) in enumerate(zip(lines, clips)):
        d = len(clip) / sr
        timeline_lines.append({"beat": ln["beat"], "text": clean(ln["text"]), "start": round(t, 3), "end": round(t + d, 3)})
        toks = ln["text"].split()
        weights = []
        for tok in toks:
            w = 0.35 + syllables(tok)
            if tok.rstrip("*").endswith((",", ";", ":")):
                w += 0.8
            weights.append(w)
        cum, tot = 0.0, sum(weights)
        for tok, w in zip(toks, weights):
            display = re.sub(r"[^\w'’-]", "", tok.replace("*", ""))
            if display:
                words.append({"w": display, "start": round(t + d * cum / tot, 3),
                              "end": round(t + d * (cum + w) / tot, 3), "hl": "*" in tok})
            cum += w
        audio.append(clip.astype(np.float32))
        t += d
        if i < len(lines) - 1:
            audio.append(np.zeros(int(gap * sr), dtype=np.float32))
            t += gap
    audio.append(np.zeros(int(tail * sr), dtype=np.float32))
    pcm = np.concatenate(audio)
    sf.write(out / "voice.wav", pcm, sr)
    duration = round(len(pcm) / sr, 3)
    (out / "timeline.json").write_text(json.dumps(
        {"video": vid, "voice": voice, "speed": speed, "gap": gap, "duration": duration,
         "lines": timeline_lines, "words": words}, indent=1))
    print(f"  voice: {voice}, speed {speed}, pauses {gap}s, {len(words)} words, {duration:.1f}s total")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: voice.py <video-id>")
    main(sys.argv[1])
