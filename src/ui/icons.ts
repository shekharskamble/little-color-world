/**
 * Vector icons on a 48×48 grid, drawn with Skia (src/ui/Icon.tsx). Strokes by
 * default; `fill: true` paints a solid shape. Kept as plain path data so new
 * icons need no asset pipeline or extra dependency.
 *
 * `color` gives a path its own colour (the multi-colour toy icons); 'accent'
 * takes the Icon's `accent` prop, e.g. the colour the child has picked.
 * Paths without one use the Icon's `color`.
 */
export type IconPath = { d: string; fill?: boolean; color?: string };

const circle = (x: number, y: number, r: number) => `M${x - r} ${y} A${r} ${r} 0 1 0 ${x + r} ${y} A${r} ${r} 0 1 0 ${x - r} ${y} Z`;

const PAIL = 'M10 14 L28 5 L38 25 L20 34 Z';
const PAIL_RIM = 'M10 14 L28 5 L30 9 L12 18 Z';
const DROP = 'M33 32 C29 38 31 44 36 44 C41 44 43 38 39 32 L36 27 Z';
const HANDLE = 'M37 4 L44 11 L29 27 L22 20 Z';
const FERRULE = 'M22 20 L29 27 L26.5 29.5 L19.5 22.5 Z';
const TIP = 'M19.5 22.5 C13 23 8 30 8 41 C18 41 25 36 26.5 29.5 Z';
/** A closed shape drawn upright (tip at the bottom), turned 45° about the centre so it leans like the brush. */
const tilt = (pts: readonly (readonly [number, number])[]) =>
  'M' + pts.map(([x, y]) => `${(24 + (x - 24 - (y - 24)) * Math.SQRT1_2).toFixed(1)} ${(24 + (x - 24 + (y - 24)) * Math.SQRT1_2).toFixed(1)}`).join(' L') + ' Z';
const CRAYON_BODY = tilt([[17, 6], [31, 6], [31, 38], [17, 38]]);
const CRAYON_WRAP = tilt([[17, 14], [31, 14], [31, 32], [17, 32]]);
const CRAYON_LABEL = tilt([[20, 20], [28, 20], [28, 26], [20, 26]]);
const CRAYON_TIP = tilt([[18, 38], [30, 38], [24, 47]]);
const ERASER_TOP = 'M15 22 L23 13 L39 27 L31 35 Z';
const ERASER_SLEEVE = 'M7 31 L15 22 L31 35 L27 40 H16 Z';
const PALETTE = 'M24 6 C34 6 42 13 42 22 C42 28 36 28 33 28 C29 28 28 32 30 35 C32 39 29 42 24 42 C14 42 6 34 6 24 C6 14 14 6 24 6 Z';


