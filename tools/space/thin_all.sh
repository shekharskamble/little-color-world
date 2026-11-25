#!/bin/sh
# Trims every space pack source's lines to the other packs' thickness (tools/art/uniform_lines.py --cap: lines wider
# than 10.5 are trimmed, thinner lines and dots stay as drawn) into art/svg/space/pack-thin/.
#   PY=<python with numpy, scipy, scikit-image, pillow> sh tools/space/thin_all.sh [NN ...]
set -e
cd "$(dirname "$0")/../.."
PY=${PY:-python3}
# Extra lines (page units) close shapes the artist left open (otherwise they leak into the background).
# Every eye is kept exactly as drawn, pupil and shines (owner: "keep them exactly like the originals"):
# --keep x,y,r in page units.
extra() {
  case "$1" in
    01) echo "--keep 357,361,63 --keep 652,377,64" ;;  # Mercury
    02) echo "--keep 654,382,62 --keep 368,385,62" ;;  # Venus
    03) echo "--keep 636,406,60 --keep 379,406,60" ;;  # Earth
    04) echo "--keep 370,376,55 --keep 643,376,55" ;;  # Mars
    05) echo "--keep 618,379,49 --keep 404,379,49" ;;  # Jupiter
    06) echo "--keep 614,351,41 --keep 421,378,44" ;;  # Saturn
    07) echo "--keep 620,362,45 --keep 403,393,46" ;;  # Uranus
    08) echo "--keep 394,343,48 --keep 630,343,48" ;;  # Neptune
    09) echo "--keep 393,341,46 --keep 622,341,46" ;;  # Pluto
    10) echo "--keep 428,350,37 --keep 594,351,38" ;;  # Astronaut Girl
    11) echo "--keep 605,368,37 --keep 417,369,36" ;;  # Astronaut Boy
    12) echo "--keep 416,333,36 --keep 610,333,36" ;;  # Little Astronaut
    13) echo "--keep 638,318,33 --keep 494,363,32" ;;  # Space Walk
    14) echo "--keep 448,344,26 --keep 571,344,26" ;;  # Rocket
    16) echo "--line 511,609,520,637" ;;               # Lift Off (smoke cloud open between its two middle puffs)
    17) echo "--keep 608,373,49 --keep 377,374,49" ;;  # Moon
    20) echo "--keep 381,436,26 --keep 459,453,26" ;;  # Satellite
    21) echo "--keep 387,399,45 --keep 628,400,45" ;;  # Sun
    22) echo "--keep 568,470,25 --keep 454,470,25" ;;  # Space Shuttle
    23) echo "--keep 377,524,41 --keep 169,524,41" ;;  # Moon Rover
    24) echo "--keep 405,462,34" ;;                    # Smiley Satellite
    25) echo "--keep 843,374,39 --keep 685,374,39" ;;  # Comet
    # 26–74: every solid drawn shape (eyes, dots, visors, the black hole and eclipse discs) kept as drawn.
    26) echo "--keep 291,449,52 --keep 152,454,51" ;;  # comet1
    27) echo "--keep 163,505,57 --keep 344,493,56" ;;  # comet2
    29) echo "--keep 653,367,96 --keep 375,395,96" ;;  # asteroid2
    30) echo "--keep 371,317,114 --keep 644,317,114" ;;  # alien
    32) echo "--keep 175,431,40 --keep 306,418,39 --keep 576,507,28 --keep 513,235,22 --keep 885,431,18 --keep 893,492,18 --keep 815,499,18 --keep 839,318,17 --keep 629,535,15" ;;  # shooting_star
    33) echo "--keep 634,379,81 --keep 388,378,80" ;;  # alien1
    34) echo "--keep 516,348,133" ;;  # alien2
    35) echo "--keep 505,266,84 --keep 365,303,78 --keep 647,303,78 --keep 583,282,25 --keep 436,282,24 --keep 684,182,18" ;;  # alien3
    36) echo "--keep 737,447,84 --keep 285,442,83 --keep 415,369,56 --keep 609,368,56 --keep 511,368,39" ;;  # teddy_bear_spaceship
    28) echo "--keep 291,595,26" ;;  # asteroid1
    37) echo "--keep 428,420,63 --keep 636,380,61 --keep 268,226,31" ;;  # galaxy (and the rocket window's pupil)
    38) echo "--keep 387,421,68 --keep 596,388,63 --keep 749,150,30" ;;  # ringed_planet_spaceship
    39) echo "--keep 626,337,73 --keep 418,377,73 --keep 111,392,20 --keep 717,445,17 --keep 98,481,17" ;;  # heart_ring_planet
    41) echo "--keep 571,368,31 --keep 455,372,30 --keep 721,544,24 --keep 810,545,23 --keep 698,185,18 --keep 767,193,18 --keep 183,496,18 --keep 196,602,16 --keep 586,128,11 --keep 256,475,17" ;;  # planetary_system
    42) echo "--keep 567,382,202 --keep 205,388,59 --keep 214,568,59 --keep 196,277,37" ;;  # moon_flag
    44) echo "--keep 306,315,33 --keep 509,482,24 --keep 259,549,19 --keep 520,674,18 --keep 95,349,14 --keep 748,617,14 --keep 302,462,13 --keep 722,231,12 --keep 356,615,12 --keep 205,308,24 --keep 308,310,25 --keep 510,477,20 --keep 430,483,19 --keep 521,669,18 --keep 452,681,18" ;;  # meteor_shower
    45) echo "--keep 412,427,369 --keep 314,104,20 --keep 514,52,19 --keep 516,718,19 --keep 848,277,18 --keep 845,494,18 --keep 423,120,26 --keep 602,125,28 --keep 274,211,30 --keep 749,220,34 --keep 802,385,35 --keep 750,549,33 --keep 599,647,29" ;;  # solar_eclipse (and the solid rays)
    46) echo "--width 60 --keep 250,144,23 --keep 838,574,23 --keep 242,624,19 --keep 716,107,18 --keep 958,354,17" ;;  # black_hole: the thick swirl arms are the drawing, so nothing is trimmed
    47) echo "--keep 874,249,25 --keep 678,50,21 --keep 172,604,21 --keep 134,324,18 --keep 746,642,18 --keep 323,77,17 --keep 905,291,15 --keep 211,643,15" ;;  # cosmic_swirl
    48) echo "--keep 572,343,40" ;;  # rocket_star
    49) echo "--keep 309,383,83 --keep 571,372,62" ;;  # plutov2 (right eye touches the hand)
    50) echo "--keep 397,348,73 --keep 635,349,73 --keep 722,171,23" ;;  # plutov3
    56) echo "--keep 800,564,18" ;;  # earth3
    62) echo "--keep 290,548,17" ;;  # saturn3
    67) echo "--keep 263,626,37 --keep 390,628,36" ;;  # moon_rover
    69) echo "--keep 591,314,55 --keep 439,316,54 --keep 417,421,19 --keep 329,371,36 --keep 699,371,36 --keep 369,389,36 --keep 658,389,36 --keep 327,407,36 --keep 701,407,36 --keep 394,361,32 --keep 634,361,32" ;;  # ufo3 (and the dark opening)
    70) echo "--keep 434,293,36 --keep 577,295,36" ;;  # star_ship
    71) echo "--keep 160,402,37 --keep 304,403,37 --keep 210,377,15" ;;  # docking
  esac
}
names=${*:-$(ls art/svg/space/pack | sed 's/\.svg$//')}
for n in $names; do
  # shellcheck disable=SC2046
  "$PY" tools/art/uniform_lines.py "art/svg/space/pack/$n.svg" "art/svg/space/pack-thin/$n.svg" --cap $(extra "$n")
  echo "$n"
done
