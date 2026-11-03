// Turns owner-supplied clipart into coloring-page layers, and the small helpers its scene generators share.
// The clipart draws its lines as filled black shapes with holes. Each hole becomes a part children can fill (tiny ones
// stay white), and the black artwork becomes one locked detail drawn on top, so the lines stay exactly as drawn.
import { readFileSync } from 'node:fs';

import CanvasKitInit, { type CanvasKit, type Path } from 'canvaskit-wasm';

import { flattenPath, type Point, type Subpath } from '../../src/engine/geometry/path';
import { area, boundsOf, boundsContain, containsPoint, distanceToEdges, type Bounds } from '../../src/engine/geometry/polygon';
import { apply, multiply, parseTransform, type Matrix } from '../lcw/matrix';
import { transformPathData } from '../lcw/pathData';
import { INK, type Region } from './layered';
import { n } from './primitives';

export class Art {
  regions: Region[] = [];
  details: string[] = [];
  lines: string[] = [];
  /** A region children can fill. Parts with the same name become one region with one outline. */
  r(name: string, ...els: string[]) {
    for (const el of els) this.regions.push({ name, el });
  }
  /** A region with no outline of its own (its edge is drawn by artwork on top). */
  fillOnly(name: string, el: string) {
    this.regions.push({ name, el, outline: false });
  }
  /** A locked, pre-coloured detail. Details with the same name merge, so they must share a colour. */
  d(name: string, el: string, fill: string, extraStyle = '') {
    this.details.push(`${el.replace(/^<(\w+)/, `<$1 inkscape:label="${name}"`)} style="fill:${fill}${extraStyle}" />`);
  }
  l(...d: string[]) {
    this.lines.push(...d);
  }
}

/** Small seeded random numbers, so a page's scene changes only when its seed (the character's name) does. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let x = Math.imul(h ^ (h >>> 15), h | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export type Box = [number, number, number, number];
export const hits = (b: Box, boxes: Box[]) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);

/** Where the clipart goes: it stands on `footY`, centred on `centerX`, scaled to `height` (narrower if too wide). */
/** `centerY`, when set, centres the picture vertically and `footY` is ignored. */
export type Fit = { footY: number; height: number; maxWidth: number; centerX?: number; centerY?: number };

/** Holes smaller than this (page units², 0.4% of the page: the toddler minimum) stay white instead of being a part. */
const MIN_PART_AREA = 0.004 * 1024 * 768;
/**
 * How far each part reaches under the black line around it. The clipart's lines are drawn as they are; growing the
 * parts underneath avoids a pale hairline where a colour meets an antialiased edge.
 */
const TUCK = 2;

type Piece = { d: string; poly: Subpath; bounds: Bounds; area: number; depth: number };
/** `toPage` maps the source drawing's coordinates onto the page. */
export type Clipart = { pieces: Piece[]; bounds: Bounds; toPage: Matrix };

/**
 * Reads a clipart SVG (its paths, under any `<g transform>`), scales it onto the page and splits it into closed
 * pieces. A piece's depth is how many other pieces enclose it: even depths are black artwork, odd depths are holes.
 */
/** The same outline drawn again, maybe from another start point or nudged by a fraction of a unit. */
function sameShape(a: Piece, b: Piece): boolean {
  const ab = a.bounds;
  const bb = b.bounds;
  const tol = 1.5;
  return (
    Math.abs(ab.minX - bb.minX) < tol &&
    Math.abs(ab.minY - bb.minY) < tol &&
    Math.abs(ab.maxX - bb.maxX) < tol &&
    Math.abs(ab.maxY - bb.maxY) < tol &&
    Math.abs(a.area - b.area) < 0.03 * Math.max(Math.abs(a.area), Math.abs(b.area), 1)
  );
}

