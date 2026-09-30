#!/usr/bin/env bash
# Corre tests/tests.html en Chrome headless y sale con 0 solo si no hay fallos.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8765}
python -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE="$(mktemp -d)"
DOM=$("$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  --virtual-time-budget=20000 --dump-dom "http://localhost:$PORT/tests/tests.html" 2>/dev/null)
echo "$DOM" | grep -o 'FAIL - [^<]*' | sed 's/&gt;/>/g;s/&lt;/</g;s/&quot;/"/g'
SUMMARY=$(echo "$DOM" | grep -o '<div id="summary"[^>]*>[^<]*' | sed 's/.*>//')
echo "${SUMMARY:-sin resumen}"
case "$SUMMARY" in *" 0 failed") exit 0 ;; *) exit 1 ;; esac
