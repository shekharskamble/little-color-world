import { Canvas } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import type { ColoringPage } from '@/content/schema/page';
import type { FillMap, Stroke } from '@/engine/coloring/history';
import { fitContain, fitContainRect, fitCover, zoomAbout, type ViewTransform } from '@/engine/geometry/viewTransform';

import { PageArtwork } from './PageArtwork';
import { useSkiaPage } from './useSkiaPage';

/** Live-rendered, non-interactive page preview (no pre-rendered PNG needed). */
export function PageThumbnail({
  page,
  fills = {},
  strokes = [],
  fit = 'contain',
  zoom = 1,
  style,
}: {
  page: ColoringPage;
  fills?: FillMap;
  strokes?: readonly Stroke[];
  /**
   * `cover` fills the box edge to edge (cropping a sliver if the shapes differ); `contain` shows the whole page;
   * `content` fits the drawing itself (everything but the page-sized background), so nothing is cut and no page
   * margin is wasted.
   */
  fit?: 'contain' | 'cover' | 'content';
  /** Enlarges the picture about the box centre after fitting (crops the page's edges). */
  zoom?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const skia = useSkiaPage(page);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const [, , pw, ph] = page.viewBox;
  const content = useMemo(() => {
    if (fit !== 'content') return null;
    const paths = [...skia.regions.filter((r) => r.id !== 'background').map((r) => r.path), ...skia.outline.map((o) => o.path)];
    let b: { x0: number; y0: number; x1: number; y1: number } | null = null;
    for (const p of paths) {
      const r = p.computeTightBounds();
      if (r.width <= 0 || r.height <= 0) continue;
      b = b
        ? { x0: Math.min(b.x0, r.x), y0: Math.min(b.y0, r.y), x1: Math.max(b.x1, r.x + r.width), y1: Math.max(b.y1, r.y + r.height) }
        : { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height };
    }
    return b && { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 };
  }, [fit, skia]);
  const base = (w: number, h: number): ViewTransform =>
    fit === 'cover' ? fitCover(pw, ph, w, h) : content ? fitContainRect(content, w, h, 6) : fitContain(pw, ph, w, h);
  return (
    <View style={style} onLayout={onLayout} pointerEvents="none">
      {box.w > 0 && (
        <Canvas style={{ width: box.w, height: box.h }}>
          <PageArtwork page={page} skia={skia} fills={fills} strokes={strokes} transform={zoomAbout(base(box.w, box.h), zoom, box.w / 2, box.h / 2)} />
        </Canvas>
      )}
    </View>
  );
}
