"""Redraws a clipart drawing with lines of one width (owner 2026-11-25: "no uniformity between strokes").

Some packs (Insects) mix thick outlines with thin, tapered inner lines; thinning them all by the same amount (as
tools/art/clipart.ts does) leaves the inner lines much thinner. This one-off preprocessing step re-draws every line at
the same width instead:

  1. render the source SVG and place it on the 1024x768 page exactly as the generator's FIT would (3x resolution);
  2. draw any extra closing lines (page coordinates), so they get the same treatment;
  3. keep solid blobs (antenna knobs) solid; reduce every other line to its centre line (skeleton);
  4. re-draw the centre lines with a round pen of width W and trace the result back to smooth outlines.
With --cap, step 4 keeps each line as drawn and only trims lines wider than W down to W (Sea Animals: the owner wanted
the original shapes, at the other packs' line thickness).

The output (page coordinates, filled black shapes with holes, like the clipart) goes to the pack's *-uniform/ folder
(tools/insects/uniform_all.sh), which the pack's generator reads. Dev-only: needs rsvg-convert and Python with numpy, scipy, scikit-image
and pillow (e.g. a throwaway venv); the app never runs this.

  python uniform_lines.py <in.svg> <out.svg> [--width 10.5] [--line x1,y1,x2,y2 ...]
"""
import argparse
import io
import subprocess

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage import measure, morphology

PAGE_W, PAGE_H = 1024, 768
FIT_H, FIT_W = 690, 930  # the generators' FIT
K = 3  # raster pixels per page unit


def render(svg: str, width: int) -> np.ndarray:
    png = subprocess.run(['rsvg-convert', '-w', str(width), '-b', 'white', svg], check=True, capture_output=True).stdout
    return np.asarray(Image.open(io.BytesIO(png)).convert('L'), dtype=np.float32)


