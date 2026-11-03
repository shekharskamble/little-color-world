// 2D affine matrices for flattening SVG `transform` attributes.
// [a, b, c, d, e, f] maps (x, y) to (a·x + c·y + e, b·x + d·y + f), as in SVG.

import type { Point } from '../../src/engine/geometry/path';

export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `m1 · m2`: applies `m2` first, then `m1`. */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2, a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1];
}

export function apply(m: Matrix, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** Uniform scale estimate, used to scale stroke widths. */
export function scaleFactor(m: Matrix): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

const FUNCTION_RE = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;

/** Parses an SVG transform list such as `translate(10 20) rotate(45)`. */
export function parseTransform(value: string | null | undefined): Matrix {
  if (!value) return IDENTITY;
  let m: Matrix = IDENTITY;
  for (const [, name, rawArgs] of value.matchAll(FUNCTION_RE)) {
    const args = rawArgs!
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (args.some((n) => !Number.isFinite(n))) throw new Error(`Bad transform: ${value}`);
    m = multiply(m, toMatrix(name!, args));
  }
  return m;
}

function toMatrix(name: string, args: number[]): Matrix {
  const [p0 = 0, p1, p2] = args;
  switch (name) {
    case 'matrix':
      if (args.length !== 6) throw new Error('matrix() needs 6 numbers');
      return args as unknown as Matrix; // length checked above
    case 'translate':
      return [1, 0, 0, 1, p0, p1 ?? 0];
    case 'scale':
      return [p0, 0, 0, p1 ?? p0, 0, 0];
    case 'rotate': {
      const r = (p0 * Math.PI) / 180;
      const rot: Matrix = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      if (p1 === undefined) return rot;
      const cy = p2 ?? 0;
      return multiply(multiply([1, 0, 0, 1, p1, cy], rot), [1, 0, 0, 1, -p1, -cy]);
    }
    case 'skewX':
      return [1, 0, Math.tan((p0 * Math.PI) / 180), 1, 0, 0];
    default: // skewY
      return [1, Math.tan((p0 * Math.PI) / 180), 0, 1, 0, 0];
  }
}