/** `dedupe` drops repeated copies of the same shape (some packs stack one outline dozens of times). */
export function loadClipart(file: string, fit: Fit, opts: { dedupe?: boolean } = {}): Clipart {
  const svg = readFileSync(file, 'utf8');
  // Traced clipart (e.g. potrace) wraps its paths in one flipping group transform.
  const group = /<g[^>]*\stransform="([^"]+)"/.exec(svg)?.[1];
  const g: Matrix = parseTransform(group);
  const raw = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => (group ? transformPathData(m[1]!, g) : m[1]!));
  const src = boundsOf(raw.flatMap((d) => flattenPath(d)));
  const w = src.maxX - src.minX;
  const h = src.maxY - src.minY;
  const s = Math.min(fit.height / h, fit.maxWidth / w);
  const m: Matrix = [s, 0, 0, s, (fit.centerX ?? 512) - (src.minX + w / 2) * s, fit.centerY !== undefined ? fit.centerY - (src.minY + h / 2) * s : fit.footY - src.maxY * s];
  const pieces: Piece[] = raw
    .flatMap((d) => transformPathData(d, m).split(/(?=M)/))
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const poly = flattenPath(d, 2)[0]!; // fine steps: grown parts are saved as these points
      return { d, poly, bounds: boundsOf([poly]), area: area([poly]), depth: 0 };
    })
    .filter((p, i, all) => !opts.dedupe || !all.slice(0, i).some((q) => sameShape(p, q)));
  for (const p of pieces) {
    const at = p.poly.points[0]!;
    p.depth = pieces.filter((q) => q !== p && boundsContain(q.bounds, at) && containsPoint([q.poly], at, 'nonzero')).length;
  }
  return { pieces, bounds: boundsOf(pieces.map((p) => p.poly)), toPage: multiply(m, g) };
}

/**
 * The clipart without the small rings (e.g. cheek circles) at `at` (source coordinates, inside each ring's hole): at
 * each point the two smallest shapes holding it, the hole and its outline, are left out. Fails if a point misses.
 */
export function dropRings(clip: Clipart, at: readonly (readonly [number, number])[]): Clipart {
  const gone = new Set<Piece>();
  for (const [x, y] of at) {
    const p = apply(clip.toPage, { x, y });
    const holding = clip.pieces
      .filter((q) => boundsContain(q.bounds, p) && containsPoint([q.poly], p, 'nonzero'))
      .sort((a, b) => a.area - b.area);
    if (holding.length < 3) throw new Error(`dropRings: no ring at ${x},${y}`);
    gone.add(holding[0]!).add(holding[1]!);
  }
  return { ...clip, pieces: clip.pieces.filter((q) => !gone.has(q)) };
}

/** A point just inside a closed polygon (its centre may be outside, e.g. for a crescent). */
function interiorPoint(poly: Subpath): Point {
  const pts = poly.points;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.5) continue;
    for (const side of [1, -1]) {
      const q = { x: (a.x + b.x) / 2 + (side * (b.y - a.y)) / len, y: (a.y + b.y) / 2 - (side * (b.x - a.x)) / len };
      if (containsPoint([poly], q, 'nonzero')) return q;
    }
  }
  return pts[0]!;
}

/** The polygon pushed `by` units outward along its normals, as path data (a small offset of a smooth outline). */
function grow(poly: Subpath, by: number): string {
  const pts = poly.points;
  const k = pts.length;
  const normal = (i: number) => {
    const a = pts[(i - 1 + k) % k]!;
    const b = pts[(i + 1) % k]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
  };
  // Point the normals outward: a step along them from an edge must leave the polygon.
  const mid = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
  const n0 = normal(0);
  const sign = containsPoint([poly], { x: mid.x + n0.x * 0.5, y: mid.y + n0.y * 0.5 }, 'nonzero') ? -1 : 1;
  return `M ${pts
    .map((p, i) => {
      const nm = normal(i);
      return `${n(p.x + sign * by * nm.x)},${n(p.y + sign * by * nm.y)}`;
    })
    .join(' L ')} Z`;
}

/** Adds the clipart's holes as parts (numbered from `firstPart`) and its black lines as one locked detail on top. */
export function addClipart(a: Art, { pieces }: Clipart, firstPart = 1) {
  // Holes, outermost first so a hole inside an island inside a hole sits on top.
  const holes = pieces.filter((p) => p.depth % 2 === 1).sort((p, q) => p.depth - q.depth || q.area - p.area);
  let part = firstPart - 1;
  for (const hole of holes) {
    if (hole.area >= MIN_PART_AREA) a.fillOnly(`part-${++part}`, `<path d="${grow(hole.poly, TUCK)}"`);
    else a.d('small-hole', `<path d="${grow(hole.poly, TUCK)}"`, '#ffffff', ';stroke:none');
  }
  // All the black artwork as one shape, drawn as is: even-odd turns the holes back into holes.
  a.d('artwork', `<path d="${pieces.map((p) => p.d).join(' ')}"`, INK, ';fill-rule:evenodd;stroke:none');
}

