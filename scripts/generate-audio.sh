#!/usr/bin/env bash
set -euo pipefail

# Generate the silent OGG Vorbis prompt audio used by the app.
# The game appends its configured .ogg extension to the PromptAudio name.
# Keep the file names in sync with src/lib/prompts.ts (0.5 second steps).
#
# Requirements: ffmpeg with libvorbis support.

cd "$(dirname "$0")/.."

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate the silent audio assets." >&2
  exit 1
fi

mkdir -p public/audio

for half_seconds in $(seq 2 30); do
  duration="$(awk "BEGIN { printf \"%.1f\", ${half_seconds}/2 }")"
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i anullsrc=r=44100:cl=mono \
    -t "$duration" \
    -c:a libvorbis -b:a 32k \
    "public/audio/silence-${duration}.ogg"
done

echo "Generated $(find public/audio -type f -name 'silence-*.ogg' | wc -l) silent OGG files in public/audio."
