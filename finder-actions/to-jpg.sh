#!/bin/bash
# Image Optimizer — Convert to JPEG
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-${HOME}/.nvm/versions/node/$(ls ${HOME}/.nvm/versions/node/ | tail -1)/bin/node}"

for f in "$@"; do
  output="${f%.*}.jpg"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --format jpeg --quality 92 2>&1)

  if [ $? -eq 0 ]; then
    osascript -e "display notification \"$(printf '%s' "$result" | tr '"' "'")\" with title \"To JPEG\""
  else
    osascript -e "display notification \"$(printf '%s' "Failed: $result" | tr '"' "'")\" with title \"To JPEG\" sound name \"Basso\""
  fi
done
