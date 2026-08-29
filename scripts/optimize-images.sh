#!/usr/bin/env bash
# Shrink display images. Does not change any desk number.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Mast mark is 92×92 CSS. Source is 1536×1024. Keep aspect; 3× is enough.
ffmpeg -y -hide_banner -loglevel error \
  -i "$root/public/logo-pc.png" \
  -vf "scale=276:-1" \
  -frames:v 1 \
  -compression_level 100 \
  "$tmp/logo-pc.png"
if [[ "$(wc -c < "$tmp/logo-pc.png")" -lt "$(wc -c < "$root/public/logo-pc.png")" ]]; then
  cp "$tmp/logo-pc.png" "$root/public/logo-pc.png"
  echo "logo-pc.png → $(wc -c < "$root/public/logo-pc.png") bytes"
else
  echo "logo-pc.png left unchanged (ffmpeg output not smaller)"
fi

# Rank / compare / school marks display at 28–56px. 128px is 2× on the large size.
shopt -s nullglob
for src in "$root/public/logos"/*.png; do
  name="$(basename "$src")"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$src" \
    -vf "scale='min(128,iw)':'min(128,ih)':force_original_aspect_ratio=decrease" \
    -frames:v 1 \
    -compression_level 100 \
    "$tmp/$name"
  if [[ "$(wc -c < "$tmp/$name")" -lt "$(wc -c < "$src")" ]]; then
    cp "$tmp/$name" "$src"
    echo "$name → $(wc -c < "$src") bytes"
  fi
done
