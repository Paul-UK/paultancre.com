#!/usr/bin/env bash
# Regenerate the site-wide Open Graph card (public/og-default.png) from
# scripts/og-card.html.
#
# Rendered with headless Chrome so the card uses the site's real fonts and
# palette. Chrome refuses to load file:// fonts cross-origin, so the repo is
# served over a throwaway localhost port for the length of the render. Drawn at
# 2x and downsampled, which is what keeps the type crisp.
#
# Cloudflare's build image has no browser, so this is a local step: run it when
# the card design or the tagline changes, then commit the PNG.
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/og-default.png"
PORT="${OG_PORT:-8731}"

[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
until curl -sf -o /dev/null "http://127.0.0.1:$PORT/scripts/og-card.html"; do sleep 0.2; done

TMP="$(mktemp -d)"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1200,630 \
  --virtual-time-budget=4000 \
  --screenshot="$TMP/og@2x.png" \
  "http://127.0.0.1:$PORT/scripts/og-card.html" >/dev/null 2>&1

[ -s "$TMP/og@2x.png" ] || { echo "Chrome produced no screenshot" >&2; exit 1; }
sips -z 630 1200 "$TMP/og@2x.png" --out "$OUT" >/dev/null
rm -rf "$TMP"

echo "wrote $OUT ($(sips -g pixelWidth -g pixelHeight "$OUT" | tail -2 | tr -s ' \n' ' '))"
