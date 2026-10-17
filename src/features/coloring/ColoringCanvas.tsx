import { Canvas } from '@shopify/react-native-skia';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';

import type { ColoringPage } from '@/content/schema/page';
import type { FillMap } from '@/engine/coloring/history';
import { hitTest, prepareRegions } from '@/engine/coloring/hitTest';
import { fitContain, screenToPage } from '@/engine/geometry/viewTransform';
import { PageArtwork } from '@/render/PageArtwork';
import { useSkiaPage } from '@/render/useSkiaPage';

/** Extra forgiveness, in screen points, beyond half the outline width. */
const TAP_SLOP_PT = 10;
const CANVAS_PADDING = 12;

type Props = {
  page: ColoringPage;
  fills: FillMap;
  enabled: boolean;
  onRegionTap: (regionId: string) => void;
};

export function ColoringCanvas({ page, fills, enabled, onRegionTap }: Props) {
  const skia = useSkiaPage(page);
  const regions = useMemo(() => prepareRegions(page), [page]);
  const maxStroke = useMemo(() => Math.max(...page.outline.map((o) => o.strokeWidth)), [page]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [, , pw, ph] = page.viewBox;
  const transform = useMemo(() => fitContain(pw, ph, box.w, box.h, CANVAS_PADDING), [pw, ph, box]);

  // Gesture callbacks read the latest values through a ref.
  const latest = useRef({ transform, enabled, onRegionTap });
  useLayoutEffect(() => {
    latest.current = { transform, enabled, onRegionTap };
  });

  const tap = useTapGesture({
    maxDistance: 24,
    runOnJS: true,
    onActivate: (e) => {
      const { transform: t, enabled: on, onRegionTap: cb } = latest.current;
      if (!on || e.numberOfPointers !== 1) return; // ignore palms / multi-finger touches
      const tolerance = maxStroke / 2 + TAP_SLOP_PT / t.scale;
      const id = hitTest(regions, screenToPage(t, { x: e.x, y: e.y }), tolerance);
      if (id) cb(id);
    },
  });

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.fill} onLayout={onLayout} accessibilityLabel={`${page.title} coloring page`}>
        {box.w > 0 && (
          <Canvas style={{ width: box.w, height: box.h }}>
            <PageArtwork page={page} skia={skia} fills={fills} transform={transform} />
          </Canvas>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