export const ICONS = {
  back: [{ d: 'M29 11 L16 24 L29 37' }],
  next: [{ d: 'M19 11 L32 24 L19 37' }],
  undo: [{ d: 'M17 10 L8 19 L17 28' }, { d: 'M8 19 H28 A9.5 9.5 0 0 1 28 38 H22' }],
  redo: [{ d: 'M31 10 L40 19 L31 28' }, { d: 'M40 19 H20 A9.5 9.5 0 0 0 20 38 H26' }],
  /** Start over: redo's arrowhead and shaft at the top, with the loop carried three-quarters of the way round. */
  reset: [{ d: 'M34 12 H24 A15 15 0 1 0 39 27' }, { d: 'M26 4 L34 12 L26 20' }],
  close: [{ d: 'M14 14 L34 34 M34 14 L14 34' }],
  check: [{ d: 'M10 25 L20 35 L38 14' }],
  lock: [{ d: 'M12 22 H36 V39 H12 Z' }, { d: 'M17 22 V17 A7 7 0 0 1 31 17 V22' }],
  gift: [{ d: 'M9 21 H39 V40 H9 Z' }, { d: 'M6 14 H42 V21 H6 Z' }, { d: 'M24 14 V40' }, { d: 'M24 14 C19 6 13 8 15 12 C16 14 24 14 24 14 M24 14 C29 6 35 8 33 12 C32 14 24 14 24 14' }],
  eraser: [{ d: 'M7 31 L23 13 L39 27 L27 40 H16 Z' }, { d: 'M15 22 L31 35' }],
  palette: [
    { d: 'M24 6 C34 6 42 13 42 22 C42 28 36 28 33 28 C29 28 28 32 30 35 C32 39 29 42 24 42 C14 42 6 34 6 24 C6 14 14 6 24 6 Z' },
  ],
  trace: [{ d: 'M8 41 L21 8 L34 41 M13 29 H29' }, { d: 'M36 12 L43 5 M33 18 L40 11' }],
  draw: [{ d: 'M5 32 C11 15 18 15 20 27 C22 39 30 38 32 26 C34 17 39 15 43 20' }],
  gallery: [{ d: 'M6 9 H42 V39 H6 Z' }, { d: 'M10 35 L19 24 L26 31 L31 26 L38 35 Z', fill: true }, { d: 'M29 17 A4 4 0 1 0 37 17 A4 4 0 1 0 29 17 Z', fill: true }],
  star: [{ d: 'M24 5 L29.5 17 L42.5 18.5 L32.5 27 L35.5 40 L24 33 L12.5 40 L15.5 27 L5.5 18.5 L18.5 17 Z', fill: true }],
  search: [{ d: 'M8 20 A12 12 0 1 0 32 20 A12 12 0 1 0 8 20 Z' }, { d: 'M29 29 L41 41' }],
  /** Paint bucket: a tipped pail pouring a drop. */
  bucket: [{ d: 'M8 20 L22 7 L38 23 L24 36 Z' }, { d: 'M8 20 C4 24 6 30 11 31' }, { d: 'M33 30 C29 36 31 42 36 42 C41 42 42 36 38 30 L36 27 Z', fill: true }],
  /** Paintbrush: a slanted handle with a round, painted tip. */
  brush: [{ d: 'M41 7 L24 26' }, { d: 'M22 24 C15 24 10 30 10 41 C20 41 27 36 27 29 Z', fill: true }],
  /** Toy camera: a rounded body, a big friendly lens and a flash dot. */
  camera: [
    { d: 'M5 17 C5 14.5 7 13 9.5 13 H15 L18.5 7.5 H29.5 L33 13 H38.5 C41 13 43 14.5 43 17 V36 C43 38.5 41 40.5 38.5 40.5 H9.5 C7 40.5 5 38.5 5 36 Z' },
    { d: 'M15 26.5 A9 9 0 1 0 33 26.5 A9 9 0 1 0 15 26.5 Z' },
    { d: 'M35 18.5 A2.2 2.2 0 1 0 39.4 18.5 A2.2 2.2 0 1 0 35 18.5 Z', fill: true },
  ],
  // Multi-colour sticker icons for the coloring tools: flat fills first, then the ink outline on top. 'accent' parts
  // show the paint the child has picked.
  /** Lavender pail tipping over, pouring a drop of the chosen colour. */
  bucketColor: [
    { d: PAIL, fill: true, color: '#8C8CF2' },
    { d: PAIL_RIM, fill: true, color: '#B3B3FF' },
    { d: DROP, fill: true, color: 'accent' },
    { d: PAIL },
    { d: PAIL_RIM },
    { d: 'M20 34 C13 36 8 31 10 25' },
    { d: DROP },
  ],
  /** Paintbrush: wooden handle, silver band and a tip dipped in the chosen colour. */
  brushColor: [
    { d: HANDLE, fill: true, color: '#F2A65A' },
    { d: FERRULE, fill: true, color: '#C3CBD6' },
    { d: TIP, fill: true, color: 'accent' },
    { d: HANDLE },
    { d: FERRULE },
    { d: TIP },
  ],
  /** Wax crayon in the chosen colour with a white paper wrapper. */
  crayonColor: [
    { d: CRAYON_BODY, fill: true, color: 'accent' },
    { d: CRAYON_TIP, fill: true, color: 'accent' },
    { d: CRAYON_WRAP, fill: true, color: '#FFFFFF' },
    { d: CRAYON_LABEL, fill: true, color: 'accent' },
    { d: CRAYON_BODY },
    { d: CRAYON_WRAP },
    { d: CRAYON_TIP },
  ],
  /** Pink and blue school eraser. */
  eraserColor: [
    { d: ERASER_TOP, fill: true, color: '#FF8FB8' },
    { d: ERASER_SLEEVE, fill: true, color: '#4CC9F0' },
    { d: 'M7 31 L23 13 L39 27 L27 40 H16 Z' },
    { d: 'M15 22 L31 35' },
  ],
  /** Wooden palette with four blobs of paint. */
  paletteColor: [
    { d: PALETTE, fill: true, color: '#F2C29B' },
    { d: circle(16, 17, 4), fill: true, color: '#E8453C' },
    { d: circle(26, 13, 4), fill: true, color: '#FFC93C' },
    { d: circle(34, 19, 3.6), fill: true, color: '#3A7BEB' },
    { d: circle(14, 28, 3.6), fill: true, color: '#3DBE6B' },
    { d: PALETTE },
  ],
} as const satisfies Record<string, readonly IconPath[]>;

export type IconName = keyof typeof ICONS;
