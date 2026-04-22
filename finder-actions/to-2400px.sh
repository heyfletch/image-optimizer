#!/bin/bash
# Image Optimizer — Resize to 2400px width
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-${HOME}/.nvm/versions/node/$(ls ${HOME}/.nvm/versions/node/ | tail -1)/bin/node}"

for f in "$@"; do
  ext="${f##*.}"
  output="${f%.*}-2400.${ext}"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --width 2400 --quality 92 2>&1)

  if [ $? -ne 0 ]; then
    echo "Failed: $result" >&2
  fi
done
