import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getTheme, listPages } from '@/content/registry';
import type { Artwork } from '@/engine/coloring/history';
import { findInProgressColoring } from '@/persistence/artworkRepository';
import { PageThumbnail } from '@/render/PageThumbnail';
import { CatalogCard } from '@/ui/CatalogCard';
import { IconButton } from '@/ui/IconButton';
import { RainbowTitle } from '@/ui/RainbowTitle';
import { Screen } from '@/ui/Screen';
import { colors, roundedFont } from '@/ui/tokens';

export default function PageSelection() {
  const { themeId } = useLocalSearchParams<{ themeId: string }>();
  const db = useSQLiteContext();
  const theme = getTheme(themeId);
  const pages = useMemo(() => listPages(themeId), [themeId]);
  const accent = theme?.color ?? colors.accent;
  const [progress, setProgress] = useState<Record<string, Artwork>>({});

  // Thumbnails show the child's unfinished work so they recognise "their" picture.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all(
        pages.map(async (p) => {
          const saved = await findInProgressColoring(db, p.id);
          return [p.id, { fills: saved?.fills ?? {}, strokes: saved?.strokes ?? [] }] as const;
        }),
      )
        .then((entries) => !cancelled && setProgress(Object.fromEntries(entries)))
        .catch((e: unknown) => console.warn('Could not load progress', e));
      return () => {
        cancelled = true;
      };
    }, [db, pages]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" accessibilityLabel="Back" onPress={() => router.dismissTo('/themes')} />
        <RainbowTitle title={theme?.title ?? ''} />
        <View style={styles.headerSpacer} />
      </View>
      {pages.length === 0 ? (
        // Stub: no bundled pages for this theme yet (artwork pipeline, Phase 3). Shown openly, never as a broken screen.
        <View style={styles.empty}>
          <CatalogCard label="No pictures yet" hideLabel accent={accent} onPress={() => router.dismissTo('/themes')} style={styles.card} />
          <Text style={styles.emptyText}>New pictures are coming soon</Text>
        </View>
      ) : (
        // Scrolls once a theme has more than two rows (Shapes has 30 pages).
        <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
          {pages.map((p) => (
            <CatalogCard
              key={p.id}
              label={p.title}
              hideLabel
              bleed
              accent={accent}
              onPress={() => router.push({ pathname: '/color/[pageId]', params: { pageId: p.id } })}
              style={styles.card}
            >
              <PageThumbnail page={p} fills={progress[p.id]?.fills} strokes={progress[p.id]?.strokes} fit="cover" style={styles.thumb} />
            </CatalogCard>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerSpacer: { width: 80 }, // mirrors the back button so the title stays centered
  scroll: { flex: 1 },
  grid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 32, alignContent: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 32 },
  card: { width: '29%', aspectRatio: 4 / 3 },
  thumb: { flex: 1, alignSelf: 'stretch' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingBottom: 48 },
  emptyText: { fontFamily: roundedFont, fontSize: 24, fontWeight: '800', color: colors.inkSoft },
});
