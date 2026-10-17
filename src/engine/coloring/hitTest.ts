import type { ColoringPage } from '../../content/schema/page';
import { flattenPath, type Point, type Subpath } from '../geometry/path';
import { boundsContain, boundsOf, containsPoint, distanceToEdges, type Bounds, type FillRule } from '../geometry/polygon';

export type PreparedRegion = {
  id: string;
  locked: boolean;
  fillRule: FillRule;
  subpaths: Subpath[];
  bounds: Bounds;
};

/** Flattens every region once per page. Keep the result memoized per page. */
export function prepareRegions(page: ColoringPage): PreparedRegion[] {
  return page.regions.map((r) => {
    const subpaths = flattenPath(r.d);
    return { id: r.id, locked: r.locked, fillRule: r.fillRule, subpaths, bounds: boundsOf(subpaths) };
  });
}

/**
 * Finds the region a tap at `p` (page units) should fill.
 *
 * 1. Topmost (last-drawn) non-locked region containing the point wins.
 *    Locked regions are transparent to taps, so tapping a pupil fills the head.
 * 2. Otherwise — typically a tap on a thick outline over empty background —
 *    the nearest non-locked region edge within `tolerance` wins.
 */
export function hitTest(regions: readonly PreparedRegion[], p: Point, tolerance: number): string | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i]!;
    if (r.locked || !boundsContain(r.bounds, p)) continue;
    if (containsPoint(r.subpaths, p, r.fillRule)) return r.id;
  }

  let bestId: string | null = null;
  let bestDist = tolerance;
  for (const r of regions) {
    if (r.locked || !boundsContain(r.bounds, p, tolerance)) continue;
    const d = distanceToEdges(r.subpaths, p);
    if (d <= bestDist) {
      bestDist = d;
      bestId = r.id;
    }
  }
  return bestId;
}
