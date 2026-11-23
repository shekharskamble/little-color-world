// Generates Trace and Color: each item's tracing strokes (content/trace.json) and its coloring page, where the strokes
// are thickened and merged into one chunky letter (theme "tracing", hidden from the catalog). Each big hole in the
// letter (the two in B, the inside of O or a shape) is a part of its own; slivers where strokes meet are filled in.
//   npx tsx tools/tracing/generate.ts            writes art/svg/tracing/<id>.svg and content/trace.json
//   npx tsx tools/tracing/generate.ts --import   also imports each page (npm run lcw -- page import)
//   --only upper-a,shape-                         limits the pages written or imported (content/trace.json is always whole)
// Letters and numbers use school "ball and stick" print with the usual stroke order and direction. Each glyph is
// drawn at any x and centred on the page afterwards; heights follow the handwriting lines below.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm';

import type { TraceItem, TraceSet } from '../../src/content/schema/trace';
import { flattenSegments, parsePath, type Segment } from '../../src/engine/geometry/path';
import { area, boundsOf, containsPoint } from '../../src/engine/geometry/polygon';
import { H, ROOT, W, writePages, type GeneratedPage } from '../art/layered';

/** Handwriting lines, in page units: top line, middle line (x-height), baseline, and how far tails drop. */
const T = 130;
const MID = 300;
const B = 570;
const DESC = 700;
/**
 * Thickness of the colourable letter; the tracing tolerance (56) is about half of it. Lowercase is thinner, so its
 * bowls keep a hole you can see and colour (e, s, a).
 */
const THICKNESS: Record<TraceSet, number> = { uppercase: 104, lowercase: 88, numbers: 104, shapes: 104 };
/** Lowercase bowls fill the space between the middle line and the baseline: radius and centre line. */
const R = (B - MID) / 2;
const BOWL = MID + R;

type Glyph = { slug: string; set: TraceSet; title: string; strokes: string[] };

