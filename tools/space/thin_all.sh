#!/bin/sh
# Trims every space pack source's lines to the other packs' thickness (tools/art/uniform_lines.py --cap: lines wider
# than 10.5 are trimmed, thinner lines and dots stay as drawn) into art/svg/space/pack-thin/.
#   PY=<python with numpy, scipy, scikit-image, pillow> sh tools/space/thin_all.sh [NN ...]
set -e
cd "$(dirname "$0")/../.."
PY=${PY:-python3}
# Extra lines (page units) close shapes the artist left open (otherwise they leak into the background).
extra() {
  case "$1" in
    16) echo "--line 511,609,520,637" ;;   # Lift Off (smoke cloud open between its two middle puffs)
  esac
}
names=${*:-$(ls art/svg/space/pack | sed 's/\.svg$//')}
for n in $names; do
  # shellcheck disable=SC2046
  "$PY" tools/art/uniform_lines.py "art/svg/space/pack/$n.svg" "art/svg/space/pack-thin/$n.svg" --cap $(extra "$n")
  echo "$n"
done
