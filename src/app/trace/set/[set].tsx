import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPage } from '@/content/registry';
import { TraceSet } from '@/content/schema/trace';
import { listTraces, TRACE_FRAME, TRACE_SETS } from '@/content/traces';
import type { Artwork } from '@/engine/coloring/history';
import { restoreTrace } from '@/engine/tracing/trace';
import { traceGeometry, TraceInk } from '@/features/tracing/TraceInk';
import { findInProgressColoring } from '@/persistence/artworkRepository';
import { loadTraces, type SavedTrace } from '@/persistence/tracingRepository';
import { PageThumbnail } from '@/render/PageThumbnail';
import { CatalogCard } from '@/ui/CatalogCard';
import { IconButton } from '@/ui/IconButton';
import { RainbowTitle } from '@/ui/RainbowTitle';
import { Screen } from '@/ui/Screen';
import { colors, roundedFont } from '@/ui/tokens';

/**
 * One set's items. Each thumbnail shows the child's work on it: their coloring, and over it the crayon ink of their
 * tracing so far. Finished tracings carry a check sticker.
 */
export default function TraceItems() {
  const params = useLocalSearchParams<{ set: string }>();
  const set = TraceSet.safeParse(params.set);
  const info = TRACE_SETS.find((s) => set.success && s.id === set.data);
  const items = useMemo(() => (set.success ? listTraces(set.data) : []), [set.success, set.data]);
  const db = useSQLiteContext();
  const [traces, setTraces] = useState<ReadonlyMap<string, SavedTrace>>(new Map());
  const [progress, setProgress] = useState<Record<string, Artwork>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadTraces(db)
        .then((saved) => !cancelled && setTraces(saved))
        .catch((e: unknown) => console.warn('Could not load tracings', e));
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  // Like the theme page grid: a letter the child colored shows their colors, so they recognise "their" letter.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all(
        items.map(async (item) => {
          const saved = await findInProgressColoring(db, item.colorPageId);
          return [item.colorPageId, { fills: saved?.fills ?? {}, strokes: saved?.strokes ?? [] }] as const;
        }),
      )
        .then((entries) => !cancelled && setProgress(Object.fromEntries(entries)))
        .catch((e: unknown) => console.warn('Could not load progress', e));
      return () => {
        cancelled = true;
      };
    }, [db, items]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" accessibilityLabel="Back" onPress={() => router.dismissTo('/trace')} />
        <RainbowTitle title={info?.title ?? ''} />
        <View style={styles.headerSpacer} />
      </View>
      {items.length === 0 ? (
        // Stub while the set's items are being generated (tools/tracing/generate.ts); said openly, never a broken screen.
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Coming soon</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
          {items.map((item) => {
            const page = getPage(item.colorPageId);
            const saved = traces.get(item.id);
            const traced = saved && restoreTrace(traceGeometry(item).tracks, saved.state, saved.completed);
            return (
              <CatalogCard
                key={item.id}
                label={item.title}
                hideLabel
                accent={info?.color ?? colors.accent}
                done={saved?.completed ?? false}
                onPress={() => router.push({ pathname: '/trace/[itemId]', params: { itemId: item.id } })}
                style={styles.card}
              >
                {page ? (
                  <PageThumbnail
                    page={page}
                    fills={progress[page.id]?.fills}
                    strokes={progress[page.id]?.strokes}
                    // One scale for every item (lowercase stays smaller than capitals), each centred in its card.
                    frame={TRACE_FRAME}
                    overlay={traced ? <TraceInk item={item} state={traced} /> : undefined}
                    style={styles.thumb}
                  />
                ) : undefined}
              </CatalogCard>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerSpacer: { width: 80 }, // mirrors the back button so the title stays centered
  scroll: { flex: 1 },
  grid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 32, alignContent: 'center', justifyContent: 'center', paddingTop: 16, paddingBottom: 32 },
  card: { width: '17%', aspectRatio: 4 / 3 },
  thumb: { flex: 1, alignSelf: 'stretch' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 48 },
  emptyText: { fontFamily: roundedFont, fontSize: 32, fontWeight: '800', color: colors.inkSoft },
});
