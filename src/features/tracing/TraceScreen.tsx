import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { ColoringPage } from '@/content/schema/page';
import type { TraceItem } from '@/content/schema/trace';
import { createAutosaver } from '@/engine/autosave';
import type { Point } from '@/engine/geometry/path';
import { isTraceDone, restoreTrace, START, traceMove, type TraceState } from '@/engine/tracing/trace';
import { CelebrationLayer, type Celebration } from '@/features/coloring/Celebration';
import { popStars, showerStars } from '@/features/coloring/celebrationStars';
import { loadTrace, saveTrace } from '@/persistence/tracingRepository';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { RainbowTitle } from '@/ui/RainbowTitle';
import { Screen } from '@/ui/Screen';
import { ToyButton } from '@/ui/ToyButton';
import { colors, radius, roundedFont, size, tones } from '@/ui/tokens';

import { TraceCanvas } from './TraceCanvas';
import { inkColor, traceGeometry } from './TraceInk';

const POP_MS = 1000;
const SHOWER_MS = 2600;
/** Tracing changes many times a second; it is saved this long after the finger stops, and on leaving. */
const AUTOSAVE_DELAY_MS = 600;

// Most iPads have no haptic engine; the calls are harmless there.
const haptic = {
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

let nextKey = 1;

/**
 * Trace each stroke in order; when the last one is done, stars, then "Color it!" opens the item's coloring page.
 * Progress is saved as the child traces and restored on reopening (a finished item reopens finished).
 */
export function TraceScreen({ item, page }: { item: TraceItem; page: ColoringPage }) {
  const db = useSQLiteContext();
  const { tracks } = traceGeometry(item);
  const [state, setState] = useState(START);
  // Touches wait for the restore, so it can never overwrite fresh tracing.
  const [ready, setReady] = useState(false);
  const done = isTraceDone(state, tracks);
  const inkFill = useMemo(() => ({ type: 'solid', color: inkColor(item) }) as const, [item]);

  useEffect(() => {
    let cancelled = false;
    loadTrace(db, item.id)
      .then((saved) => !cancelled && saved && setState(restoreTrace(tracks, saved.state, saved.completed)))
      .catch((e: unknown) => console.warn('Could not restore tracing', e))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [db, item.id, tracks]);

  const saver = useMemo(
    () =>
      createAutosaver<TraceState>(
        (s) => saveTrace(db, item.id, item.version, s, isTraceDone(s, tracks)),
        AUTOSAVE_DELAY_MS,
        (e) => console.warn('Could not save tracing', e),
      ),
    [db, item.id, item.version, tracks],
  );
  // Saved on every change the child makes (not on restore, which only re-reads what is already saved).
  const update = (next: TraceState) => {
    setState(next);
    saver.schedule(next);
  };
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void saver.flush();
    });
    return () => {
      sub.remove();
      void saver.flush();
    };
  }, [saver]);
  useFocusEffect(
    useCallback(
      () => () => {
        void saver.flush();
      },
      [saver],
    ),
  );

  const still = useReducedMotion();
  const screen = useWindowDimensions();
  const [pops, setPops] = useState<Celebration[]>([]);
  const [shower, setShower] = useState<Celebration[]>([]);
  const donePop = useCallback((key: number) => setPops((p) => p.filter((c) => c.key !== key)), []);
  const doneShower = useCallback(() => setShower([]), []);

  const onMove = (from: Point | null, to: Point, at: Point) => {
    if (!ready) return;
    const next = traceMove(tracks, state, from, to);
    if (next === state) return;
    update(next);
    if (next.stroke === state.stroke) return;
    // Each finished stroke pops stars where the finger is; the last one also gets the shower.
    setPops((p) => [...p, { key: nextKey++, stars: popStars(at.x, at.y, still, inkFill), duration: POP_MS }]);
    if (isTraceDone(next, tracks)) {
      setShower([{ key: nextKey++, stars: showerStars(screen.width, screen.height, still, inkFill), duration: SHOWER_MS }]);
      haptic.success();
      // Saved straight away, so the picker's check is there even if they leave at once.
      void saver.flush();
    } else {
      haptic.light();
    }
  };

  return (
    <Screen scenery="sky" bottomPadding={8} overlay={<CelebrationLayer items={shower} onDone={doneShower} />}>
      <View style={styles.topBar}>
        <IconButton
          icon="back"
          tone="blue"
          accessibilityLabel="Back"
          diameter={size.touchPrimary}
          onPress={() => router.dismissTo({ pathname: '/trace/set/[set]', params: { set: item.set } })}
        />
        <RainbowTitle title={item.title} />
        <IconButton
          icon="reset"
          tone="teal"
          diameter={size.touchPrimary}
          accessibilityLabel="Trace again"
          disabled={state.stroke === 0 && state.progress === 0}
          onPress={() => update(START)}
        />
      </View>
      <View style={styles.card}>
        <TraceCanvas item={item} page={page} tracks={tracks} state={state} onMove={onMove} />
        <CelebrationLayer items={pops} onDone={donePop} />
        {done && (
          <ToyButton
            tone="green"
            accessibilityLabel="Now color it"
            lip={10}
            onPress={() => router.push({ pathname: '/color/[pageId]', params: { pageId: item.colorPageId } })}
            style={styles.colorIt}
            contentStyle={styles.colorItFace}
          >
            <Icon name="palette" size={48} color={tones.green.icon} strokeWidth={4.5} />
            <Text style={styles.colorItText}>Color it!</Text>
          </ToyButton>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  card: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.card, overflow: 'hidden', borderWidth: 6, borderColor: colors.sand },
  colorIt: { position: 'absolute', right: 32, bottom: 32, height: 104, minWidth: 300 },
  colorItFace: { flexDirection: 'row', gap: 16, paddingHorizontal: 40 },
  colorItText: { fontFamily: roundedFont, fontSize: 38, fontWeight: '900', color: colors.bgCard },
});
