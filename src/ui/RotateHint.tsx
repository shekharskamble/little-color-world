import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SunnyBackdrop } from './SunnyBackdrop';
import { colors } from './tokens';

/** A drawn iPad, upright: about the iPad's own 3:4 shape. */
const PAD_W = 150;
const PAD_H = 200;
/** The turning arrow: an arc over the iPad, going the way it turns (anticlockwise), with a head at its end. */
const ARROW_BOX = 360;
const ARROW_R = 158;
const ARROW_START = -25;
const ARROW_SWEEP = -130;
const HEAD = 30;
const SCREEN_STRIPES = ['#FF6B6B', '#FFB347', '#FFE066', '#7BD389', '#6EC6FF', '#B39DDB'] as const;

/**
 * Covers the app when its window is upright. The app is landscape only, but iPadOS 26 can still show it in portrait
 * (UIRequiresFullScreen is deprecated; owner report 2026-11-03). It shows a picture of an iPad turning sideways, with no
 * words a child must read, and disappears as soon as the window is landscape again. Whatever is behind it is kept.
 */
export function RotateHint() {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      turn.set(1);
      return;
    }
    // Upright, pause, turn sideways, pause, snap back: a slow loop a toddler can follow.
    turn.set(
      withRepeat(
        withSequence(
          withDelay(700, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })),
          withDelay(1200, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [reduceMotion, turn]);

  const arrow = useMemo(() => turnArrow(), []);
  const padStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-90 * turn.value}deg` }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel="Turn the iPad sideways">
      <SunnyBackdrop variant="sky" />
      <View style={styles.center}>
        <Animated.View style={[styles.pad, padStyle]}>
          <View style={styles.screen}>
            {SCREEN_STRIPES.map((c) => (
              <View key={c} style={[styles.stripe, { backgroundColor: c }]} />
            ))}
          </View>
        </Animated.View>
        <Canvas style={styles.arrow} pointerEvents="none">
          <Path path={arrow} style="stroke" strokeWidth={12} strokeCap="round" strokeJoin="round" color={colors.ink} />
        </Canvas>
      </View>
    </View>
  );
}

/** The arc plus a two-line head pointing along the arc's anticlockwise direction at its end. */
function turnArrow() {
  const c = ARROW_BOX / 2;
  const path = Skia.PathBuilder.Make();
  path.addArc({ x: c - ARROW_R, y: c - ARROW_R, width: 2 * ARROW_R, height: 2 * ARROW_R }, ARROW_START, ARROW_SWEEP);
  const end = ((ARROW_START + ARROW_SWEEP) * Math.PI) / 180;
  const tip = {
    x: c + ARROW_R * Math.cos(end),
    y: c + ARROW_R * Math.sin(end),
  };
  // Anticlockwise on screen (y down) the arc heads along (sin, -cos) at its end.
  const dir = Math.atan2(-Math.cos(end), Math.sin(end));
  for (const side of [-1, 1]) {
    const a = dir + Math.PI + side * 0.6;
    path.moveTo(tip.x, tip.y);
    path.lineTo(tip.x + HEAD * Math.cos(a), tip.y + HEAD * Math.sin(a));
  }
  return path.detach();
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: {
    width: PAD_W,
    height: PAD_H,
    borderRadius: 22,
    borderWidth: 10,
    borderColor: colors.ink,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  screen: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  stripe: { flex: 1 },
  // Centred on the iPad, behind nothing: the arc clears the iPad's corners as it turns.
  arrow: { position: 'absolute', width: ARROW_BOX, height: ARROW_BOX },
});
