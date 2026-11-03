import { BlurMask, Group, Path, Rect, Shader, rect } from '@shopify/react-native-skia';
import { memo } from 'react';

import { fillBaseColor, type FillStyle } from '@/content/schema/fill';
import type { ColoringPage } from '@/content/schema/page';
import type { FillMap, Stroke } from '@/engine/coloring/history';
import type { ViewTransform } from '@/engine/geometry/viewTransform';

import { FillShader, rgba, textureEffect } from './FillShader';
import { strokePath } from './strokePath';
import { TEXTURE_KIND } from './textureShader';
import type { SkiaPage } from './useSkiaPage';

type Props = { page: ColoringPage; skia: SkiaPage; fills: FillMap; strokes?: readonly Stroke[]; transform: ViewTransform };

/**
 * Draws a coloring page: background, region fills in draw order, brush strokes
 * (each clipped to the visible part of its region), then the outline layer on
 * top of everything. Each fill is drawn *as its region path*, so it is
 * inherently clipped to the region and can never cover the outline.
 * Everything is clipped to the page, so art that runs past the edge (a ground
 * shape and its outline) never shows outside it. Must be rendered inside a Skia <Canvas>.
 */
export function PageArtwork({ page, skia, fills, strokes = [], transform }: Props) {
  const [, , w, h] = page.viewBox;
  return (
    <Group transform={[{ translateX: transform.tx }, { translateY: transform.ty }, { scale: transform.scale }]} clip={rect(0, 0, w, h)}>
      <Rect x={0} y={0} width={w} height={h} color={page.background} />
      {skia.regions.map((r) => (
        <RegionFill key={r.id} region={r} fill={fills[r.id] ?? r.defaultFill} />
      ))}
      {/* Brush paint has its own layer, so eraser strokes clear only paint and the fills show through again. */}
      {strokes.length > 0 && (
        <Group layer>
          {strokes.map((s, i) => (
            <BrushStroke key={i} stroke={s} skia={skia} />
          ))}
        </Group>
      )}
      <Outline page={page} skia={skia} />
    </Group>
  );
}

// Memoized so a tap re-renders only the region whose fill changed (fill objects are kept by the history reducer).
const RegionFill = memo(function RegionFill({ region, fill }: { region: SkiaPage['regions'][number]; fill: FillStyle }) {
  return (
    <Path path={region.path} fillType={region.fillType} color={fillBaseColor(fill)}>
      <FillShader fill={fill} bounds={region.bounds} />
    </Path>
  );
});

// Strokes are immutable, so a finished stroke never re-renders while a new one is drawn.
const BrushStroke = memo(function BrushStroke({ stroke, skia }: { stroke: Stroke; skia: SkiaPage }) {
  if (stroke.erase) {
    // Not clipped: rubbing over a line into the next part erases paint there too, like a real eraser.
    return (
      <Path path={strokePath(stroke)} style="stroke" strokeWidth={stroke.width} strokeCap="round" strokeJoin="round" color="#000000" blendMode="clear" />
    );
  }
  const clip = skia.visibleArea(stroke.regionId);
  if (!clip) return null;
  return (
    <Group clip={clip}>
      <Path path={strokePath(stroke)} style="stroke" strokeWidth={stroke.width} strokeCap="round" strokeJoin="round" color={stroke.color}>
        <PenLook stroke={stroke} />
      </Path>
    </Group>
  );
});

/** NO_BOX: the crayon, pencil and glitter looks are laid out in page units, so they ignore the shader's `box`. */
const NO_BOX = [0, 0, 1, 1];

/** The pen's look as children of the stroke's path: waxy crayon, fine pencil, sparkly glitter or a soft spray. Marker is plain. */
export function PenLook({ stroke }: { stroke: Pick<Stroke, 'pen' | 'color' | 'width'> }) {
  switch (stroke.pen) {
    case 'crayon':
    case 'pencil':
    case 'glitter':
      return <Shader source={textureEffect} uniforms={{ kind: TEXTURE_KIND[stroke.pen], color: rgba(stroke.color), box: NO_BOX }} />;
    case 'spray':
      return <BlurMask blur={stroke.width * 0.3} style="normal" />;
    default:
      return null;
  }
}

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
