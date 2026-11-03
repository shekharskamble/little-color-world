import type { PatternFill, PatternId } from '../../content/schema/fill';

type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

/**
 * Start and end of a linear gradient across `box` at `angle` degrees (0 = left → right, 90 = top → bottom). The line
 * passes through the box centre and is just long enough that both far corners get the end colours.
 */
export function gradientEnds(box: Box, angle: number): { start: Point; end: Point } {
  const t = (angle * Math.PI) / 180;
  const dx = Math.cos(t);
  const dy = Math.sin(t);
  const half = (Math.abs(dx) * box.width + Math.abs(dy) * box.height) / 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { start: { x: cx - dx * half, y: cy - dy * half }, end: { x: cx + dx * half, y: cy + dy * half } };
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
/** `a` moved `t` of the way towards `b`. */
export const mixHex = (a: string, b: string, t: number): string => {
  const x = channels(a);
  const y = channels(b);
  return toHex(x.map((v, i) => v + (y[i]! - v) * t));
};
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex);
  return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
};
/** True for colours so pale (white, cream, light yellow) that a white edge around them would vanish. */
export const isVeryLight = (hex: string): boolean => luminance(hex.toUpperCase()) > 0.85;

const INK = '#2A2733';

/**
 * A pattern in the chosen colour: the colour on a pale tint of itself, so it reads as that colour from afar. A very
 * light colour (white, light yellow) would vanish on its tint, so it becomes the background under a darker shade.
 */
export function patternFill(patternId: PatternId, color: string): PatternFill {
  const c = color.toUpperCase();
  return luminance(c) > 0.85
    ? { type: 'pattern', patternId, fg: mixHex(c, INK, 0.35), bg: c }
    : { type: 'pattern', patternId, fg: c, bg: mixHex(c, '#FFFFFF', 0.78) };
}
