import { Group, Path, Rect } from '@shopify/react-native-skia';
import { memo } from 'react';

import type { ColoringPage } from '@/content/schema/page';
import type { FillMap } from '@/engine/coloring/history';
import type { ViewTransform } from '@/engine/geometry/viewTransform';

import type { SkiaPage } from './useSkiaPage';

type Props = { page: ColoringPage; skia: SkiaPage; fills: FillMap; transform: ViewTransform };

/**
 * Draws a coloring page: background, region fills in draw order, then the
 * outline layer on top of everything. Each fill is drawn *as its region path*,
 * so it is inherently clipped to the region and can never cover the outline.
 * Must be rendered inside a Skia <Canvas>.
 */
export function PageArtwork({ page, skia, fills, transform }: Props) {
  const [, , w, h] = page.viewBox;
  return (
    <Group transform={[{ translateX: transform.tx }, { translateY: transform.ty }, { scale: transform.scale }]}>
      <Rect x={0} y={0} width={w} height={h} color={page.background} />
      {skia.regions.map((r) => (
        <RegionFill key={r.id} region={r} color={fills[r.id]?.color ?? r.defaultColor} />
      ))}
      <Outline page={page} skia={skia} />
    </Group>
  );
}

// Memoized so a tap re-renders only the region whose color changed.
const RegionFill = memo(function RegionFill({ region, color }: { region: SkiaPage['regions'][number]; color: string }) {
  return <Path path={region.path} fillType={region.fillType} color={color} />;
});

const Outline = memo(function Outline({ page, skia }: { page: ColoringPage; skia: SkiaPage }) {
  return (
    <Group>
      {skia.outline.map(({ path, spec }, i) => (
        <Path
          key={i}
          path={path}
          style="stroke"
          strokeWidth={spec.strokeWidth}
          strokeCap={spec.lineCap}
          strokeJoin={spec.lineJoin}
          color={page.outlineColor}
        />
      ))}
    </Group>
  );
});
