#!/usr/bin/env bash
# Verifica el modo sin conexión: fase 1 instala el SW; fase 2 con el servidor devolviendo 503.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8790}; OUT=".superpowers/offline-results.txt"; mkdir -p .superpowers
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE="$(cygpath -w "$(mktemp -d)")"
run() { # $1 = fase, $2 = modo servidor
  rm -f "$OUT"
  python tools/test_server.py "$PORT" "$OUT" $2 & local SRV=$!
  sleep 1
  "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" "http://localhost:$PORT/tests/sw-check.html?phase=$1" >/dev/null 2>&1 & local BR=$!
  for i in $(seq 1 60); do [ -s "$OUT" ] && break; sleep 0.5; done
  powershell -NoProfile -ExecutionPolicy Bypass -File tools/kill-headless.ps1 -Profile "$PROFILE" >/dev/null 2>&1; kill $SRV 2>/dev/null; sleep 1
  echo "fase $1:"; cat "$OUT" 2>/dev/null || echo "sin resultados"; echo
}
run 1 online
run 2 offline
grep -q "RESULT ok" "$OUT"
