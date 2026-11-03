import { PATTERN_IDS, type FillStyle, type GradientStop, type LinearFill, type PatternId, type SolidFill } from '@/content/schema/fill';
import type { PenId } from '@/engine/coloring/history';
import { patternFill } from '@/engine/fills/fills';

export type Swatch = { name: string; fill: SolidFill };

const solid = (name: string, color: string): Swatch => ({ name, fill: { type: 'solid', color } });

/**
 * Solid colours (docs/UX.md), in rainbow order so the colour strip reads as one long rainbow: reds, oranges, yellows,
 * greens, teals, blues, purples, pinks, then browns and skin tones, then greys, white and black. Names are stable: they
 * are the selection key and the accessibility label.
 */
export const TODDLER_PALETTE: readonly Swatch[] = [
  solid('red', '#E8453C'),
  solid('dark red', '#9E2A2B'),
  solid('cherry', '#C81D3A'),
  solid('coral', '#FF7A6B'),
  solid('salmon', '#FF9E8A'),

  solid('burnt orange', '#D9541E'),
  solid('orange', '#FF8A1F'),
  solid('tangerine', '#FFA23F'),
  solid('apricot', '#FFB46B'),
  solid('peach', '#F2C29B'),
  solid('light peach', '#FDE2CC'),

  solid('gold', '#D9A400'),
  solid('mustard', '#E8B923'),
  solid('yellow', '#FFC93C'),
  solid('sunshine', '#FFE14D'),
  solid('light yellow', '#FFF08A'),
  solid('cream', '#FFF6D8'),

  solid('lime', '#B5E550'),
  solid('light green', '#D2F2A6'),
  solid('grass', '#6CCB3F'),
  solid('green', '#3DBE6B'),
  solid('olive', '#8DA33B'),
  solid('emerald', '#10A37F'),
  solid('dark green', '#1F7A3E'),
  solid('forest', '#14532D'),
  solid('mint', '#9BE3C5'),

  solid('seafoam', '#5ED6C0'),
  solid('teal', '#19B3B1'),
  solid('dark teal', '#0E7C7B'),
  solid('turquoise', '#2EC4D6'),
  solid('aqua', '#8FEAF2'),

  solid('sky blue', '#4CC9F0'),
  solid('light blue', '#A8DCF5'),
  solid('baby blue', '#D3ECFF'),
  solid('cornflower', '#6E9BF5'),
  solid('blue', '#3A7BEB'),
  solid('royal blue', '#2B4BC9'),
  solid('navy', '#23408E'),
  solid('midnight', '#1A2659'),

  solid('indigo', '#4B3BA8'),
  solid('deep purple', '#5A2DA8'),
  solid('purple', '#8A5CE6'),
  solid('violet', '#A64CD9'),
  solid('plum', '#6E2C7A'),
  solid('lavender', '#C8A2FF'),
  solid('lilac', '#E6D2FF'),

  solid('fuchsia', '#E040FB'),
  solid('magenta', '#D6338A'),
  solid('hot pink', '#FF3D8B'),
  solid('pink', '#FF6FB1'),
  solid('bubblegum', '#FF94D1'),
  solid('rose', '#F28CA8'),
  solid('light pink', '#FFB3D1'),
  solid('blush', '#FFD9E4'),

  solid('sand', '#EAD7B0'),
  solid('honey', '#E0AC69'),
  solid('tan', '#D9A066'),
  solid('almond', '#C68642'),
  solid('caramel', '#B87333'),
  solid('cocoa', '#A0673F'),
  solid('brown', '#8B5A2B'),
  solid('chocolate', '#5C3A1E'),
  solid('espresso', '#3D2314'),

  solid('white', '#FFFFFF'),
  solid('silver', '#CDD2D9'),
  solid('gray', '#9AA0A6'),
  solid('slate', '#5F6B7A'),
  solid('charcoal', '#3E434A'),
  solid('black', '#2A2733'),
];

const evenStops = (colors: readonly string[]): GradientStop[] =>
  colors.map((color, i) => ({ offset: i / (colors.length - 1), color }));
const linear = (colors: readonly string[], angle = 90): LinearFill => ({ type: 'linear', stops: evenStops(colors), angle });

