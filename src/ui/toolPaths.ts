/**
 * Coloring tools drawn as toys lying on their side, the working end pointing left at the colour strip (docs/UX.md).
 * Each is plain path data on a 120 × 48 grid, drawn with Skia by src/ui/ToolArt.tsx, so no image assets are needed.
 *
 * `color: 'paint'` parts show the paint: the chosen colour when the tool is picked, the tool's own colour otherwise. For
 * the buckets they are drawn with the real fill (gloss, glitter, the current pattern or rainbow), so the picture shows
 * exactly what the tool pours.
 * Paths without `color` are the ink outline, drawn last.
 */
export type ToolArtPath = { d: string; color?: string; fill?: boolean; width?: number };

export const TOOL_ART_W = 120;
export const TOOL_ART_H = 48;

const circle = (x: number, y: number, r: number) => `M${x - r} ${y} A${r} ${r} 0 1 0 ${x + r} ${y} A${r} ${r} 0 1 0 ${x - r} ${y} Z`;
/** A rounded rectangle. */
const box = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
/** A four-point sparkle. */
const sparkle = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

const fill = (d: string, color: string): ToolArtPath => ({ d, color, fill: true });
const ink = (d: string): ToolArtPath => ({ d });

const GREY = '#C3CBD6';
const DARK_GREY = '#6B7584';
const WHITE = '#FFFFFF';
const GOLD = '#FFC93C';
const WOOD = '#E0A060';

const MARKER_BODY = box(30, 11, 66, 26, 3);
const MARKER_CAP = box(92, 11, 24, 26, 7);
const MARKER_COLLAR = 'M18 15 H30 V33 H18 Z';
const MARKER_NIB = 'M18 18 L7 22 Q4 24 7 26 L18 30 Z';

const CRAYON_BODY = box(26, 11, 88, 26, 5);
const CRAYON_WRAP = 'M44 11 H98 V37 H44 Z';
const CRAYON_TIP = 'M26 13 L8 22 Q5 24 8 26 L26 35 Z';

const ROLL = box(4, 7, 62, 34, 9);
const ROLLER_HANDLE = [fill(box(80, 18, 36, 12, 6), WOOD), ink('M66 24 H80'), ink(box(80, 18, 36, 12, 6))];

