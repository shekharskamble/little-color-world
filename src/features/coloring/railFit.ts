/**
 * Fits the tool rail to the screen without scrolling (owner report 2026-11-03: on an iPad Pro 11" the rail needed a
 * scroll). Every round button shrinks by one factor, worked out for the fullest rail (the brush: four tools, its two
 * paints and three sizes), so buttons keep one size whichever tool is picked. Pure, so it is tested for each iPad.
 */

/** Diameters at full size (13" iPad). */
export const RAIL_BASE = { tool: 84, small: 56 } as const;
/**
 * Space each button's ring slot adds (gap + ring on both sides), padding at the rail's ends, and one divider with room on
 * each side, so a picked ring never touches it (owner report 2026-11-03). A ring already sits 7 pt from the next button.
 */
export const RAIL_FIXED = {
  ring: 14,
  padding: 12,
  divider: 3,
  dividerMargin: 6,
} as const;
/** The fullest rail: four tools, two dividers and five small buttons (brush: plain + glitter, three sizes). */
export const RAIL_WORST = { tools: 4, small: 5, dividers: 2 } as const;
/** Never shrink below this: a small button's slot is still about 50 pt, a tool's about 64 pt. */
export const RAIL_MIN_SCALE = 0.65;

/** Height the fullest rail needs at `scale`. */
export function railHeight(scale: number): number {
  const { tools, small } = RAIL_WORST;
  return railFixed() + tools * RAIL_BASE.tool * scale + small * RAIL_BASE.small * scale;
}

/** The largest scale (at most 1) at which the fullest rail fits in `available` points. */
export function railScale(available: number): number {
  if (!(available > 0)) return 1;
  const { tools, small } = RAIL_WORST;
  const fixed = railFixed();
  const grows = tools * RAIL_BASE.tool + small * RAIL_BASE.small;
  return Math.max(RAIL_MIN_SCALE, Math.min(1, (available - fixed) / grows));
}

/** The part of the fullest rail's height that does not shrink: ring slots, padding and dividers. */
function railFixed(): number {
  const { tools, small, dividers } = RAIL_WORST;
  return RAIL_FIXED.padding + dividers * (RAIL_FIXED.divider + 2 * RAIL_FIXED.dividerMargin) + (tools + small) * RAIL_FIXED.ring;
}