/** Worksheet lines behind each set: top line and baseline, plus the dashed middle line for lowercase. */
const GUIDES: Record<TraceSet, TraceItem['guides']> = {
  uppercase: [{ y: T, dashed: false }, { y: B, dashed: false }],
  lowercase: [{ y: T, dashed: false }, { y: MID, dashed: true }, { y: B, dashed: false }],
  numbers: [{ y: T, dashed: false }, { y: B, dashed: false }],
  shapes: [],
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const xy = (x: number, y: number) => `${r1(x)} ${r1(y)}`;
/** Point on an ellipse at `deg` degrees (0 = right, 90 = down: screen coordinates). */
const at = (cx: number, cy: number, rx: number, ry: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return xy(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
};
const line = (...pts: [number, number][]) => `M${pts.map(([x, y]) => xy(x, y)).join(' L')}`;
/** A whole ellipse traced from angle `startDeg`, counter-clockwise on screen (the usual way to write O). */
const loop = (cx: number, cy: number, rx: number, ry: number, startDeg: number, clockwise = false) => {
  const s = clockwise ? 1 : 0;
  return `M${at(cx, cy, rx, ry, startDeg)} A${rx} ${ry} 0 1 ${s} ${at(cx, cy, rx, ry, startDeg + 180)} A${rx} ${ry} 0 1 ${s} ${at(cx, cy, rx, ry, startDeg)}`;
};
/** Part of an ellipse from `fromDeg` to `toDeg` (screen degrees), the short or long way as needed. */
const arc = (cx: number, cy: number, rx: number, ry: number, fromDeg: number, toDeg: number, moveTo = true) => {
  const sweep = toDeg - fromDeg;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return `${moveTo ? `M${at(cx, cy, rx, ry, fromDeg)} ` : ''}A${rx} ${ry} 0 ${large} ${sweep > 0 ? 1 : 0} ${at(cx, cy, rx, ry, toDeg)}`;
};
const poly = (pts: [number, number][]) => `${line(...pts)} Z`;
const regular = (sides: number, cx: number, cy: number, r: number, startDeg: number): [number, number][] =>
  Array.from({ length: sides }, (_, i) => {
    const a = ((startDeg + (360 / sides) * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

/** Capitals and numbers use the full height; their middle line is halfway down. */
const CAP_MID = 350;
// Capitals are drawn around x = 512; widths vary, centring fixes the position.
const x = 400;
const UPPER: Record<string, string[]> = {
  A: [line([512, T], [352, B]), line([512, T], [672, B]), line([417, 420], [607, 420])],
  B: [line([x, T], [x, B]), `M${xy(x, T)} H${x + 125} ${arc(x + 125, 240, 110, 110, -90, 90, false)} H${x}`, `M${xy(x, CAP_MID)} H${x + 135} ${arc(x + 135, 460, 110, 110, -90, 90, false)} H${x}`],
  C: [arc(512, 350, 210, 220, -40, -320)],
  D: [line([x, T], [x, B]), `M${xy(x, T)} H${x + 60} ${arc(x + 60, 350, 220, 220, -90, 90, false)} H${x}`],
  E: [line([x, T], [x, B]), line([x, T], [x + 240, T]), line([x, CAP_MID], [x + 200, CAP_MID]), line([x, B], [x + 240, B])],
  F: [line([x, T], [x, B]), line([x, T], [x + 240, T]), line([x, CAP_MID], [x + 200, CAP_MID])],
  G: [arc(512, 350, 210, 220, -40, -360), line([512 + 90, 350], [512 + 210, 350])],
  H: [line([x, T], [x, B]), line([x + 280, T], [x + 280, B]), line([x, CAP_MID], [x + 280, CAP_MID])],
  I: [line([512, T], [512, B]), line([402, T], [622, T]), line([402, B], [622, B])],
  J: [`M${xy(600, T)} V${470} ${arc(500, 470, 100, 100, 0, 180, false)}`],
  K: [line([x, T], [x, B]), line([x + 250, T], [x, CAP_MID + 20]), line([x + 60, CAP_MID - 20], [x + 260, B])],
  L: [line([x, T], [x, B]), line([x, B], [x + 230, B])],
  M: [line([352, T], [352, B]), line([352, T], [512, 450]), line([512, 450], [672, T]), line([672, T], [672, B])],
  N: [line([x, T], [x, B]), line([x, T], [x + 270, B]), line([x + 270, B], [x + 270, T])],
  O: [loop(512, 350, 190, 220, -90)],
  P: [line([x, T], [x, B]), `M${xy(x, T)} H${x + 115} ${arc(x + 115, 240, 110, 110, -90, 90, false)} H${x}`],
  Q: [loop(512, 350, 190, 220, -90), line([575, 455], [700, 590])],
  R: [line([x, T], [x, B]), `M${xy(x, T)} H${x + 115} ${arc(x + 115, 240, 110, 110, -90, 90, false)} H${x}`, line([x + 90, CAP_MID], [x + 250, B])],
  S: [`${arc(512, 240, 130, 110, -30, -270)} ${arc(512, 460, 130, 110, -90, 150, false)}`],
  T: [line([512, T], [512, B]), line([382, T], [642, T])],
  U: [`M${xy(372, T)} V${430} ${arc(512, 430, 140, 140, 180, 0, false)} V${T}`],
  V: [line([352, T], [512, B]), line([512, B], [672, T])],
  W: [line([322, T], [417, B]), line([417, B], [512, 250]), line([512, 250], [607, B]), line([607, B], [702, T])],
  X: [line([362, T], [662, B]), line([662, T], [362, B])],
  Y: [line([362, T], [512, CAP_MID]), line([662, T], [512, CAP_MID]), line([512, CAP_MID], [512, B])],
  Z: [line([372, T], [652, T]), line([652, T], [372, B]), line([372, B], [652, B])],
};

// Lowercase: bowls are circles of radius R between the middle line and the baseline.
const c = 512;
const LOWER: Record<string, string[]> = {
  a: [loop(c, BOWL, R, R, -45), line([c + R, MID], [c + R, B])],
  b: [line([c - R, T], [c - R, B]), loop(c, BOWL, R, R, 180, true)],
  c: [arc(c, BOWL, R, R, -45, -315)],
  d: [loop(c, BOWL, R, R, -45), line([c + R, T], [c + R, B])],
  e: [`M${xy(c - R, BOWL)} H${c + R} ${arc(c, BOWL, R, R, 0, -315, false)}`],
  f: [`${arc(c + 80, 210, 80, 80, -30, -180)} V${B}`, line([c - 75, MID], [c + 95, MID])],
  // The tail is a long, flat curve that ends below the bowl: a tight curl would run back into it.
  g: [loop(c, BOWL, R, R, -45), `M${xy(c + R, MID)} V640 ${arc(c + R - 125, 640, 125, 72, 0, 145, false)}`],
  h: [line([c - R, T], [c - R, B]), `${arc(c, BOWL, R, R, 180, 360)} V${B}`],
  i: [line([c, MID], [c, B]), line([c, 120], [c, 182])],
  j: [`M${xy(c, MID)} V600 ${arc(c - 85, 600, 85, 85, 0, 180, false)}`, line([c, 120], [c, 182])],
  k: [line([c - 90, T], [c - 90, B]), line([c + 100, MID], [c - 90, 445]), line([c - 50, 415], [c + 110, B])],
  l: [line([c, T], [c, B])],
  m: [line([c - 160, MID], [c - 160, B]), `${arc(c - 80, MID + 80, 80, 80, 180, 360)} V${B}`, `${arc(c + 80, MID + 80, 80, 80, 180, 360)} V${B}`],
  n: [line([c - R, MID], [c - R, B]), `${arc(c, BOWL, R, R, 180, 360)} V${B}`],
  o: [loop(c, BOWL, R, R, -90)],
  p: [line([c - R, MID], [c - R, DESC]), loop(c, BOWL, R, R, 180, true)],
  q: [loop(c, BOWL, R, R, -45), line([c + R, MID], [c + R, DESC])],
  r: [line([c - R, MID], [c - R, B]), arc(c, BOWL, R, R, 180, 315)],
  s: [`${arc(c, MID + 67.5, 110, 67.5, -30, -270)} ${arc(c, MID + 202.5, 115, 67.5, -90, 150, false)}`],
  t: [line([c, 170], [c, B]), line([c - 90, MID], [c + 90, MID])],
  u: [`M${xy(c - R, MID)} V${BOWL} ${arc(c, BOWL, R, R, 180, 0, false)} V${MID}`, line([c + R, MID], [c + R, B])],
  v: [line([c - R, MID], [c, B]), line([c, B], [c + R, MID])],
  w: [line([c - 190, MID], [c - 95, B]), line([c - 95, B], [c, 380]), line([c, 380], [c + 95, B]), line([c + 95, B], [c + 190, MID])],
  x: [line([c - R, MID], [c + R, B]), line([c + R, MID], [c - R, B])],
  // The short arm ends where it meets the long one, on the baseline.
  y: [line([c - R, MID], [c + R - (R + 60) * ((B - MID) / (DESC - MID)), B]), line([c + R, MID], [c - 60, DESC])],
  z: [line([c - R, MID], [c + R, MID]), line([c + R, MID], [c - R, B]), line([c - R, B], [c + R, B])],
};

const NUMBERS: Record<string, string[]> = {
  '0': [loop(512, 350, 150, 220, -90)],
  '1': [line([512, T], [512, B])],
  '2': [`${arc(512, 240, 125, 110, 200, 390)} L${xy(387, B)} H${642}`],
  '3': [`${arc(512, 240, 110, 110, 210, 450)} ${arc(512, 460, 115, 110, 270, 510, false)}`],
  '4': [line([432, T], [432, 430], [652, 430]), line([592, T], [592, B])],
  '5': [`M${xy(412, T)} L${xy(402, 340)} ${arc(502, 450, 130, 115, 210, 495, false)}`, line([412, T], [632, T])],
  // The loop is two half-turns: one arc that ends where it starts would be dropped.
  '6': [`M${xy(600, 165)} Q${xy(392, 200)} ${xy(392, 460)} ${arc(512, 460, 120, 110, 180, 360, false)} ${arc(512, 460, 120, 110, 360, 540, false)}`],
  '7': [`M${xy(382, T)} H${642} L${xy(472, B)}`],
  '8': [loop(512, 240, 100, 110, -90), loop(512, 460, 115, 110, -90, true)],
  '9': [loop(512, 245, 115, 115, 0), line([627, 245], [627, B])],
};

const SHAPES: Array<{ slug: string; title: string; d: string }> = [
  { slug: 'circle', title: 'Circle', d: loop(512, 350, 220, 220, -90) },
  { slug: 'square', title: 'Square', d: poly([[302, 140], [722, 140], [722, 560], [302, 560]]) },
  { slug: 'triangle', title: 'Triangle', d: poly([[512, 130], [752, 560], [272, 560]]) },
  { slug: 'rectangle', title: 'Rectangle', d: poly([[242, 190], [782, 190], [782, 510], [242, 510]]) },
  { slug: 'oval', title: 'Oval', d: loop(512, 350, 300, 190, -90) },
  { slug: 'diamond', title: 'Diamond', d: poly([[512, 120], [712, 350], [512, 580], [312, 350]]) },
  { slug: 'heart', title: 'Heart', d: 'M512 250 C512 150 332 130 322 270 C312 400 462 470 512 560 C562 470 712 400 702 270 C692 130 512 150 512 250 Z' },
  { slug: 'star', title: 'Star', d: poly(regular(10, 512, 370, 240, -90).map(([px, py], i) => (i % 2 ? [512 + (px - 512) * 0.45, 370 + (py - 370) * 0.45] : [px, py]))) },
  { slug: 'pentagon', title: 'Pentagon', d: poly(regular(5, 512, 370, 240, -90)) },
  { slug: 'hexagon', title: 'Hexagon', d: poly(regular(6, 512, 350, 230, 0)) },
];

const GLYPHS: Glyph[] = [
  ...Object.entries(UPPER).map(([ch, strokes]) => ({ slug: `upper-${ch.toLowerCase()}`, set: 'uppercase' as const, title: ch, strokes })),
  ...Object.entries(LOWER).map(([ch, strokes]) => ({ slug: `lower-${ch}`, set: 'lowercase' as const, title: ch, strokes })),
  // Object key order puts integer-like keys first, in numeric order: 0–9.
  ...Object.entries(NUMBERS).map(([ch, strokes]) => ({ slug: `number-${ch}`, set: 'numbers' as const, title: ch, strokes })),
  ...SHAPES.map((s) => ({ slug: `shape-${s.slug}`, set: 'shapes' as const, title: s.title, strokes: [s.d] })),
];

/** Path data from absolute segments, moved `dx` across. */
function serialize(segs: Segment[], dx: number): string {
  const p = (q: { x: number; y: number }) => xy(q.x + dx, q.y);
  return segs
    .map((s) => {
      switch (s.type) {
        case 'M':
          return `M${p(s.p)}`;
        case 'L':
          return `L${p(s.p)}`;
        case 'C':
          return `C${p(s.c1)} ${p(s.c2)} ${p(s.p)}`;
        case 'Q':
          return `Q${p(s.c)} ${p(s.p)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join(' ');
}

/** The glyph's strokes, centred across the page (heights stay on the handwriting lines). */
function centred(strokes: string[]): string[] {
  const segs = strokes.map((d) => parsePath(d));
  const b = boundsOf(segs.flatMap((s) => flattenSegments(s)));
  const dx = W / 2 - (b.minX + b.maxX) / 2;
  return segs.map((s) => serialize(s, dx));
}

/** Holes at least this big (page units², the minimum part size for ages 2–3) become parts of their own. */
const MIN_HOLE = 0.004 * W * H;
/** Holes smaller than this are slivers where strokes meet, filled in. Sizes between stay open (A's little triangle). */
const MIN_GAP = 400;

/**
 * The strokes, thickened and merged into one outline, plus each hole big enough to colour. Skia's merged outline does
 * not wind holes the opposite way, so holes are found by nesting (inside an odd number of other outlines) and the
 * letter is filled even-odd.
 */
function letterShape(ck: CanvasKit, strokes: string[], width: number): { letter: string; holes: string[] } {
  let all = new ck.Path();
  for (const d of strokes) {
    const stroked = ck.Path.MakeFromSVGString(d)!.makeStroked({ width, join: ck.StrokeJoin.Round, cap: ck.StrokeCap.Round })!;
    // makeStroked overlaps itself at bends (and a closed loop's two edges); a union with itself cleans it first.
    const clean = ck.Path.MakeFromOp(stroked, stroked, ck.PathOp.Union)!;
    all = ck.Path.MakeFromOp(all, clean, ck.PathOp.Union)!;
  }
  const contours = all
    .toSVGString()
    .split(/(?=M)/)
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const sp = flattenSegments(parsePath(d))[0]!;
      return { d, sp, area: area([sp]) };
    });
  const isHole = (c: (typeof contours)[number]) =>
    contours.filter((o) => o !== c && containsPoint([o.sp], c.sp.points[0]!, 'nonzero')).length % 2 === 1;
  const kept = contours.filter((c) => !isHole(c) || c.area >= MIN_GAP);
  return { letter: kept.map((c) => c.d).join(' '), holes: kept.filter((c) => isHole(c) && c.area >= MIN_HOLE).map((c) => c.d) };
}

async function main() {
  const ck = await CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
  const items: TraceItem[] = [];
  const pages: GeneratedPage[] = [];
  const order: Partial<Record<TraceSet, number>> = {};
  for (const g of GLYPHS) {
    const id = `trace-${g.slug}`;
    const strokes = centred(g.strokes);
    order[g.set] = (order[g.set] ?? 0) + 1;
    items.push({ schemaVersion: 1, id, version: 1, set: g.set, order: order[g.set]!, title: g.title, viewBox: [0, 0, W, H], strokes: strokes.map((d) => ({ d })), guides: GUIDES[g.set], colorPageId: id });
    const { letter, holes } = letterShape(ck, strokes, THICKNESS[g.set]);
    pages.push({
      id,
      title: g.title,
      age: '2-3',
      regions: [{ name: 'letter', el: `<path fill-rule="evenodd" d="${letter}"` }, ...holes.map((d, i) => ({ name: `inside-${i + 1}`, el: `<path d="${d}"` }))],
      details: [],
      lines: [],
    });
  }
  writeFileSync(join(ROOT, 'content/trace.json'), `${JSON.stringify(items, null, 2)}\n`);
  console.log(`wrote content/trace.json (${items.length} items)`);
  writePages(pages, join(ROOT, 'art/svg/tracing'), 'tracing', { theme: 'Tracing', generator: 'tools/tracing/generate.ts' });
}

if (require.main === module) void main();
