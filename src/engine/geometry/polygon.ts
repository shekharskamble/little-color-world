import type { Point, Subpath } from './path';

export type FillRule = 'nonzero' | 'evenodd';
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function boundsOf(subpaths: Subpath[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sp of subpaths) {
    for (const p of sp.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

export function boundsContain(b: Bounds, p: Point, pad = 0): boolean {
  return p.x >= b.minX - pad && p.x <= b.maxX + pad && p.y >= b.minY - pad && p.y <= b.maxY + pad;
}

/**
 * Point-in-shape test over all subpaths, each treated as implicitly closed
 * (as SVG/Skia do when filling). Uses the winding number; even-odd is its parity.
 */
export function containsPoint(subpaths: Subpath[], p: Point, rule: FillRule): boolean {
  let winding = 0;
  for (const { points } of subpaths) {
    const n = points.length;
    if (n < 3) continue;
    for (let i = 0; i < n; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % n]!;
      if (a.y <= p.y) {
        if (b.y > p.y && cross(a, b, p) > 0) winding++;
      } else if (b.y <= p.y && cross(a, b, p) < 0) {
        winding--;
      }
    }
  }
  return rule === 'nonzero' ? winding !== 0 : (winding & 1) !== 0;
}

function cross(a: Point, b: Point, p: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
}

/** Shortest distance from `p` to the (implicitly closed) outline of the subpaths. */
export function distanceToEdges(subpaths: Subpath[], p: Point): number {
  let best = Infinity;
  for (const { points } of subpaths) {
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const d = distanceToSegment(p, points[i]!, points[(i + 1) % n]!);
      if (d < best) best = d;
    }
  }
  return best;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Absolute area, with oppositely-wound subpaths (holes) subtracting. Approximate for evenodd. */
export function area(subpaths: Subpath[]): number {
  let sum = 0;
  for (const { points } of subpaths) {
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % n]!;
      sum += a.x * b.y - b.x * a.y;
    }
  }
  return Math.abs(sum) / 2;
}
