import { Skia, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import type { ColoringPage, OutlinePath } from '@/content/schema/page';

export type SkiaRegion = { id: string; path: SkPath; fillType: 'winding' | 'evenOdd'; defaultColor: string };
export type SkiaOutline = { path: SkPath; spec: OutlinePath };
export type SkiaPage = { regions: SkiaRegion[]; outline: SkiaOutline[] };

const DEFAULT_REGION_COLOR = '#FFFFFF';

function makePath(d: string): SkPath {
  const path = Skia.Path.MakeFromSVGString(d);
  // Pages are validated before they reach rendering, so this indicates a bug.
  if (!path) throw new Error(`Skia could not parse path: ${d.slice(0, 40)}…`);
  return path;
}

/** Builds Skia paths for a page once; region and outline geometry never changes. */
export function useSkiaPage(page: ColoringPage): SkiaPage {
  return useMemo(() => {
    const regions = page.regions.map((r) => ({
      id: r.id,
      path: makePath(r.d),
      fillType: r.fillRule === 'evenodd' ? ('evenOdd' as const) : ('winding' as const),
      defaultColor: r.defaultFill?.color ?? DEFAULT_REGION_COLOR,
    }));
    const outline = page.outline.map((spec) => ({ path: makePath(spec.d), spec }));
    return { regions, outline };
  }, [page]);
}
