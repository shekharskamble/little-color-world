import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getPage } from '@/content/registry';
import { getTrace, TRACE_FRAME, TRACE_SETS } from '@/content/traces';
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

/** Trace and Color: pick a set (ABC, abc, 123, Shapes). */
export default function TraceSets() {
  const db = useSQLiteContext();
  const [progress, setProgress] = useState<Record<string, Artwork>>({});
  const [traces, setTraces] = useState<ReadonlyMap<string, SavedTrace>>(new Map());

  // Each set's cover shows the child's work on that item (coloring and tracing ink), like the theme picker's covers.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadTraces(db)
        .then((saved) => !cancelled && setTraces(saved))
        .catch((e: unknown) => console.warn('Could not load tracings', e));
      Promise.all(
        TRACE_SETS.map(async (set) => {
          const pageId = getTrace(set.cover)?.colorPageId ?? set.cover;
          const saved = await findInProgressColoring(db, pageId);
          return [pageId, { fills: saved?.fills ?? {}, strokes: saved?.strokes ?? [] }] as const;
        }),
      )
        .then((entries) => !cancelled && setProgress(Object.fromEntries(entries)))
        .catch((e: unknown) => console.warn('Could not load cover progress', e));
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" accessibilityLabel="Back" onPress={() => router.dismissTo('/')} />
        <RainbowTitle subtitle="Pick something to trace" subtitleFontSize={34} />
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.grid}>
        {TRACE_SETS.map((set) => {
          const cover = getTrace(set.cover);
          const page = cover && getPage(cover.colorPageId);
          const saved = cover && traces.get(cover.id);
          const traced = cover && saved && restoreTrace(traceGeometry(cover).tracks, saved.state, saved.completed);
          return (
            <CatalogCard
              key={set.id}
              label={set.title}
              accent={set.color}
              onPress={() => router.push({ pathname: '/trace/set/[set]', params: { set: set.id } })}
              style={styles.card}
            >
              {page ? (
                <PageThumbnail
                  page={page}
                  fills={progress[page.id]?.fills}
                  strokes={progress[page.id]?.strokes}
                  // One scale for every cover, each centred in its card.
                  frame={TRACE_FRAME}
                  overlay={cover && traced ? <TraceInk item={cover} state={traced} /> : undefined}
                  style={styles.thumb}
                />
              ) : undefined}
            </CatalogCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 80 }, // mirrors the back button so the title stays centered
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: 48, paddingBottom: 24 },
  card: { width: '40%', aspectRatio: 1.6 },
  thumb: { flex: 1, alignSelf: 'stretch' },
});
