// A tracing stroke as a measured polyline: positions along it are arc lengths in page units.

import { dist, type Point, type Subpath } from '../geometry/path';

export type Track = Readonly<{
  points: readonly Point[];
  /** cumulative[i] is the arc length from the start to points[i]. */
  cumulative: readonly number[];
  length: number;
}>;

export function makeTrack(points: readonly Point[]): Track {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1]! + dist(points[i - 1]!, points[i]!));
  return { points, cumulative, length: cumulative[cumulative.length - 1] ?? 0 };
}

/** A flattened subpath as a track; a closed one gets its closing segment back. */
export function trackFromSubpath({ points, closed }: Subpath): Track {
  return makeTrack(closed && points.length > 1 ? [...points, points[0]!] : points);
}

/** The point `at` units along the track, clamped to its ends. */
export function pointAt(track: Track, at: number): Point {
  const { points, cumulative } = track;
  if (points.length === 0) return { x: 0, y: 0 };
  if (at <= 0) return points[0]!;
  for (let i = 1; i < points.length; i++) {
    if (cumulative[i]! >= at) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const span = cumulative[i]! - cumulative[i - 1]!;
      const t = span === 0 ? 0 : (at - cumulative[i - 1]!) / span;
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    }
  }
  return points[points.length - 1]!;
}

/** The unit direction of travel `at` units along the track (for the start arrow). */
export function directionAt(track: Track, at: number): Point {
  const a = pointAt(track, Math.max(0, Math.min(at, track.length - 1)));
  const b = pointAt(track, Math.min(track.length, Math.max(at, 0) + 1));
  const len = dist(a, b);
  return len === 0 ? { x: 1, y: 0 } : { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

export type Projection = { at: number; offset: number };

/**
 * The point of the track nearest to `p`, looking only at the part between `from` and `to` (arc lengths). Limiting the
 * search is what stops a finger near the far end of a stroke (or where a stroke crosses itself, like a circle's start
 * and end) from counting as progress.
 */
export function projectWithin(track: Track, p: Point, from: number, to: number): Projection | null {
  const { points, cumulative } = track;
  let best: Projection | null = null;
  for (let i = 1; i < points.length; i++) {
    const s0 = cumulative[i - 1]!;
    const s1 = cumulative[i]!;
    if (s1 < from || s0 > to) continue;
    const a = points[i - 1]!;
    const b = points[i]!;
    const span = s1 - s0;
    let t = 0;
    if (span > 0) {
      t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (span * span);
      t = Math.max((from - s0) / span, Math.min((to - s0) / span, t));
      t = Math.max(0, Math.min(1, t));
    }
    const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    const offset = dist(p, q);
    if (!best || offset < best.offset) best = { at: s0 + t * span, offset };
  }
  return best;
}
