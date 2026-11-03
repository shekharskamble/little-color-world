// Outlines render above every fill, so a stroke on a shape that sits behind
// another (an ear behind the head, the ground behind a body) would show
// through. This trims each stroke to the parts no later shape covers.

import { flattenPath, type Point, type Subpath } from '../../src/engine/geometry/path';
import { boundsContain, boundsOf, containsPoint, type Bounds, type FillRule } from '../../src/engine/geometry/polygon';

export type Cover = { subpaths: Subpath[]; bounds: Bounds; fillRule: FillRule };

export function toCover(d: string, fillRule: FillRule): Cover {
  const subpaths = flattenPath(d);
  return { subpaths, bounds: boundsOf(subpaths), fillRule };
}

const STEP = 2; // flattening step in page units; fine enough to look smooth under a 10-unit round stroke
const REFINE = 8; // bisection steps to place each cut on the covering edge

/**
 * The visible part of a stroke as path data: `d` unchanged when nothing covers
 * it, `null` when it is fully hidden, otherwise polylines of the visible runs.
 */
export function visibleStroke(d: string, covers: Cover[]): string | null {
  if (covers.length === 0) return d;
  const hidden = (p: Point) => covers.some((c) => boundsContain(c.bounds, p) && containsPoint(c.subpaths, p, c.fillRule));

  const runs: Point[][] = [];
  let anyHidden = false;
  for (const sp of flattenPath(d, STEP)) {
    const pts = densify(sp.closed ? [...sp.points, sp.points[0]!] : sp.points);
    const flags = pts.map(hidden);
    if (flags.some(Boolean)) anyHidden = true;

    const local: Point[][] = [];
    let run: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (!flags[i]) {
        if (run.length === 0 && i > 0) run.push(edge(pts[i]!, pts[i - 1]!, hidden));
        run.push(pts[i]!);
      } else if (run.length > 0) {
        run.push(edge(pts[i - 1]!, pts[i]!, hidden));
        local.push(run);
        run = [];
      }
    }
    if (run.length > 0) local.push(run);
    // A closed loop whose start and end are both visible is one run, not two.
    if (sp.closed && local.length > 1 && !flags[0] && !flags[pts.length - 1]) {
      const last = local.pop()!;
      local[0] = [...last, ...local[0]!.slice(1)];
    }
    runs.push(...local);
  }

  if (!anyHidden) return d;
  const visible = runs.filter((r) => r.length >= 2);
  if (visible.length === 0) return null;
  return visible.map((r) => r.map((p, i) => `${i === 0 ? 'M' : 'L'}${num(p.x)} ${num(p.y)}`).join(' ')).join(' ');
}

/** Flattening only subdivides curves; straight segments need points along them too. */
function densify(points: Point[]): Point[] {
  const out: Point[] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (prev) {
      const n = Math.floor(Math.hypot(p.x - prev.x, p.y - prev.y) / STEP);
      for (let k = 1; k < n; k++) out.push({ x: prev.x + ((p.x - prev.x) * k) / n, y: prev.y + ((p.y - prev.y) * k) / n });
    }
    out.push(p);
  });
  return out;
}

/** Bisects between a visible and a hidden point to find where the cover begins. */
function edge(visible: Point, covered: Point, hidden: (p: Point) => boolean): Point {
  let a = visible;
  let b = covered;
  for (let i = 0; i < REFINE; i++) {
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (hidden(m)) b = m;
    else a = m;
  }
  return a;
}

function num(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
}