export const TOOL_ART = {
  /** Paint pail on its side, pouring a puddle of paint. */
  bucket: [
    fill('M44 9 L100 14 Q106 15 106 21 V27 Q106 33 100 34 L44 39 Z', '#4CC9F0'),
    fill('M46 12 C30 10 18 16 12 24 C6 33 12 40 20 38 C26 36 26 31 32 32 C38 33 40 38 46 36 Z', 'paint'),
    ink('M44 9 L100 14 Q106 15 106 21 V27 Q106 33 100 34 L44 39 Z'),
    ink('M44 9 C40 18 40 30 44 39'),
    ink('M58 10 C66 -2 90 0 96 13'),
    ink('M46 12 C30 10 18 16 12 24 C6 33 12 40 20 38 C26 36 26 31 32 32 C38 33 40 38 46 36'),
  ],
  /** Shiny squeeze tube of paint with a big white shine. */
  glossy: [
    fill('M34 12 H96 L112 7 V41 L96 36 H34 Z', 'paint'),
    fill(box(10, 15, 16, 18, 4), DARK_GREY),
    fill('M26 18 H34 V30 H26 Z', GREY),
    fill(sparkle(100, 24, 6), WHITE),
    ink('M34 12 H96 L112 7 V41 L96 36 H34 Z'),
    ink(box(10, 15, 16, 18, 4)),
    ink('M26 18 H34 V30 H26 Z'),
  ],
  /** Glitter shaker: a jar of sparkly paint with a holey lid, sprinkling sparkles. */
  glitter: [
    fill(box(44, 8, 70, 32, 8), 'paint'),
    fill(box(28, 11, 18, 26, 5), GREY),
    fill(sparkle(74, 24, 6), GOLD),
    fill(sparkle(16, 14, 6), GOLD),
    fill(sparkle(10, 32, 4.5), GOLD),
    fill(circle(22, 24, 1.8), GOLD),
    ink(box(44, 8, 70, 32, 8)),
    ink(box(28, 11, 18, 26, 5)),
    fill(circle(34, 18, 1.6), DARK_GREY),
    fill(circle(34, 30, 1.6), DARK_GREY),
    fill(circle(38, 24, 1.6), DARK_GREY),
    { d: sparkle(16, 14, 6), width: 1.5 },
  ],
  /** Paint roller with a dotty roll. */
  pattern: [
    fill(ROLL, 'paint'),
    ink(ROLL),
    ...ROLLER_HANDLE,
  ],
  /** Paint roller with a rainbow roll. */
  rainbow: [fill(ROLL, 'paint'), ink(ROLL), ...ROLLER_HANDLE],
  /** Felt-tip marker: white body, paint-coloured nib and cap. */
  marker: [
    fill(MARKER_BODY, WHITE),
    fill(box(46, 11, 30, 26, 0), 'paint'),
    fill(MARKER_CAP, 'paint'),
    fill(MARKER_COLLAR, GREY),
    fill(MARKER_NIB, 'paint'),
    ink(MARKER_BODY),
    ink('M46 11 V37 M76 11 V37'),
    ink(MARKER_CAP),
    ink(MARKER_COLLAR),
    ink(MARKER_NIB),
  ],
  /** Wax crayon in a zig-zag paper wrapper. */
  crayon: [
    fill(CRAYON_BODY, 'paint'),
    fill(CRAYON_TIP, 'paint'),
    fill(CRAYON_WRAP, WHITE),
    { d: 'M44 17 L50 14 L56 17 L62 14 L68 17 L74 14 L80 17 L86 14 L92 17 L98 14 M44 34 L50 31 L56 34 L62 31 L68 34 L74 31 L80 34 L86 31 L92 34 L98 31', color: 'paint', width: 3 },
    ink(CRAYON_BODY),
    ink(CRAYON_WRAP),
    ink(CRAYON_TIP),
  ],
  /** Glitter pen: a paint-coloured marker speckled with sparkles. */
  glitterPen: [
    fill(MARKER_BODY, 'paint'),
    fill(MARKER_CAP, 'paint'),
    fill(MARKER_COLLAR, GREY),
    fill(MARKER_NIB, 'paint'),
    ...[[40, 17], [52, 29], [64, 18], [76, 30], [86, 19], [102, 28], [46, 24], [70, 24]].map(([x, y]) => fill(circle(x!, y!, 1.8), WHITE)),
    fill(sparkle(58, 24, 5), GOLD),
    fill(sparkle(84, 24, 5), GOLD),
    ink(MARKER_BODY),
    ink(MARKER_CAP),
    ink(MARKER_COLLAR),
    ink(MARKER_NIB),
    fill(sparkle(10, 9, 6), GOLD),
    { d: sparkle(10, 9, 6), width: 1.5 },
  ],
  /** Spray can on its side, puffing a mist of paint. */
  spray: [
    fill(box(40, 9, 74, 30, 7), 'paint'),
    fill('M60 9 H94 V39 H60 Z', WHITE),
    fill(box(26, 13, 15, 22, 4), GREY),
    fill('M17 19 H26 V29 H17 Z', DARK_GREY),
    ink(box(40, 9, 74, 30, 7)),
    ink('M60 9 V39 M94 9 V39'),
    ink(box(26, 13, 15, 22, 4)),
    ink('M17 19 H26 V29 H17 Z'),
    ...[[10, 18, 2.4], [5, 25, 2.8], [11, 31, 2.2], [3, 14, 1.6], [4, 35, 1.6], [12, 24, 1.4]].map(([x, y, r]) => fill(circle(x!, y!, r!), 'paint')),
  ],
  /** Pink and blue eraser. */
  eraser: [
    fill(box(18, 11, 92, 26, 7), '#4CC9F0'),
    fill('M25 11 H60 V37 H25 Q18 37 18 30 V18 Q18 11 25 11 Z', '#FF8FB8'),
    ink(box(18, 11, 92, 26, 7)),
    ink('M60 11 V37'),
  ],
} as const satisfies Record<string, readonly ToolArtPath[]>;

export type ToolArtName = keyof typeof TOOL_ART;

/** Each tool's own paint colour, shown while another tool is picked, so the column is a box of bright toys. */
export const TOOL_OWN_COLOR: Record<ToolArtName, string> = {
  bucket: '#E8453C',
  glossy: '#3A7BEB',
  glitter: '#8A5CE6',
  pattern: '#FF6FB1',
  rainbow: '#FFC93C',
  marker: '#E8453C',
  crayon: '#6CCB3F',
  glitterPen: '#D6338A',
  spray: '#FF8A1F',
  eraser: '#FF8FB8',
};
