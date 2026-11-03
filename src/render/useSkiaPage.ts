import { FillType, PathOp, Skia, type SkPath, type SkRect } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import type { FillStyle } from '@/content/schema/fill';
import type { ColoringPage, OutlinePath } from '@/content/schema/page';

export type SkiaRegion = {
  id: string;
  path: SkPath;
  fillType: 'winding' | 'evenOdd';
  defaultFill: FillStyle;
  /** Tight bounds of the region, which gradients are laid out across. */
  bounds: SkRect;
};
export type SkiaOutline = { path: SkPath; spec: OutlinePath };
export type SkiaPage = {
  regions: SkiaRegion[];
  outline: SkiaOutline[];
  /**
   * The part of a region that is actually visible: its shape minus every region drawn on top of it (later parts,
   * eyes). Brush strokes are clipped to this so paint stays inside what the child sees. Computed on first use.
   */
  visibleArea: (regionId: string) => SkPath | null;
};

const DEFAULT_REGION_FILL: FillStyle = { type: 'solid', color: '#FFFFFF' };

function makePath(d: string, evenOdd = false): SkPath {
  const path = Skia.Path.MakeFromSVGString(d);
  // Pages are validated before they reach rendering, so this indicates a bug.
  if (!path) throw new Error(`Skia could not parse path: ${d.slice(0, 40)}…`);
  // Path operations follow the path's own fill type, so even-odd regions carry it.
  return evenOdd ? Skia.PathBuilder.MakeFromPath(path).setFillType(FillType.EvenOdd).build() : path;
}

/** Builds Skia paths for a page once; region and outline geometry never changes. */
export function useSkiaPage(page: ColoringPage): SkiaPage {
  return useMemo(() => {
    const regions = page.regions.map((r): SkiaRegion => {
      const path = makePath(r.d, r.fillRule === 'evenodd');
      return {
        id: r.id,
        path,
        fillType: r.fillRule === 'evenodd' ? 'evenOdd' : 'winding',
        defaultFill: r.defaultFill ?? DEFAULT_REGION_FILL,
        bounds: path.computeTightBounds(),
      };
    });
    const outline = page.outline.map((spec) => ({ path: makePath(spec.d), spec }));
    const visible = new Map<string, SkPath | null>();
    const visibleArea = (regionId: string): SkPath | null => {
      const cached = visible.get(regionId);
      if (cached !== undefined) return cached;
      const i = regions.findIndex((r) => r.id === regionId);
      let area: SkPath | null = i < 0 ? null : regions[i]!.path;
      for (const above of regions.slice(i + 1)) {
        if (!area) break;
        area = Skia.Path.MakeFromOp(area, above.path, PathOp.Difference);
      }
      visible.set(regionId, area);
      return area;
    };
    return { regions, outline, visibleArea };
  }, [page]);
}
