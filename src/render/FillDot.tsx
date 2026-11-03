import { Canvas, Circle, Group, rect } from '@shopify/react-native-skia';

import { fillBaseColor, type FillStyle } from '@/content/schema/fill';

import { FillShader } from './FillShader';

/** Patterns are drawn at this fraction of page scale, so a small dot shows a few shapes rather than one big one. */
const PATTERN_SCALE = 0.5;

/** A round sample of a fill (palette swatches, tabs). Purely visual: the surrounding button is the touch target. */
export function FillDot({ fill, size }: { fill: FillStyle; size: number }) {
  const s = fill.type === 'pattern' ? PATTERN_SCALE : 1;
  const r = size / 2 / s;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: s }]}>
        <Circle cx={r} cy={r} r={r} color={fillBaseColor(fill)}>
          <FillShader fill={fill} bounds={rect(0, 0, r * 2, r * 2)} />
        </Circle>
      </Group>
    </Canvas>
  );
}
