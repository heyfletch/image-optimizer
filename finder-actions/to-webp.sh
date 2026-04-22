#!/bin/bash
# Image Optimizer — Convert to WebP
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-${HOME}/.nvm/versions/node/$(ls ${HOME}/.nvm/versions/node/ | tail -1)/bin/node}"

for f in "$@"; do
  output="${f%.*}.webp"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --format webp --quality 85 2>&1)

  if [ $? -ne 0 ]; then
    echo "Failed: $result" >&2
  fi
done
