#!/bin/bash
# Image Optimizer — Resize to 512px width
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-${HOME}/.nvm/versions/node/$(ls ${HOME}/.nvm/versions/node/ | tail -1)/bin/node}"

for f in "$@"; do
  ext="${f##*.}"
  output="${f%.*}-512.${ext}"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --width 512 --quality 92 2>&1)

  if [ $? -eq 0 ]; then
    osascript -e "display notification \"$result\" with title \"To 512px\""
  else
    osascript -e "display notification \"Failed: $result\" with title \"To 512px\" sound name \"Basso\""
  fi
done
