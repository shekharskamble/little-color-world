import type { FillStyle } from '@/content/schema/fill';

/**
 * Where each celebration star flies, as plain data (src/features/coloring/Celebration.tsx animates it). Positions are
 * in the overlay's points; `delay` is the fraction of the animation before the star appears. `fill` is what the star
 * is painted with: the colour, pattern, rainbow, gloss or glitter the child just used.
 */
export type StarFlight = { x0: number; y0: number; x1: number; y1: number; size: number; fill: FillStyle; spin: number; delay: number };

/** Bright stand-ins when no fill is given. */
export const STAR_COLORS = ['#FFC93C', '#FF6FB1', '#4CC9F0', '#3DBE6B', '#8A5CE6', '#FF8A1F'] as const;
const starFill = (fill: FillStyle | undefined, i: number): FillStyle => fill ?? { type: 'solid', color: STAR_COLORS[i % STAR_COLORS.length]! };

type Rand = () => number;
const between = (rand: Rand, a: number, b: number) => a + (b - a) * rand();

/** A few big stars, painted with `fill`, popping out of a just-filled spot (or where a stroke ended) and drifting up. */
export function popStars(x: number, y: number, still: boolean, fill?: FillStyle, rand: Rand = Math.random): StarFlight[] {
  const n = 5;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + between(rand, -0.2, 0.2);
    const d = still ? 0 : between(rand, 70, 110);
    return {
      x0: x,
      y0: y,
      x1: x + Math.cos(a) * d,
      y1: y + Math.sin(a) * d - (still ? 0 : 24),
      size: between(rand, 44, 60),
      fill: starFill(fill, i),
      spin: still ? 0 : between(rand, -1.2, 1.2),
      delay: between(rand, 0, 0.12),
    };
  });
}

/** The whole-picture shower: big stars, painted with `fill`, floating up from below the screen and swaying a little. */
export function showerStars(width: number, height: number, still: boolean, fill?: FillStyle, rand: Rand = Math.random): StarFlight[] {
  const n = 36;
  return Array.from({ length: n }, (_, i) => {
    const x = between(rand, 0.04, 0.96) * width;
    const y1 = between(rand, 0.05, 0.6) * height;
    return {
      x0: x,
      y0: still ? y1 : height + 40,
      x1: still ? x : x + between(rand, -70, 70),
      y1,
      size: between(rand, 28, 60),
      fill: starFill(fill, i),
      spin: still ? 0 : between(rand, -1.5, 1.5),
      delay: between(rand, 0, 0.4),
    };
  });
}
