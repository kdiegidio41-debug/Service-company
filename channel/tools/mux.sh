#!/usr/bin/env bash
# Joins the rendered frames and the narration into the final upload file, out/<id>/final.mp4,
# at 1080x1920, loudness-matched for TikTok and Instagram, plus a cover image.
set -euo pipefail
cd "$(dirname "$0")/.."
id="$1"
o="out/$id"
dur=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['duration'])" "$o/timeline.json")
cover=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('cover', 3.0))" "videos/$id/script.json")
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$o/frames/f%05d.jpg" -i "$o/voice.wav" \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos,format=yuv420p[v];[1:a]apad,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -t "$dur" -c:v libx264 -preset slow -crf 18 -profile:v high -r 30 \
  -c:a aac -b:a 192k -movflags +faststart "$o/final.mp4"
ffmpeg -hide_banner -loglevel error -y -ss "$cover" -i "$o/final.mp4" -frames:v 1 -q:v 2 "$o/cover.jpg"
echo "  final: $o/final.mp4 ($(du -h "$o/final.mp4" | cut -f1), ${dur}s)"
