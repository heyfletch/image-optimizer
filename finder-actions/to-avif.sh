#!/bin/bash
# Image Optimizer — Convert to AVIF (4:4:4 chroma, full saturation)
SIDECAR_DIR="$(cd "$(dirname "$0")/.." && pwd)/sidecar"
NODE_BIN="${NODE_BIN:-${HOME}/.nvm/versions/node/$(ls ${HOME}/.nvm/versions/node/ | tail -1)/bin/node}"

for f in "$@"; do
  output="${f%.*}.avif"
  result=$("$NODE_BIN" "$SIDECAR_DIR/dist/index.js" --optimize --input "$f" --output "$output" --format avif --quality 80 2>&1)

  if [ $? -ne 0 ]; then
    echo "Failed: $result" >&2
  fi
done
