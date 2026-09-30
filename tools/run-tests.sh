#!/usr/bin/env bash
# Corre tests/tests.html en Chrome headless; sale con 0 solo si no hay fallos.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8765}
OUT=".superpowers/test-results.txt"
mkdir -p .superpowers; rm -f "$OUT"
python tools/test_server.py "$PORT" "$OUT" &
SRV=$!
sleep 1
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE="$(cygpath -w "$(mktemp -d)")"
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  "http://127.0.0.1:$PORT/tests/tests.html?report=1" >/dev/null 2>&1 &
BR=$!
for i in $(seq 1 120); do [ -s "$OUT" ] && break; sleep 0.5; done
kill $BR $SRV 2>/dev/null; taskkill //F //T //PID $BR >/dev/null 2>&1
[ -s "$OUT" ] || { echo "sin resultados (timeout)"; exit 1; }
grep '^FAIL' "$OUT"
SUMMARY=$(tail -n 1 "$OUT")
echo "$SUMMARY"
case "$SUMMARY" in *" 0 failed") exit 0 ;; *) exit 1 ;; esac
