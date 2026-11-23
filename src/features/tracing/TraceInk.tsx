import { DashPathEffect, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';

import type { TraceItem } from '@/content/schema/trace';
import { flattenPath } from '@/engine/geometry/path';
import type { TraceState } from '@/engine/tracing/trace';
import { trackFromSubpath, type Track } from '@/engine/tracing/track';
import { STAR_COLORS } from '@/features/coloring/celebrationStars';

/** Look of the guide, in page units. */
const DOT_SIZE = 16;
const DOT_GAP = 34;
const INK_WIDTH = 44;
const DOT_COLOR = '#8A7F94';

/** Each item's measured strokes and Skia paths, built once and shared by the picker and the tracing screen. */
const cache = new Map<string, { tracks: Track[]; paths: SkPath[] }>();
export function traceGeometry(item: TraceItem): { tracks: Track[]; paths: SkPath[] } {
  const key = `${item.id}@${item.version}`;
  let g = cache.get(key);
  if (!g) {
    g = {
      tracks: item.strokes.map((s) => trackFromSubpath(flattenPath(s.d)[0]!)),
      paths: item.strokes.map((s) => Skia.Path.MakeFromSVGString(s.d)!),
    };
    cache.set(key, g);
  }
  return g;
}

/** The crayon colour an item is traced in (the same on the tracing screen and its thumbnail). */
export function inkColor(item: TraceItem): string {
  return STAR_COLORS[item.order % STAR_COLORS.length]!;
}

/**
 * Crayon ink along what is traced, in page units (draw inside the page transform). With `dots`, the untraced part of
 * each stroke shows as a dotted line, as on the tracing screen; thumbnails leave the dots out.
 */
export function TraceInk({ item, state, dots = false }: { item: TraceItem; state: TraceState; dots?: boolean }) {
  const { tracks, paths } = traceGeometry(item);
  const ink = inkColor(item);
  return (
    <Group>
      {paths.map((path, i) => {
        const track = tracks[i]!;
        const done = i < state.stroke ? 1 : i === state.stroke && track.length > 0 ? state.progress / track.length : 0;
        return (
          <Group key={i}>
            {dots && done < 1 && (
              <Path path={path} start={done} end={1} style="stroke" strokeWidth={DOT_SIZE} strokeCap="round" color={DOT_COLOR}>
                <DashPathEffect intervals={[0.01, DOT_GAP]} />
              </Path>
            )}
            {done > 0 && <Path path={path} start={0} end={done} style="stroke" strokeWidth={INK_WIDTH} strokeCap="round" strokeJoin="round" color={ink} />}
          </Group>
        );
      })}
    </Group>
  );
}
