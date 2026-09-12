#!/usr/bin/env bash
# Start Jarvis with a working microphone.
#
# The wake word needs a secure context — https or localhost. Double-clicking
# index.html gives you file://, where the browser refuses the mic. This serves
# the folder on localhost, which the browser trusts, and opens it.

set -e
cd "$(dirname "$0")"

PORT=8420
while lsof -i ":$PORT" >/dev/null 2>&1; do PORT=$((PORT + 1)); done

URL="http://localhost:$PORT/index.html"
echo "Jarvis  →  $URL"
echo "Leave this window open. Ctrl-C to stop."

( sleep 1
  if   command -v open    >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi ) &

exec python3 -m http.server "$PORT" --bind 127.0.0.1
