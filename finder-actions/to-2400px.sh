#!/bin/bash
# Image Optimizer — Resize to 2400px width
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-node}"

for f in "$@"; do
  ext="${f##*.}"
  output="${f%.*}-2400.${ext}"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --width 2400 --quality 92 2>&1)

  if [ $? -eq 0 ]; then
    osascript -e "display notification \"$result\" with title \"To 2400px\""
  else
    osascript -e "display notification \"Failed: $result\" with title \"To 2400px\" sound name \"Basso\""
  fi
done