def place(svg: str) -> np.ndarray:
    """The drawing as a page-sized grey image (0 = ink), big and centred like FIT."""
    probe = render(svg, 2000)
    ys, xs = np.nonzero(probe < 128)
    h, w = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    s = min(FIT_H * K / h, FIT_W * K / w)
    big = render(svg, int(round(2000 * s)))
    ys, xs = np.nonzero(big < 128)
    crop = big[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    page = np.full((PAGE_H * K, PAGE_W * K), 255, dtype=np.float32)
    top = (PAGE_H * K - crop.shape[0]) // 2
    left = (PAGE_W * K - crop.shape[1]) // 2
    page[top:top + crop.shape[0], left:left + crop.shape[1]] = crop
    return page


def prune(skel: np.ndarray, n: int) -> np.ndarray:
    """Removes side branches shorter than n pixels (stubs where lines meet at an angle), keeping real line ends."""
    kernel = np.ones((3, 3), dtype=int)

    def ends(s: np.ndarray) -> np.ndarray:
        return s & (ndimage.convolve(s.astype(int), kernel, mode='constant') == 2)

    cut = skel.copy()
    for _ in range(n):
        cut &= ~ends(cut)
    # Grow the surviving line ends back along the original skeleton, so real ends keep their length.
    grow = ends(cut)
    for _ in range(n):
        grow = ndimage.binary_dilation(grow, structure=np.ones((3, 3))) & skel & ~cut
        cut |= grow
    return cut


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--width', type=float, default=10.5, help='line width in page units')
    ap.add_argument('--solid', type=float, default=13.0, help='blobs wider than twice this (page units) stay solid')
    ap.add_argument('--spur', type=float, default=10.0, help='side branches shorter than this (page units) are removed')
    ap.add_argument('--cap', action='store_true', help='keep the lines as drawn, only trimming lines wider than --width; '
                    'solid shapes drawn as such (eyes, dots) stay as drawn')
    ap.add_argument('--keep', action='append', default=[], help='x,y,r in page units: the drawn shape there (an eye) '
                    'is kept exactly as drawn within r')
    ap.add_argument('--line', action='append', default=[], help='extra line x1,y1,x2,y2 in page units')
    a = ap.parse_args()

    ink = place(a.src) < 128
    if a.line:
        img = Image.fromarray((~ink).astype(np.uint8) * 255)
        d = ImageDraw.Draw(img)
        for spec in a.line:
            x1, y1, x2, y2 = (float(v) * K for v in spec.split(','))
            d.line([(x1, y1), (x2, y2)], fill=0, width=int(a.width * K))
        ink = np.asarray(img) < 128

    # Solid blobs: what survives an opening with a disk wider than any line.
    # (An opening, computed with distance transforms: pixels within r of a point at least r deep inside the ink.)
    r = a.solid * K
    core = ndimage.distance_transform_edt(ink) >= r
    solid = (ndimage.distance_transform_edt(~core) <= r) & ink if core.any() else np.zeros_like(ink)
    skeleton = prune(morphology.skeletonize(ink), int(a.spur * K))
    # Only blobs where a line ends (antenna knobs) stay solid; deep ink where lines merge (joints, notches) does not.
    if solid.any():
        ends = skeleton & (ndimage.convolve(skeleton.astype(int), np.ones((3, 3), dtype=int), mode='constant') == 2)
        labels, count = ndimage.label(solid)
        keep = set(np.unique(labels[ends & solid])) - {0}
        if a.cap:
            # A blob that is a good part of its own piece of ink is a shape drawn solid (a pupil), not a thick joint.
            pieces, _ = ndimage.label(ink)
            sizes = np.bincount(pieces.ravel())
            for i in range(1, count + 1):
                blob = labels == i
                if blob.sum() >= 0.4 * sizes[np.bincount(pieces[blob]).argmax()]:
                    keep.add(i)
        solid = np.isin(labels, list(keep)) if keep else np.zeros_like(solid)

    half = a.width * K / 2
    lines = half - ndimage.distance_transform_edt(~skeleton)  # > 0 within half a pen of a centre line
    if a.cap:  # and inside the drawn ink: thinner lines keep their drawn width and shape
        lines = np.minimum(lines, ndimage.distance_transform_edt(ink) - ndimage.distance_transform_edt(~ink))
        # Small separate shapes (dots, little rings, brows) stay exactly as drawn: trimming a thick little ring would
        # open its hole wide.
        pieces, n_pieces = ndimage.label(ink)
        sizes = np.bincount(pieces.ravel())
        dots = np.isin(pieces, [i for i in range(1, n_pieces + 1) if sizes[i] < 400 * K * K])  # page units²
        lines = np.maximum(lines, ndimage.distance_transform_edt(dots) - ndimage.distance_transform_edt(~dots))
    blob = ndimage.distance_transform_edt(solid) - ndimage.distance_transform_edt(~solid)
    field = np.maximum(lines, blob)
    if a.keep:
        pieces, _ = ndimage.label(ink)
        yy, xx = np.mgrid[0:ink.shape[0], 0:ink.shape[1]]
        kept = np.zeros_like(ink)
        for spec in a.keep:
            x, y, r = (float(v) * K for v in spec.split(','))
            near = ink & ((xx - x) ** 2 + (yy - y) ** 2 <= r * r)
            if not near.any():
                continue
            # The piece of ink at the point (or the biggest one in the circle), only within the circle.
            at = pieces[int(y), int(x)] or np.bincount(pieces[near]).argmax()
            kept |= near & (pieces == at)
        field = np.maximum(field, ndimage.distance_transform_edt(kept) - ndimage.distance_transform_edt(~kept))
    field = np.pad(field, 2, constant_values=-1e3)

    paths = []
    for c in measure.find_contours(field, 0):
        c = measure.approximate_polygon(c, tolerance=0.6)
        if len(c) < 4:
            continue
        pts = [f'{(x - 2) / K:.2f},{(y - 2) / K:.2f}' for y, x in c]
        paths.append('M ' + ' L '.join(pts) + ' Z')
    with open(a.out, 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PAGE_W} {PAGE_H}">\n')
        f.write(f'<path fill="#000" fill-rule="evenodd" d="{" ".join(paths)}"/>\n</svg>\n')


if __name__ == '__main__':
    main()
