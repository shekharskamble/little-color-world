import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getTheme, listPages } from '@/content/registry';
import type { FillMap } from '@/engine/coloring/history';
import { findInProgressColoring } from '@/persistence/artworkRepository';
import { PageThumbnail } from '@/render/PageThumbnail';
import { BigCard } from '@/ui/BigCard';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/tokens';

export default function PageSelection() {
  const { themeId } = useLocalSearchParams<{ themeId: string }>();
  const db = useSQLiteContext();
  const theme = getTheme(themeId);
  const pages = useMemo(() => listPages(themeId), [themeId]);
  const [progress, setProgress] = useState<Record<string, FillMap>>({});

  // Thumbnails show the child's unfinished work so they recognise "their" picture.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all(pages.map(async (p) => [p.id, (await findInProgressColoring(db, p.id))?.fills ?? {}] as const))
        .then((entries) => !cancelled && setProgress(Object.fromEntries(entries)))
        .catch((e: unknown) => console.warn('Could not load progress', e));
      return () => {
        cancelled = true;
      };
    }, [db, pages]),
  );

  return (
    <Screen background={theme?.color ?? colors.bgApp}>
      <IconButton glyph="⬅️" accessibilityLabel="Back" onPress={() => router.back()} />
      {pages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyGlyph}>🔍</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {pages.map((p) => (
            <BigCard
              key={p.id}
              accessibilityLabel={p.title}
              onPress={() => router.push({ pathname: '/color/[pageId]', params: { pageId: p.id } })}
              style={styles.card}
            >
              <PageThumbnail page={p} fills={progress[p.id]} style={styles.thumb} />
            </BigCard>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignContent: 'center', justifyContent: 'center' },
  card: { width: '30%', aspectRatio: 4 / 3 },
  thumb: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyGlyph: { fontSize: 96 },
});
