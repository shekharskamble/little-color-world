import type { SolidFill } from '@/content/schema/fill';

export type Swatch = { name: string; fill: SolidFill };

const solid = (name: string, color: string): Swatch => ({ name, fill: { type: 'solid', color } });

/** Ages 2–3 palette: saturated, distinct, includes skin tones and neutrals (docs/UX.md). */
export const TODDLER_PALETTE: readonly Swatch[] = [
  solid('red', '#FF4D4D'),
  solid('orange', '#FF9F1C'),
  solid('yellow', '#FFD93D'),
  solid('lime', '#8BD346'),
  solid('green', '#2BB673'),
  solid('teal', '#2EC4B6'),
  solid('sky blue', '#4CC9F0'),
  solid('blue', '#3A86FF'),
  solid('purple', '#8E5CF7'),
  solid('pink', '#FF70A6'),
  solid('peach', '#F6C7A1'),
  solid('brown', '#A0673E'),
  solid('gray', '#9AA5B1'),
  solid('black', '#2B2B2B'),
];