/** The rainbow bucket's blends: a real rainbow first, then soft blends. Angle 90 runs top → bottom, 0 left → right. */
export const RAINBOWS: readonly { name: string; fill: LinearFill }[] = [
  { name: 'rainbow', fill: linear(['#E8453C', '#FF8A1F', '#FFC93C', '#3DBE6B', '#3A7BEB', '#8A5CE6']) },
  { name: 'sunset', fill: linear(['#FFC93C', '#FF8A1F', '#FF6FB1']) },
  { name: 'ocean', fill: linear(['#9BE3C5', '#4CC9F0', '#23408E']) },
  { name: 'candy', fill: linear(['#FFB3D1', '#C8A2FF', '#A8DCF5']) },
  { name: 'forest', fill: linear(['#B5E550', '#3DBE6B', '#1F7A3E']) },
  { name: 'magic', fill: linear(['#8A5CE6', '#FF6FB1', '#FFC93C']) },
  { name: 'lemonade', fill: linear(['#FFF08A', '#FFC93C', '#FF8A1F']) },
  { name: 'berry', fill: linear(['#FF6FB1', '#9E2A2B'], 0) },
  { name: 'sky', fill: linear(['#3A7BEB', '#A8DCF5']) },
  { name: 'fire', fill: linear(['#FFC93C', '#E8453C']) },
  { name: 'mint', fill: linear(['#E6FFF4', '#19B3B1'], 0) },
  { name: 'grape', fill: linear(['#C8A2FF', '#5A2DA8']) },
];

/** Patterns, in the order the Patterns tab shows them. */
export const PATTERNS: readonly PatternId[] = PATTERN_IDS;

/**
 * What kind of paint the strip offers, chosen with the round buttons under the tools. Plain and glitter show the
 * colours with that finish; patterns shows every pattern in the current colour; rainbows shows the blends. New kinds of
 * paint become new choices or new swatches, never new tools. Shiny (`glossy`) was removed by the owner (2026-11-03);
 * glossy fills already saved still draw.
 */
export const FINISHES = ['plain', 'glitter', 'pattern', 'rainbow'] as const;
export type Finish = (typeof FINISHES)[number];

/** The tools in the rail, top to bottom. */
export const TOOLS = ['bucket', 'brush', 'pencil', 'eraser'] as const;
export type ToolId = (typeof TOOLS)[number];

/** Which paints each tool offers: a bucket pours any paint; a brush paints plain or glitter; a pencil is always plain. */
export const TOOL_FINISHES: Record<ToolId, readonly Finish[]> = {
  bucket: FINISHES,
  brush: ['plain', 'glitter'],
  pencil: ['plain'],
  eraser: [],
};

export type BrushSize = 'small' | 'medium' | 'large';
/** Brush thickness in page units (pages are 1024 wide): thick, so the brush is clearly the big painting tool. */
export const BRUSH_WIDTH: Record<BrushSize, number> = { small: 18, medium: 32, large: 54 };
/** The pencil is always a fine line for details, so it has no size choice. */
export const PENCIL_WIDTH = 7;

/**
 * What a tap or drag on the page does. `tool` is the picked tool; `paint` the last paint tool, which picking a colour
 * after the eraser returns to. `finish` is the strip's tab, `color` the current plain colour, `pattern` and `rainbow`
 * the picks in those tabs.
 */
export type Tool = {
  tool: ToolId;
  paint: Exclude<ToolId, 'eraser'>;
  finish: Finish;
  color: Swatch;
  pattern: PatternId;
  rainbow: string;
  size: BrushSize;
};

export const INITIAL_TOOL: Tool = {
  tool: 'bucket',
  paint: 'bucket',
  finish: 'plain',
  color: TODDLER_PALETTE[0]!,
  pattern: PATTERNS[0]!,
  rainbow: RAINBOWS[0]!.name,
  size: 'medium',
};

/** The paint in effect for `tool`: its own choice if the tool offers it, plain otherwise (a pencil ignores glitter). */
export const finishFor = (tool: Pick<Tool, 'finish'>, id: ToolId): Finish => (TOOL_FINISHES[id].includes(tool.finish) ? tool.finish : 'plain');

/** What the bucket pours with `finish` and the tool's colour, pattern and rainbow. */
export function bucketFill(finish: Finish, tool: Pick<Tool, 'color' | 'pattern' | 'rainbow'>): FillStyle {
  const color = tool.color.fill.color;
  switch (finish) {
    case 'plain':
      return tool.color.fill;
    case 'glitter':
      return { type: 'texture', textureId: finish, color };
    case 'pattern':
      return patternFill(tool.pattern, color);
    case 'rainbow':
      return (RAINBOWS.find((r) => r.name === tool.rainbow) ?? RAINBOWS[0]!).fill;
  }
}

/** The pen a brush or pencil stroke is drawn with: the pencil, or the brush as a marker or glitter pen. */
export function strokePen(tool: Tool, id: 'brush' | 'pencil'): PenId {
  if (id === 'pencil') return 'pencil';
  return finishFor(tool, 'brush') === 'glitter' ? 'glitter' : 'marker';
}
