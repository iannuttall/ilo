#!/bin/bash
# Generate ilo raster icons from the committed favicon SVG.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_PUBLIC_DIR="$WORKER_DIR/public"
SOURCE_SVG="$WORKER_PUBLIC_DIR/favicon.svg"
LIGHT_RASTER_SVG="$WORKER_PUBLIC_DIR/favicon-light-raster.svg"
DARK_RASTER_SVG="$WORKER_PUBLIC_DIR/favicon-dark-raster.svg"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick ('magick') is required to generate icons." >&2
  exit 1
fi

if [ ! -f "$SOURCE_SVG" ]; then
  echo "Missing source SVG: $SOURCE_SVG" >&2
  exit 1
fi

cleanup() {
  rm -f "$LIGHT_RASTER_SVG" "$DARK_RASTER_SVG"
}

trap cleanup EXIT

build_raster_svg() {
  local fill="$1"
  local output="$2"

  # ImageMagick ignores the SVG's embedded CSS when rasterizing, so give the mark a fill directly.
  perl -0pe "s|<style>.*?</style>||s; s|class=\\\"logo-mark\\\"|fill=\\\"$fill\\\"|g" \
    "$SOURCE_SVG" > "$output"
}

build_raster_svg "#171717" "$LIGHT_RASTER_SVG"
build_raster_svg "#f5f5f5" "$DARK_RASTER_SVG"

render_png() {
  local size="$1"
  local output="$2"
  local svg="${3:-$LIGHT_RASTER_SVG}"

  magick -background none -density 1024 "$svg" \
    -resize "${size}x${size}" \
    -strip \
    "PNG32:$output"
}

echo "Generating worker icons from $SOURCE_SVG..."

# Light mode icons (black logo)
render_png 512 "$WORKER_PUBLIC_DIR/logo512.png" "$LIGHT_RASTER_SVG"
render_png 192 "$WORKER_PUBLIC_DIR/logo192.png" "$LIGHT_RASTER_SVG"
render_png 128 "$WORKER_PUBLIC_DIR/favicon.png" "$LIGHT_RASTER_SVG"

# Dark mode icons (white logo)
render_png 512 "$WORKER_PUBLIC_DIR/logo512-dark.png" "$DARK_RASTER_SVG"
render_png 192 "$WORKER_PUBLIC_DIR/logo192-dark.png" "$DARK_RASTER_SVG"
render_png 128 "$WORKER_PUBLIC_DIR/favicon-dark.png" "$DARK_RASTER_SVG"

echo "Done! Worker icons regenerated (light + dark)."
