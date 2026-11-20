#!/usr/bin/env bash
# Builds one finished video from its folder in videos/:  bash make.sh 001-pool
set -euo pipefail
cd "$(dirname "$0")"
id="${1:?usage: bash make.sh <video-id> [render options]}"; shift
[ -f ".cache/kokoro-v1.0.int8.onnx" ] || bash setup.sh
echo "[1/3] narration"; python3 tools/voice.py "$id"
echo "[2/3] frames";    node tools/render.js "$id" "$@"
echo "[3/3] encode";    bash tools/mux.sh "$id"
