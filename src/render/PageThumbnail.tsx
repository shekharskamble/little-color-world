import { Canvas } from '@shopify/react-native-skia';
import { useMemo, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { fillBaseColor } from '@/content/schema/fill';
import type { ColoringPage } from '@/content/schema/page';
import type { FillMap, Stroke } from '@/engine/coloring/history';
import { fitContain, fitContainRect, fitCover, viewRectInPage, zoomAbout, type ViewTransform } from '@/engine/geometry/viewTransform';

import { PageArtwork } from './PageArtwork';
import { useSkiaPage } from './useSkiaPage';

/** Live-rendered, non-interactive page preview (no pre-rendered PNG needed). */
export function PageThumbnail({
  page,
  fills = {},
  strokes = [],
  fit = 'contain',
  zoom = 1,
  frame,
  overlay,
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
  /**
   * Sizes the picture as if fitting this part of the page (page units), then centres the drawing itself in the box:
   * thumbnails given the same frame share one scale, and each still sits in the middle.
   */
  frame?: { x: number; y: number; width: number; height: number };
  /** Drawn in page units over the picture (a tracing's crayon ink). */
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const skia = useSkiaPage(page);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const [, , pw, ph] = page.viewBox;
  const content = useMemo(() => {
    if (fit !== 'content' && !frame) return null;
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
  }, [fit, frame, skia]);
  const base = (w: number, h: number): ViewTransform =>
    frame
      ? centred(fitContainRect(frame, w, h, 6).scale, content ?? frame, w, h)
      : fit === 'cover'
        ? fitCover(pw, ph, w, h)
        : content
          ? fitContainRect(content, w, h, 6)
          : fitContain(pw, ph, w, h);
  // With `content` the drawing can be smaller than the box. A coloured-in background is painted across the whole box
  // (the same fill, so a pattern keeps going) and the card drops its white frame. The drawing still fits as before.
  const transform = zoomAbout(base(box.w, box.h), zoom, box.w / 2, box.h / 2);
  const backdrop = fit === 'content' && fills.background ? fillBaseColor(fills.background) : undefined;
  const backgroundFrame =
    backdrop !== undefined && box.w > 0 ? outset(viewRectInPage(transform, box.w, box.h), 1 / transform.scale) : undefined;
  return (
    <View style={[style, backdrop !== undefined && { backgroundColor: backdrop }]} onLayout={onLayout} pointerEvents="none">
      {box.w > 0 && (
        <Canvas style={{ width: box.w, height: box.h }}>
          <PageArtwork
            page={page}
            skia={skia}
            fills={fills}
            strokes={strokes}
            transform={transform}
            overlay={overlay}
            backgroundFrame={backgroundFrame}
          />
        </Canvas>
      )}
    </View>
  );
}

/** Grows `r` by `pad` on every side so a rounded card edge cannot show a hairline of the card behind it. */
function outset(r: { x: number; y: number; width: number; height: number }, pad: number) {
  return { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

/** A transform at `scale` that puts the centre of `rect` (page units) in the middle of a w × h box. */
function centred(scale: number, rect: { x: number; y: number; width: number; height: number }, w: number, h: number): ViewTransform {
  return { scale, tx: w / 2 - (rect.x + rect.width / 2) * scale, ty: h / 2 - (rect.y + rect.height / 2) * scale };
}
