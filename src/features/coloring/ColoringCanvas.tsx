import { Canvas } from '@shopify/react-native-skia';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, useTapGesture } from 'react-native-gesture-handler';

import type { ColoringPage } from '@/content/schema/page';
import type { FillMap, PenId, Stroke } from '@/engine/coloring/history';
import { hitTest, prepareRegions } from '@/engine/coloring/hitTest';
import { fitCover, screenToPage } from '@/engine/geometry/viewTransform';
import { PageArtwork } from '@/render/PageArtwork';
import { useSkiaPage } from '@/render/useSkiaPage';

/** Extra forgiveness, in screen points, beyond half the outline width. */
const TAP_SLOP_PT = 10;
/** A brush point is recorded once the finger has moved this far (page units): smooth lines, small saves. */
const MIN_STEP = 3;

/**
 * The brush in use: colour, thickness in page units and pen. An `erase` brush rubs out paint as it drags, and a plain
 * tap with it clears the tapped part instead (onRegionTap), as the eraser always has.
 */
export type Brush = { color: string; width: number; erase?: boolean; pen?: PenId };

type Props = {
  page: ColoringPage;
  fills: FillMap;
  strokes: readonly Stroke[];
  enabled: boolean;
  /** When set, dragging paints with it; otherwise a tap fills (or erases) a region. */
  brush: Brush | null;
  /** `at` is the tap in the canvas's own points, for effects drawn over it. */
  onRegionTap: (regionId: string, at: { x: number; y: number }) => void;
  /**
   * `at` is where the finger lifted, in the canvas's own points. For an eraser stroke, `rubbed` lists every part the
   * finger passed over, whose bucket fills are cleared with it.
   */
  onStroke: (stroke: Stroke, at: { x: number; y: number }, rubbed: readonly string[]) => void;
};

const round = (v: number) => Math.round(v * 10) / 10;
/** A finger that stays within this many screen points of where it landed is a tap, not a rub. */
const TAP_RADIUS_PT = 12;
const isTap = (points: readonly number[], scale: number) => {
  for (let i = 2; i < points.length; i += 2) {
    if (Math.hypot(points[i]! - points[0]!, points[i + 1]! - points[1]!) * scale > TAP_RADIUS_PT) return false;
  }
  return true;
};

