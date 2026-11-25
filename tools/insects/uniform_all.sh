#!/bin/sh
# Redraws every insect source with lines of one width (tools/art/uniform_lines.py) into art/svg/insects/bugs-uniform/.
#   PY=<python with numpy, scipy, scikit-image, pillow> sh tools/insects/uniform_all.sh [Name ...]
# Extra lines (page units) close shapes the artist left open: the Butterfly's inner wing curves and wing notches.
set -e
cd "$(dirname "$0")/../.."
PY=${PY:-python3}
extra() {
  case "$1" in
    Caterpillar) echo "--solid 16" ;;  # its short, thick feet are lines, not knobs
    Butterfly) echo "--line 420,337,474,398 --line 601,337,547,398 --line 388,400,474,404 --line 633,402,547,406" ;;
  esac
}
names=${*:-$(ls art/svg/insects/bugs | sed 's/\.svg$//')}
for n in $names; do
  # shellcheck disable=SC2046
  "$PY" tools/art/uniform_lines.py "art/svg/insects/bugs/$n.svg" "art/svg/insects/bugs-uniform/$n.svg" $(extra "$n")
  echo "$n"
done