/** Line thickness of the Animals pages (page units), which other clipart is thinned to match. */
export const ANIMAL_LINE = 10.5;

/**
 * The clipart's typical line thickness: the median distance from a hole's edge to the nearest other edge. Big holes
 * only, so stripes and spots do not count.
 */
export function lineWidth({ pieces }: Clipart): number {
  const ds: number[] = [];
  for (const h of pieces.filter((p) => p.depth % 2 === 1 && p.area > 3000)) {
    const others = pieces.filter((q) => q !== h).map((q) => q.poly);
    for (let i = 0; i < h.poly.points.length; i += 4) ds.push(distanceToEdges(others, h.poly.points[i]!));
  }
  ds.sort((a, b) => a - b);
  return ds[Math.floor(ds.length / 2)] ?? 0;
}

let kit: Promise<CanvasKit> | null = null;
/** A Skia path as compact path data (2 decimals, no exponents). */
/** One closed contour of absolute M/L/Q/C/Z path data, drawn the other way round. */
function reverseContour(d: string): string {
  const cmds = [...d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)].map((m) => ({ c: m[1]!, v: m[2]!.trim().split(/[\s,]+/).filter(Boolean).map(Number) }));
  const start = cmds[0]!.v;
  let at = start;
  const segs: Array<{ c: string; from: number[]; ctrl: number[] }> = [];
  for (const { c, v } of cmds.slice(1)) {
    if (c === 'Z' || !v.length) continue;
    segs.push({ c, from: at, ctrl: v.slice(0, -2) });
    at = v.slice(-2);
  }
  if (at[0] !== start[0] || at[1] !== start[1]) segs.push({ c: 'L', from: at, ctrl: [] });
  const pairs = (ctrl: number[]) => Array.from({ length: ctrl.length / 2 }, (_, i) => `${ctrl[2 * i]} ${ctrl[2 * i + 1]}`);
  const back = segs.reverse().map((sg) => `${sg.c}${[...pairs(sg.ctrl).reverse(), `${sg.from[0]} ${sg.from[1]}`].join(' ')}`);
  return `M${start[0]} ${start[1]}${back.join('')}Z`;
}

/**
 * Path data with its contours wound consistently: outer contours one way, holes the other. Path operations can leave
 * a spot's separate pieces winding opposite ways, which fills fine but cancels the signed area the validator measures.
 */
function windConsistently(d: string): string {
  const contours = d.split(/(?=M)/).filter((c) => c.trim()).map((c) => ({ d: c, sp: flattenPath(c)[0]! }));
  const signed = (sp: Subpath) => sp.points.reduce((t, a, i, ps) => { const b = ps[(i + 1) % ps.length]!; return t + a.x * b.y - b.x * a.y; }, 0);
  return contours
    .map((c) => {
      const depth = contours.filter((o) => o !== c && containsPoint([o.sp], c.sp.points[0]!, 'nonzero')).length;
      return (signed(c.sp) > 0) === (depth % 2 === 0) ? c.d : reverseContour(c.d);
    })
    .join('');
}

const svgOf = (p: { toSVGString(): string }) => p.toSVGString().replace(/-?[\d.]+(e-?\d+)?/g, (v) => String(n(Number(v))));
const canvasKit = () => (kit ??= CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) }));

/**
 * Black thicker than twice this (page units) is a solid shape, not a line: spots, stripes, a filled nose. Its inside is
 * opened up for colouring and it keeps a ring this wide. Lines (ANIMAL_LINE thick) are never touched.
 */
