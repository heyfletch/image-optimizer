#!/bin/bash
# Image Optimizer — Convert to WebP
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-node}"

for f in "$@"; do
  output="${f%.*}.webp"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --format webp --quality 85 2>&1)

  if [ $? -eq 0 ]; then
    osascript -e "display notification \"$result\" with title \"To WebP\""
  else
    osascript -e "display notification \"Failed: $result\" with title \"To WebP\" sound name \"Basso\""
  fi
done
