import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { Stroke } from '@/engine/coloring/history';

const cache = new WeakMap<Stroke, SkPath>();

/**
 * A smooth path through a stroke's points: curves through the midpoints, so a finger's jitter reads as a soft line.
 * Strokes never change once made, so each path is built once.
 */
export function strokePath(stroke: Stroke): SkPath {
  const hit = cache.get(stroke);
  if (hit) return hit;
  const p = stroke.points;
  const b = Skia.PathBuilder.Make().moveTo(p[0]!, p[1]!);
  if (p.length <= 2) {
    b.lineTo(p[0]!, p[1]!); // a single touch is a dot (round caps)
  } else {
    for (let i = 2; i < p.length - 2; i += 2) b.quadTo(p[i]!, p[i + 1]!, (p[i]! + p[i + 2]!) / 2, (p[i + 1]! + p[i + 3]!) / 2);
    b.lineTo(p[p.length - 2]!, p[p.length - 1]!);
  }
  const path = b.build();
  cache.set(stroke, path);
  return path;
}