const OPEN_AT = 6.5;
/** Opened spots and ridges at least this big (page units², 0.006% of the page) can be coloured one by one. */
const SMALL_MIN = 0.00006 * 1024 * 768;
/** Loose solid spots at least this big (page units²) are opened; smaller dots (a nostril) stay black. */
const ISLAND_MIN = 120;
/** A white loop smaller than this (page units², 0.015% of the page) drawn inside a ridge is filled in. */
const LOOP_MAX = 0.00015 * 1024 * 768;

/**
 * outer − cut, checked against a rasterised result: Skia's path ops very occasionally return a wrong shape for large
 * traced paths (a straight chord across the drawing). Retries with slightly nudged inputs.
 */
function checkedDifference(ck: CanvasKit, outer: Path, cut: Path): Path {
  const W = 1024;
  const H = 768;
  const surface = ck.MakeSurface(W, H)!;
  const canvas = surface.getCanvas();
  const paint = new ck.Paint();
  const pixels = (draw: () => void) => {
    canvas.clear(ck.TRANSPARENT);
    draw();
    return surface.makeImageSnapshot().readPixels(0, 0, { width: W, height: H, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Premul, colorSpace: ck.ColorSpace.SRGB }) as Uint8Array;
  };
  const expected = pixels(() => {
    canvas.drawPath(outer, paint);
    const clear = new ck.Paint();
    clear.setBlendMode(ck.BlendMode.Clear);
    canvas.drawPath(cut, clear);
  });
  const wrong = (p: Path | null) => {
    if (!p) return Infinity;
    const got = pixels(() => canvas.drawPath(p, paint));
    let n = 0;
    for (let i = 3; i < got.length; i += 4) if (Math.abs(got[i]! - expected[i]!) > 128) n++; // alpha
    return n;
  };
  const nudge = (p: Path, d: number) => {
    const q = ck.Path.MakeFromSVGString(transformPathData(svgOf(p), [1, 0, 0, 1, d, d]))!;
    q.setFillType(p.getFillType());
    return q;
  };
  const tries: (() => Path | null)[] = [
    () => ck.Path.MakeFromOp(outer, cut, ck.PathOp.Difference),
    () => ck.Path.MakeFromOp(nudge(outer, 0.011), cut, ck.PathOp.Difference),
    () => ck.Path.MakeFromOp(outer, nudge(cut, 0.013), ck.PathOp.Difference),
    () => ck.Path.MakeFromOp(nudge(outer, 0.021), nudge(cut, 0.007), ck.PathOp.Difference),
  ];
  let best: Path | null = null;
  let bestWrong = Infinity;
  for (const attempt of tries) {
    const p = attempt();
    const w = wrong(p);
    if (w < bestWrong) [best, bestWrong] = [p, w];
    if (w < 50) break; // a few antialiased edge pixels
  }
  if (bestWrong >= 50) console.warn(`white areas differ from the drawing by ${bestWrong} pixels`);
  return best!;
}

export type RegionOptions = {
  /** Lines (path data in the source drawing's coordinates) that close shapes the artist left open, drawn like its lines. */
  close?: readonly string[];
  /** Whether the drawing has eyes to keep black (false for vehicles: round windows and lights are coloured). */
  eyes?: boolean;
  /**
   * Points (source coordinates) inside each eye, for drawings where guessing the eyes goes wrong (an open mouth bigger
   * than an eye, a big highlight, or a lidded eye with no highlight). The solid shapes there stay black.
   */
  eyeAt?: readonly (readonly [number, number])[];
  /** Points (source coordinates) inside solid spots that have a white highlight, so are not eyes and are opened too. */
  spots?: readonly (readonly [number, number])[];
  /** Areas at least this big (page units²) can be coloured; smaller ones stay white. */
  minArea?: number;
  target?: number;
  /**
   * Most regions a page may have (the validator's limit for the age band). Past it, the smallest small parts are merged
   * into one region (all still colourable, together).
   */
  maxRegions?: number;
  /** Thick black smaller than this (page units²) where lines meet is left as drawn, not opened (default 40). */
  minCore?: number;
  /**
   * A spot too small to centre a full line on its edge (a nostril) is redrawn as a ring this thick inside its own
   * edge, so it keeps its size. Without it the line goes around the spot and it reads as a fat blob.
   */
  thinSpots?: number;
  /** Outline thickness for opened solid spots (e.g. closed eyes), when they should be thinner than the lines. */
  spotLine?: number;
};

