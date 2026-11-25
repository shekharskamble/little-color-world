#!/bin/sh
# Trims every Cute Fish source's lines to the other packs' thickness (tools/art/uniform_lines.py --cap: lines wider than
# 10.5 are trimmed, thinner lines, eyes and dots stay as drawn) into art/svg/sea-animals/fish-thin/.
#   PY=<python with numpy, scipy, scikit-image, pillow> sh tools/sea-animals/thin_all.sh [NN ...]
set -e
cd "$(dirname "$0")/../.."
PY=${PY:-python3}
# Eyes the trimming hollowed out (pupil and shine kept as drawn): --keep x,y,r in page units.
extra() {
  case "$1" in
    65) echo "--keep 455,375,30 --keep 601,404,38 --keep 520,422,28" ;;  # Squid (eyes, mouth)
    16) echo "--keep 497,211,26" ;;                    # Seahorse
    82) echo "--keep 158,394,22 --keep 266,429,24" ;;  # Koi
    08) echo "--keep 350,355,30" ;;                    # Angelfish
    23) echo "--keep 197,376,24" ;;                    # Arowana
  esac
}
names=${*:-$(ls art/svg/sea-animals/fish | sed 's/\.svg$//')}
for n in $names; do
  # shellcheck disable=SC2046
  "$PY" tools/art/uniform_lines.py "art/svg/sea-animals/fish/$n.svg" "art/svg/sea-animals/fish-thin/$n.svg" --cap $(extra "$n")
  echo "$n"
done
