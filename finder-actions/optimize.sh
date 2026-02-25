#!/bin/bash
# Image Optimizer — Optimize in place
# Used by Automator Quick Actions. Receives file paths as arguments.

SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-node}"

for f in "$@"; do
  ext="${f##*.}"
  output="${f%.*}-optimized.${ext}"

  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --quality 92 2>&1)

  if [ $? -eq 0 ]; then
    osascript -e "display notification \"$result\" with title \"Image Optimizer\""
  else
    osascript -e "display notification \"Failed: $result\" with title \"Image Optimizer\" sound name \"Basso\""
  fi
done
