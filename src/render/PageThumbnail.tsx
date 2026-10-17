import { Canvas } from '@shopify/react-native-skia';
import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import type { ColoringPage } from '@/content/schema/page';
import type { FillMap } from '@/engine/coloring/history';
import { fitContain } from '@/engine/geometry/viewTransform';

import { PageArtwork } from './PageArtwork';
import { useSkiaPage } from './useSkiaPage';

/** Live-rendered, non-interactive page preview (no pre-rendered PNG needed). */
export function PageThumbnail({ page, fills = {}, style }: { page: ColoringPage; fills?: FillMap; style?: StyleProp<ViewStyle> }) {
  const skia = useSkiaPage(page);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const [, , pw, ph] = page.viewBox;
  return (
    <View style={style} onLayout={onLayout} pointerEvents="none">
      {box.w > 0 && (
        <Canvas style={{ width: box.w, height: box.h }}>
          <PageArtwork page={page} skia={skia} fills={fills} transform={fitContain(pw, ph, box.w, box.h)} />
        </Canvas>
      )}
    </View>
  );
}
