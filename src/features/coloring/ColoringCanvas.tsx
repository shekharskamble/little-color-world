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

/** The brush in use: colour, thickness in page units and pen. */
export type Brush = { color: string; width: number; pen?: PenId };

type Props = {
  page: ColoringPage;
  fills: FillMap;
  strokes: readonly Stroke[];
  enabled: boolean;
  /** When set, dragging paints with it; otherwise a tap fills a region. */
  brush: Brush | null;
  /**
   * The eraser: any touch, a tap or a rub, clears the part it lands on (onRegionTap). One rule for toddlers: a 5-year-old
   * could not tell when a tap cleared a part and a drag rubbed out paint (owner test, 2026-11-03).
   */
  eraser: boolean;
  /** `at` is the tap in the canvas's own points, for effects drawn over it. */
  onRegionTap: (regionId: string, at: { x: number; y: number }) => void;
  /** `at` is where the finger lifted, in the canvas's own points. */
  onStroke: (stroke: Stroke, at: { x: number; y: number }) => void;
};

const round = (v: number) => Math.round(v * 10) / 10;

export function ColoringCanvas({ page, fills, strokes, enabled, brush, eraser, onRegionTap, onStroke }: Props) {
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
  /** The part an eraser touch landed on, cleared when the finger lifts. */
  const erasing = useRef<string | null>(null);
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
      drawing.current = { regionId, color: b.color, width: b.width, points: [round(p.x), round(p.y)], ...pen };
      setLive(drawing.current);
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
    },
    onFinalize: (e) => {
      const d = drawing.current;
      drawing.current = null;
      setLive(null);
      if (!d || e.canceled) return;
      latest.current.onStroke(d, fingerAt.current);
    },
  });

  // The eraser clears the part the finger lands on, whether it taps or rubs, and only that part (owner report
  // 2026-11-03: a rub must never spill into the next part). It acts when the finger lifts, like a bucket tap. It reads
  // raw touches, so a still tap and a rub are handled the same way.
  const wipe = usePanGesture({
    minDistance: 0,
    runOnJS: true,
    onTouchesDown: (e) => {
      const t = e.allTouches[0];
      // A second finger (or a palm) cancels the touch, as it does for the brush.
      erasing.current = latest.current.enabled && e.numberOfTouches === 1 && t ? regionAt(t.x, t.y) : null;
      if (t) fingerAt.current = { x: t.x, y: t.y };
    },
    onTouchesUp: () => {
      const id = erasing.current;
      erasing.current = null;
      if (id) latest.current.onRegionTap(id, fingerAt.current);
    },
    onTouchesCancel: () => {
      erasing.current = null;
    },
  });

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const shown = useMemo(() => (live ? [...strokes, live] : strokes), [strokes, live]);

  const canvas = (
    <View style={styles.fill} onLayout={onLayout} accessibilityLabel={`${page.title} coloring page`}>
      {box.w > 0 && (
        <Canvas style={{ width: box.w, height: box.h }}>
          <PageArtwork page={page} skia={skia} fills={fills} strokes={shown} transform={transform} />
        </Canvas>
      )}
    </View>
  );
  // The brush and pencil paint with a drag, the eraser clears with any touch, and the bucket fills with a tap.
  if (eraser) return <GestureDetector gesture={wipe}>{canvas}</GestureDetector>;
  return brush ? <GestureDetector gesture={pan}>{canvas}</GestureDetector> : <GestureDetector gesture={tap}>{canvas}</GestureDetector>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
