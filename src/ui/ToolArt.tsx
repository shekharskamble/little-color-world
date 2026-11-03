import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { View } from 'react-native';

import { fillBaseColor, type FillStyle } from '@/content/schema/fill';
import { FillShader } from '@/render/FillShader';

import { TOOL_ART, TOOL_ART_H, TOOL_ART_W, TOOL_OWN_COLOR, type ToolArtName } from './toolPaths';
import { colors } from './tokens';

type Props = {
  name: ToolArtName;
  /** Drawn width; the height follows the 120 × 48 grid. */
  width: number;
  /** The paint colour; defaults to the tool's own colour. */
  paint?: string;
  /** Draws the paint parts with this fill instead (a bucket's gloss, glitter, pattern or rainbow). */
  paintFill?: FillStyle;
};

/** Pattern repeat in grid units: a few shapes across a roller. */
const ART_PATTERN_CELL = 12;
/** Paint parts' bounds, for laying out gradients and gloss across each part. Paths never change, so parse once. */
const bounds = new Map<string, ReturnType<NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>['computeTightBounds']>>();
const boundsOf = (d: string) => {
  let b = bounds.get(d);
  if (!b) {
    b = Skia.Path.MakeFromSVGString(d)!.computeTightBounds();
    bounds.set(d, b);
  }
  return b;
};

/** A coloring tool drawn as a toy (src/ui/toolPaths.ts). Decorative: the surrounding button carries the label. */
export function ToolArt({ name, width, paint = TOOL_OWN_COLOR[name], paintFill }: Props) {
  const height = (width * TOOL_ART_H) / TOOL_ART_W;
  return (
    <View style={{ width, height }} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Canvas style={{ width, height }}>
        <Group transform={[{ scale: width / TOOL_ART_W }]}>
          {TOOL_ART[name].map((p, i) => {
            const isPaint = 'color' in p && p.color === 'paint';
            const color = isPaint ? (paintFill ? fillBaseColor(paintFill) : paint) : 'color' in p ? p.color : colors.ink;
            const filled = 'fill' in p && p.fill;
            return (
              <Path
                key={i}
                path={p.d}
                color={color}
                style={filled ? 'fill' : 'stroke'}
                strokeWidth={'width' in p ? p.width : 3.5}
                strokeCap="round"
                strokeJoin="round"
              >
                {isPaint && filled && paintFill && <FillShader fill={paintFill} bounds={boundsOf(p.d)} cell={ART_PATTERN_CELL} />}
              </Path>
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
}
