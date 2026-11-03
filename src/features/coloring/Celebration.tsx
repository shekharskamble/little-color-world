import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fillBaseColor } from '@/content/schema/fill';
import { isVeryLight } from '@/engine/fills/fills';
import { FillShader } from '@/render/FillShader';
import { ICONS } from '@/ui/icons';
import { colors } from '@/ui/tokens';

import type { StarFlight } from './celebrationStars';

/** One burst of stars on screen; removed through `onDone` when its animation ends. */
export type Celebration = { key: number; stars: readonly StarFlight[]; duration: number };

const STAR = Skia.Path.MakeFromSVGString(ICONS.star[0].d)!;
/** The star icon is drawn on a 48 grid around (24, 24). */
const GRID = 48;
const STAR_BOUNDS = STAR.computeTightBounds();
/** Pattern repeat in star units: a few hearts or dots show inside each star. */
const STAR_PATTERN_CELL = 11;

/** Stars over whatever is underneath. Never takes touches, so the child can keep colouring while it plays. */
export function CelebrationLayer({ items, onDone }: { items: readonly Celebration[]; onDone: (key: number) => void }) {
  if (items.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {items.map((c) => (
          <Burst key={c.key} item={c} onDone={onDone} />
        ))}
      </Canvas>
    </View>
  );
}

function Burst({ item, onDone }: { item: Celebration; onDone: (key: number) => void }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withTiming(1, { duration: item.duration, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(onDone, item.key);
      }),
    );
  }, [item, onDone, progress]);
  return item.stars.map((s, i) => <FlyingStar key={i} progress={progress} s={s} />);
}

function FlyingStar({ progress, s }: { progress: SharedValue<number>; s: StarFlight }) {
  const moves = s.x0 !== s.x1 || s.y0 !== s.y1;
  const local = useDerivedValue(() => Math.min(1, Math.max(0, (progress.get() - s.delay) / (1 - s.delay))));
  const transform = useDerivedValue(() => {
    const t = local.get();
    const e = 1 - (1 - t) ** 3;
    // Moving stars pop in from small; with reduced motion they keep one size and only fade.
    const grow = moves ? 0.3 + 0.7 * Math.min(1, t / 0.15) : 1;
    return [
      { translateX: s.x0 + (s.x1 - s.x0) * e },
      { translateY: s.y0 + (s.y1 - s.y0) * e },
      { rotate: s.spin * t },
      { scale: (s.size / GRID) * grow },
      { translateX: -GRID / 2 },
      { translateY: -GRID / 2 },
    ];
  });
  const opacity = useDerivedValue(() => {
    const t = local.get();
    if (t <= 0) return 0;
    return t > 0.7 ? (1 - t) / 0.3 : Math.min(1, t / 0.08);
  });
  const base = fillBaseColor(s.fill);
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={STAR} color={base}>
        <FillShader fill={s.fill} bounds={STAR_BOUNDS} cell={STAR_PATTERN_CELL} />
      </Path>
      {/* A white edge, or an ink one around a very pale star (white, cream) so it still shows on the white page. */}
      <Path path={STAR} color={s.fill.type === 'solid' && isVeryLight(base) ? colors.ink : '#FFFFFF'} style="stroke" strokeWidth={3.5} strokeJoin="round" />
    </Group>
  );
}
