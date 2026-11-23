import { Canvas, Circle, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useDerivedValue, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { ColoringPage } from '@/content/schema/page';
import type { TraceItem } from '@/content/schema/trace';
import type { Point } from '@/engine/geometry/path';
import { fitContain, screenToPage } from '@/engine/geometry/viewTransform';
import type { TraceState } from '@/engine/tracing/trace';
import { directionAt, pointAt, type Track } from '@/engine/tracing/track';
import { PageArtwork } from '@/render/PageArtwork';
import { useSkiaPage } from '@/render/useSkiaPage';

import { TraceInk } from './TraceInk';

/** Look of the lead dot and the worksheet lines, in page units. */
const START_DOT = 34;
const GUIDE_COLOR = '#D9CFE6';
const GUIDE_WIDTH = 4;
const START_COLOR = '#3DBE6B';

type Props = {
  item: TraceItem;
  page: ColoringPage;
  tracks: readonly Track[];
  state: TraceState;
  /** A finger moved from `from` (null on touch-down) to `to`, in page units; `at` is the finger in canvas points. */
  onMove: (from: Point | null, to: Point, at: Point) => void;
};

/**
 * The letter as a pale chunky shape, a dotted line along each stroke still to trace, crayon ink along what is traced,
 * and a pulsing dot with an arrow leading the way along the stroke being traced.
 */
export function TraceCanvas({ item, page, tracks, state, onMove }: Props) {
  const skia = useSkiaPage(page);
  const guides = useMemo(
    () => item.guides.map((g) => ({ dashed: g.dashed, path: Skia.Path.MakeFromSVGString(`M40 ${g.y} H${page.viewBox[2] - 40}`)! })),
    [item, page],
  );
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [, , pw, ph] = page.viewBox;
  const transform = useMemo(() => fitContain(pw, ph, box.w, box.h), [pw, ph, box]);

  const latest = useRef({ transform, onMove });
  useLayoutEffect(() => {
    latest.current = { transform, onMove };
  });
  const last = useRef<Point | null>(null);
  const pan = usePanGesture({
    minDistance: 0,
    maxPointers: 1,
    runOnJS: true,
    onBegin: (e) => {
      if (e.numberOfPointers !== 1) return;
      last.current = screenToPage(latest.current.transform, { x: e.x, y: e.y });
      latest.current.onMove(null, last.current, { x: e.x, y: e.y });
    },
    onUpdate: (e) => {
      if (!last.current) return;
      const p = screenToPage(latest.current.transform, { x: e.x, y: e.y });
      latest.current.onMove(last.current, p, { x: e.x, y: e.y });
      last.current = p;
    },
    onFinalize: () => {
      last.current = null;
    },
  });

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const current = tracks[state.stroke];

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill} onLayout={onLayout} accessibilityLabel={`Trace ${item.title}`}>
        {box.w > 0 && (
          <Canvas style={{ width: box.w, height: box.h }}>
            <PageArtwork
              page={page}
              skia={skia}
              fills={{}}
              transform={transform}
              // Worksheet lines run behind the letter, as on paper.
              underlay={guides.map((g, i) => (
                <Path key={i} path={g.path} style="stroke" strokeWidth={GUIDE_WIDTH} strokeCap="round" color={GUIDE_COLOR}>
                  {g.dashed && <DashPathEffect intervals={[24, 18]} />}
                </Path>
              ))}
            />
            <Group transform={[{ translateX: transform.tx }, { translateY: transform.ty }, { scale: transform.scale }]}>
              <TraceInk item={item} state={state} dots />
              {current && <LeadDot track={current} progress={state.progress} />}
            </Group>
          </Canvas>
        )}
      </View>
    </GestureDetector>
  );
}

/**
 * A gently pulsing green dot with a white arrow pointing the way: at the start of the stroke to trace next, then at the
 * end of the ink, leading the finger along.
 */
function LeadDot({ track, progress }: { track: Track; progress: number }) {
  const at = pointAt(track, progress);
  const dir = directionAt(track, progress);
  const arrow = useMemo(() => {
    // A shaft with an arrowhead: a lone triangle reads as a "play" sign at some angles.
    const tip = { x: at.x + dir.x * 20, y: at.y + dir.y * 20 };
    const tail = { x: at.x - dir.x * 20, y: at.y - dir.y * 20 };
    const head = { x: tip.x - dir.x * 14, y: tip.y - dir.y * 14 };
    const side = { x: -dir.y * 13, y: dir.x * 13 };
    return Skia.Path.MakeFromSVGString(
      `M${tail.x} ${tail.y} L${tip.x} ${tip.y} M${head.x + side.x} ${head.y + side.y} L${tip.x} ${tip.y} L${head.x - side.x} ${head.y - side.y}`,
    )!;
  }, [at.x, at.y, dir.x, dir.y]);
  const still = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!still) pulse.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [pulse, still]);
  const halo = useDerivedValue(() => START_DOT + 10 + pulse.get() * 12);
  return (
    <Group>
      <Circle cx={at.x} cy={at.y} r={halo} color={START_COLOR} opacity={0.3} />
      <Circle cx={at.x} cy={at.y} r={START_DOT} color={START_COLOR} />
      <Path path={arrow} style="stroke" strokeWidth={8} strokeCap="round" strokeJoin="round" color="#FFFFFF" />
    </Group>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
