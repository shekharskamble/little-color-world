#!/bin/sh
# Trims every Simple Flowers source's lines to the other packs' thickness (tools/art/uniform_lines.py --cap: lines wider
# than 10.5 are trimmed, thinner lines and dots stay as drawn) into art/svg/flowers/simple-thin/.
#   PY=<python with numpy, scipy, scikit-image, pillow> sh tools/flowers/thin_all.sh [NN ...]
set -e
cd "$(dirname "$0")/../.."
PY=${PY:-python3}
# Extra lines (page units) close petals the artist left open where the stamen crosses them, and stems left open at
# the bottom (otherwise the leaves joined to them leak into the background).
extra() {
  case "$1" in
    05) echo "--line 567,100,588,114 --line 625,128,584,132" ;;  # Hibiscus
    18) echo "--line 620,110,596,108" ;;                         # Big Hibiscus
    24) echo "--line 342,156,351,166" ;;                         # Pink Carnation (gap in the outer frill)
    42) echo "--line 468,726,495,726" ;;                         # Pinwheel Flower (stem open at the bottom)
    49) echo "--line 565,246,599,256 --line 677,201,620,212" ;;  # Hibiscus Bloom (two petals open at the stamen)
    59) echo "--line 481,726,500,726" ;;                         # Dog Rose (stem open at the bottom)
    61) echo "--line 437,726,459,726" ;;                         # Star Lily (stem open at the bottom)
  esac
}
names=${*:-$(ls art/svg/flowers/simple | sed 's/\.svg$//')}
for n in $names; do
  # shellcheck disable=SC2046
  "$PY" tools/art/uniform_lines.py "art/svg/flowers/simple/$n.svg" "art/svg/flowers/simple-thin/$n.svg" --cap $(extra "$n")
  echo "$n"
done