export function ColoringCanvas({ page, fills, strokes, enabled, brush, onRegionTap, onStroke }: Props) {
  const skia = useSkiaPage(page);
  const regions = useMemo(() => prepareRegions(page), [page]);
  const maxStroke = useMemo(() => Math.max(0, ...page.outline.map((o) => o.strokeWidth)), [page]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [, , pw, ph] = page.viewBox;
  // The card is as tall as the palette, so its shape rarely matches the page. The page covers it edge to edge (no
  // white bands around a coloured background); only a sliver of the page's empty margin is cropped. Taps use the same
  // transform, so they always land on what the child sees.
  const transform = useMemo(() => fitCover(pw, ph, box.w, box.h), [pw, ph, box]);
  /** The stroke being drawn right now, shown live and saved when the finger lifts. */
  const [live, setLive] = useState<Stroke | null>(null);
  const drawing = useRef<Stroke | null>(null);
  /** Parts the eraser has passed over in the current rub; their fills disappear live while rubbing. */
  const rubbing = useRef<Set<string>>(new Set());
  const [rubbed, setRubbed] = useState<ReadonlySet<string>>(new Set());
  /** Last finger position in canvas points, for the effect shown when a stroke ends. */
  const fingerAt = useRef({ x: 0, y: 0 });

  // Gesture callbacks read the latest values through a ref.
  const latest = useRef({ transform, enabled, brush, onRegionTap, onStroke });
  useLayoutEffect(() => {
    latest.current = { transform, enabled, brush, onRegionTap, onStroke };
  });

  const regionAt = (x: number, y: number) => {
    const t = latest.current.transform;
    const tolerance = maxStroke / 2 + TAP_SLOP_PT / t.scale;
    return hitTest(regions, screenToPage(t, { x, y }), tolerance);
  };

  const tap = useTapGesture({
    maxDistance: 24,
    runOnJS: true,
    onActivate: (e) => {
      const { enabled: on, onRegionTap: cb } = latest.current;
      if (!on || e.numberOfPointers !== 1) return; // ignore palms / multi-finger touches
      const id = regionAt(e.x, e.y);
      if (id) cb(id, { x: e.x, y: e.y });
    },
  });

  const pan = usePanGesture({
    minDistance: 0,
    maxPointers: 1, // a second finger (or a palm) cancels the stroke
    runOnJS: true,
    onBegin: (e) => {
      const { enabled: on, brush: b, transform: t } = latest.current;
      if (!on || !b || e.numberOfPointers !== 1) return;
      // The stroke belongs to the region it starts in and stays inside it.
      const regionId = regionAt(e.x, e.y);
      if (!regionId) return;
      const p = screenToPage(t, { x: e.x, y: e.y });
      fingerAt.current = { x: e.x, y: e.y };
      // A marker stroke has no `pen`, so it saves exactly as strokes did before pens existed.
      const pen = b.pen && b.pen !== 'marker' ? { pen: b.pen } : null;
      drawing.current = { regionId, color: b.color, width: b.width, points: [round(p.x), round(p.y)], ...(b.erase && { erase: true as const }), ...pen };
      setLive(drawing.current);
      rubbing.current = new Set();
    },
    onUpdate: (e) => {
      const d = drawing.current;
      if (!d) return;
      fingerAt.current = { x: e.x, y: e.y };
      const p = screenToPage(latest.current.transform, { x: e.x, y: e.y });
      const n = d.points.length;
      if (Math.hypot(p.x - d.points[n - 2]!, p.y - d.points[n - 1]!) < MIN_STEP) return;
      drawing.current = { ...d, points: [...d.points, round(p.x), round(p.y)] };
      setLive(drawing.current);
      if (d.erase) {
        // Once the finger leaves the tap radius it is a rub, starting with the part it began in. Bucket colour
        // fills a whole part, so rubbing anywhere on a part clears all of it.
        const before = rubbing.current.size;
        if (rubbing.current.size === 0 && !isTap(drawing.current.points, latest.current.transform.scale)) rubbing.current.add(d.regionId);
        const id = rubbing.current.size > 0 ? regionAt(e.x, e.y) : null;
        if (id) rubbing.current.add(id);
        if (rubbing.current.size !== before) setRubbed(new Set(rubbing.current));
      }
    },
    onFinalize: (e) => {
      const d = drawing.current;
      const parts = [...rubbing.current];
      drawing.current = null;
      rubbing.current = new Set();
      setLive(null);
      setRubbed(new Set());
      if (!d || e.canceled) return;
      // An eraser that barely moved is a tap: clear the whole part.
      if (d.erase && isTap(d.points, latest.current.transform.scale)) latest.current.onRegionTap(d.regionId, fingerAt.current);
      else latest.current.onStroke(d, fingerAt.current, parts);
    },
  });

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const shown = useMemo(() => (live ? [...strokes, live] : strokes), [strokes, live]);
  const shownFills = useMemo(() => {
    if (rubbed.size === 0) return fills;
    const out: Record<string, FillMap[string]> = {};
    for (const [id, f] of Object.entries(fills)) if (!rubbed.has(id)) out[id] = f;
    return out;
  }, [fills, rubbed]);

  const canvas = (
    <View style={styles.fill} onLayout={onLayout} accessibilityLabel={`${page.title} coloring page`}>
      {box.w > 0 && (
        <Canvas style={{ width: box.w, height: box.h }}>
          <PageArtwork page={page} skia={skia} fills={shownFills} strokes={shown} transform={transform} />
        </Canvas>
      )}
    </View>
  );
  // Brush and eraser work with a drag (an eraser tap clears a part); the bucket fills with a tap.
  return brush ? <GestureDetector gesture={pan}>{canvas}</GestureDetector> : <GestureDetector gesture={tap}>{canvas}</GestureDetector>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