/**
 * Converts clipart so every area a child sees can be coloured.
 * 1. The black lines are thinned to `target` thickness (eroded evenly on both sides with Skia path operations), so
 *    clipart drawn with heavier lines matches the Animals pages.
 * 2. `close` lines are added where the artist left a shape open (a leg's line stopping short of the body).
 * 3. Solid black shapes (spots, ridges) are redrawn as outlines as thick as the lines, centred on their old edge, with
 *    tiny loops drawn inside them filled in. Eyes stay black: they have a white highlight.
 * 4. Every separate white area inside the drawing's outline becomes a region, biggest first, so areas inside others
 *    (big spots) sit on top. Smaller opened spots and ridges are each a `small-N` region (allowed below the area
 *    minimum, see Region.small).
 */
export async function addClipartRegions(a: Art, clip: Clipart, o: RegionOptions = {}) {
  const target = o.target ?? ANIMAL_LINE;
  const minArea = o.minArea ?? MIN_PART_AREA;
  const by = Math.max(0, (lineWidth(clip) - target) / 2);
  const ck = await canvasKit();
  const path = (d: string) => ck.Path.MakeFromSVGString(d)!;
  const round = { join: ck.StrokeJoin.Round, cap: ck.StrokeCap.Round };
  const stroke = (d: string, width: number) => path(d).makeStroked({ width, ...round })!;
  const op = (x: Path, y: Path, kind: 'Union' | 'Difference') => ck.Path.MakeFromOp(x, y, ck.PathOp[kind]) ?? x;
  const areaOf = (x: Path) => flattenPath(svgOf(x) || 'M0 0 Z').reduce((t, sp) => t + area([sp]), 0);
  const inPiece = (piece: Piece, at: Point) => boundsContain(piece.bounds, at) && containsPoint([piece.poly], at, 'nonzero');

  const all = clip.pieces.map((p) => p.d).join(' ');
  let black = path(all);
  black.setFillType(ck.FillType.EvenOdd);
  if (by >= 0.25) black = op(black, stroke(all, 2 * by), 'Difference');
  for (const d of o.close ?? []) black = op(black, stroke(transformPathData(d, clip.toPage), target), 'Union');

  // Eyes stay black: the (at most two) biggest solid shapes with a small white highlight inside. A ring with a big
  // white middle, a smaller highlighted shape, or one listed in `spots` is a spot; a wide one is an open mouth.
  const holesOf = (p: Piece) => clip.pieces.filter((h) => h.depth === p.depth + 1 && inPiece(p, h.poly.points[0]!));
  const highlighted = clip.pieces
    .filter((p) => {
      if (p.depth % 2 || !p.depth) return false;
      const holes = holesOf(p);
      return holes.length > 0 && holes.reduce((t, h) => t + h.area, 0) < 0.25 * p.area;
    })
    .sort((p, q) => q.area - p.area);
  const spotAt = (o.spots ?? []).map(([x, y]) => apply(clip.toPage, { x, y }));
  const roundish = (p: Piece) => {
    const r = (p.bounds.maxX - p.bounds.minX) / (p.bounds.maxY - p.bounds.minY);
    return r > 0.6 && r < 1.6; // not an open mouth
  };
  const candidates = highlighted.filter((p) => roundish(p) && !spotAt.some((q) => inPiece(p, q)));
  const centre = (p: Piece) => ({ x: (p.bounds.minX + p.bounds.maxX) / 2, y: (p.bounds.minY + p.bounds.maxY) / 2 });
  const [first, second] = candidates;
  // The second eye is near the first and not much smaller.
  const pair =
    first && second && second.area >= 0.3 * first.area &&
    Math.hypot(centre(first).x - centre(second).x, centre(first).y - centre(second).y) <= 4 * (first.bounds.maxX - first.bounds.minX);
  const eyeAt = (o.eyeAt ?? []).map(([x, y]) => apply(clip.toPage, { x, y }));
  // The innermost solid shape at each given point (a highlight inside it is a hole, so not counted).
  const marked = eyeAt.map((at) =>
    clip.pieces
      .filter((p) => p.depth >= 2 && p.depth % 2 === 0 && inPiece(p, at))
      .sort((p, q) => q.depth - p.depth)[0],
  );
  if (marked.some((e) => !e)) throw new Error(`eyeAt: no solid shape at ${JSON.stringify(o.eyeAt)}`);
  const eyes = o.eyeAt ? (marked as Piece[]) : o.eyes === false || !first ? [] : pair ? [first, second!] : [first];
  const notEyes = highlighted.filter((p) => !eyes.includes(p));
  // A spot's highlight is filled in, so the spot is opened like any other.
  for (const p of notEyes) for (const h of holesOf(p)) black = op(black, path(h.d), 'Union');
  const erode = (x: Path, r: number) => op(x, x.makeStroked({ width: 2 * r, ...round })!, 'Difference');
  const dilate = (x: Path, r: number) => op(x, x.makeStroked({ width: 2 * r, ...round })!, 'Union');
  // The drawing's outer outline, thinned like the lines (or a sliver would be left between the old and new outer edge).
  let outline = new ck.Path();
  for (const p of clip.pieces.filter((q) => q.depth === 0)) outline = op(outline, path(p.d), 'Union');
  if (by >= 0.25) outline = op(outline, outline.makeStroked({ width: 2 * by, ...round })!, 'Difference');

  // Where an opened shape's inside may be: at least half a line inside the black, so redrawn with a line-thick outline
  // centred on its old edge it keeps its size.
  const roomy = erode(black, target / 2);
  const deep = erode(outline, target);
  const opened: Path[] = [];
  const openedPolys: Subpath[][] = [];
  const zonePolys: Subpath[][] = [];
  // Skia's contains() is unreliable on path-op results, so membership is tested on the flattened outlines.
  const inOpened = (at: Point) => openedPolys.some((sps) => sps.some((sp) => containsPoint([sp], at, 'nonzero')));
  /** Turns `inside` into a white area with an outline as thick as the drawing's lines (never past its own edge). */
  const openUp = (inside: Path, width = target) => {
    const ring = ck.Path.MakeFromOp(dilate(inside, width), outline, ck.PathOp.Intersect) ?? dilate(inside, width);
    black = op(op(black, ring, 'Union'), inside, 'Difference');
    opened.push(inside);
    openedPolys.push(flattenPath(svgOf(inside) || 'M0 0 Z'));
    zonePolys.push(flattenPath(svgOf(dilate(inside, target + 8)) || 'M0 0 Z'));
  };
  // Loose solid spots (not touching any line): outlined, centred on their edge, or around them if too small for that.
  for (const p of clip.pieces.filter((q) => q.depth >= 2 && q.depth % 2 === 0 && !eyes.includes(q) && q.area >= ISLAND_MIN && (notEyes.includes(q) || !holesOf(q).length))) {
    const spot = by >= 0.25 ? erode(path(p.d), by) : path(p.d);
    if (spot.isEmpty()) continue;
    // A thin shape (an eyebrow, a curl) is a line, not a spot: it stays as drawn.
    if (areaOf(erode(spot, 3)) < 0.25 * areaOf(spot)) continue;
    const spotLine = o.spotLine ?? target;
    const centred = erode(spot, spotLine / 2);
    // Centred on the edge only if a good part of the spot is left inside; otherwise the outline goes around it.
    if (!centred.isEmpty() && areaOf(centred) >= Math.max(SMALL_MIN, 0.35 * areaOf(spot))) openUp(centred, spotLine);
    else if (o.thinSpots) {
      const inside = erode(spot, o.thinSpots);
      black = op(black, spot, 'Union');
      if (inside.isEmpty()) continue;
      black = op(black, inside, 'Difference');
      opened.push(inside);
      openedPolys.push(flattenPath(svgOf(inside) || 'M0 0 Z'));
      zonePolys.push(flattenPath(svgOf(dilate(inside, o.thinSpots + 8)) || 'M0 0 Z'));
    } else openUp(spot);
  }
  // Solid shapes joined to lines (ridges): the black's core where it is thicker than a line.
  const core = erode(black, OPEN_AT);
  for (const d of svgOf(core).split(/(?=M)/).filter((x) => x.trim())) {
    const sp = flattenPath(d)[0];
    if (!sp || area([sp]) < (o.minCore ?? 40)) continue; // a speck where lines meet
    if (eyes.some((e) => inPiece(e, sp.points[0]!))) continue;
    // Grown back towards its edge inside `roomy`; the opening (erode, then dilate) trims any thin spur that crept along
    // a line it touches.
    const grown = ck.Path.MakeFromOp(dilate(path(d), OPEN_AT), roomy, ck.PathOp.Intersect);
    // A full line's width from the drawing's outer edge, so a back line over a ridge keeps its thickness.
    const kept = grown && ck.Path.MakeFromOp(grown, deep, ck.PathOp.Intersect);
    const inside = kept && !kept.isEmpty() ? dilate(erode(kept, 2), 2) : path(d);
    if (!inside.isEmpty()) openUp(inside);
  }

  // The white areas: inside the drawing's outer outline, not black. Each outer contour is one area.
  const white = checkedDifference(ck, outline, black);
  const contours = svgOf(white)
    .split(/(?=M)/)
    .filter((x) => x.trim())
    .map((d) => ({ d, poly: flattenPath(d, 2)[0]! }))
    .filter((c) => c.poly && c.poly.points.length > 2);
  const areas = contours
    .filter((c) => contours.filter((q) => q !== c && containsPoint([q.poly], c.poly.points[0]!, 'nonzero')).length % 2 === 0)
    .map((c) => ({ ...c, area: area([c.poly]) }))
    .sort((x, y) => y.area - x.area);

  // Big areas are regions; smaller ones (a spike, a far leg, an opened spot) are small parts; eye highlights and
  // specks under the small-part minimum stay white.
  const tuck = (x: Path) => op(x, x.makeStroked({ width: 2 * TUCK, ...round })!, 'Union');
  const regions: { shape: Path; poly: Subpath; area: number }[] = [];
  let small = new ck.Path();
  const spots: Path[] = [];
  for (const c of areas) {
    const shape = path(c.d);
    const at = interiorPoint(c.poly);
    // A little over the minimum, as the validator measures the tucked outline a touch differently.
    if (c.area >= minArea * 1.1) {
      regions.push({ shape: tuck(shape), poly: c.poly, area: c.area });
      continue;
    }
    if (c.area < LOOP_MAX && !inOpened(at) && zonePolys.some((z) => c.poly.points.every((q) => containsPoint(z, q, 'nonzero')))) {
      black = op(black, shape, 'Union'); // a little loop drawn inside a ridge: filled in, the ridge is coloured instead
      continue;
    }
    if (inOpened(at)) {
      if (c.area >= SMALL_MIN) spots.push(tuck(shape));
      continue;
    }
    // Eye highlights stay white; any other small closed area (a spike, a far leg, a toe) is a small part of its own.
    if (c.area >= SMALL_MIN && !eyes.some((e) => inPiece(e, at))) spots.push(tuck(shape));
    else small = op(small, shape, 'Union');
  }
  regions.forEach((r, i) => a.fillOnly(`part-${i + 1}`, `<path d="${svgOf(r.shape)}"`));
  // Opened spots and ridges smaller than an area are their own small regions, so each can be coloured; the tiniest
  // show the area around them.
  const budget = (o.maxRegions ?? Infinity) - new Set(a.regions.map((r) => r.name)).size - regions.length;
  if (spots.length > budget && budget >= 1) {
    spots.sort((x, y) => areaOf(y) - areaOf(x));
    const rest = spots.splice(budget - 1).reduce((t, s) => op(t, s, 'Union'), new ck.Path());
    spots.push(rest);
  }
  spots.forEach((s, i) => a.fillOnly(`small-${i + 1}`, `<path d="${windConsistently(svgOf(s))}"`));
  if (!small.isEmpty()) a.d('small-hole', `<path d="${svgOf(small)}"`, '#ffffff', ';fill-rule:evenodd;stroke:none');
  a.d('artwork', `<path d="${svgOf(black)}"`, INK, ';fill-rule:evenodd;stroke:none'); // path ops return even-odd paths
}
