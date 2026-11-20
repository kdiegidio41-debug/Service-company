#!/usr/bin/env bash
# One-time setup on a fresh machine: the 3D library, caption font and the narration voice.
# Chromium + Playwright and ffmpeg must already be installed (they are in Claude's cloud machine).
set -euo pipefail
cd "$(dirname "$0")"
npm ci --silent
pip install -q kokoro-onnx==0.6.1 soundfile
mkdir -p .cache
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  [ -s ".cache/$f" ] || curl -sSL --fail -o ".cache/$f" "$base/$f"
done
echo "setup done"
