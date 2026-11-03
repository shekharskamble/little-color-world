import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { themeCover } from '@/content/registry';
import type { Theme } from '@/content/schema/page';
import type { Artwork } from '@/engine/coloring/history';
import { findInProgressColoring } from '@/persistence/artworkRepository';
import { PageThumbnail } from '@/render/PageThumbnail';
import { CatalogCard } from '@/ui/CatalogCard';
import { IconButton } from '@/ui/IconButton';

import { CARDS_PER_PAGE, CATALOG_COLUMNS, CATALOG_ROWS, chunk, clampPage } from './paging';

const COLUMN_GAP = 36;
const ROW_GAP = 16;
/** Card width / height (picture box plus the pill's lower half). */
const CARD_ASPECT = 1.5;
/** CatalogCard's box includes room for the pill; it pokes out a few points more. */
const PILL_OVERHANG = 4;

/**
 * Horizontally paged catalog: 3×3 cards per page, swipe or tap the big arrows. Arrows dim (rather than disappear) at
 * either end so the layout never jumps.
 */
export function CatalogPager({ themes }: { themes: readonly Theme[] }) {
  const pages = useMemo(() => chunk(themes, CARDS_PER_PAGE), [themes]);
  const scroller = useRef<ScrollViewInstance>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState(0);
  const goTo = (target: number) => {
    const next = clampPage(target, pages.length);
    setPage(next);
    scroller.current?.scrollTo({ x: next * viewport.width, animated: true });
  };
  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewport.width > 0) setPage(clampPage(Math.round(e.nativeEvent.contentOffset.x / viewport.width), pages.length));
  };
  const onLayout = (e: LayoutChangeEvent) => setViewport({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  // The biggest card that fits three across and three down.
  const byWidth = (viewport.width - COLUMN_GAP * (CATALOG_COLUMNS - 1)) / CATALOG_COLUMNS;
  const byHeight = ((viewport.height - ROW_GAP * (CATALOG_ROWS - 1)) / CATALOG_ROWS - PILL_OVERHANG) * CARD_ASPECT;
  const cardWidth = Math.max(0, Math.min(byWidth, byHeight));
  const gridWidth = cardWidth * CATALOG_COLUMNS + COLUMN_GAP * (CATALOG_COLUMNS - 1);

  return (
    <View style={styles.row}>
      <IconButton icon="back" tone="orange" accessibilityLabel="Previous categories" disabled={page === 0} onPress={() => goTo(page - 1)} />
      <View style={styles.viewport} onLayout={onLayout}>
        {viewport.width > 0 && (
          <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onSwipeEnd}>
            {pages.map((group, i) => (
              <View key={i} style={[styles.page, viewport]}>
                <View style={[styles.grid, { width: gridWidth }]}>
                  {group.map((t) => (
                    <ThemeCard key={t.id} theme={t} width={cardWidth} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <IconButton icon="next" tone="orange" accessibilityLabel="More categories" disabled={page >= pages.length - 1} onPress={() => goTo(page + 1)} />
    </View>
  );
}

function ThemeCard({ theme, width }: { theme: Theme; width: number }) {
  const cover = useMemo(() => themeCover(theme), [theme]);
  const db = useSQLiteContext();
  const [progress, setProgress] = useState<Artwork | null>(null);

  // The cover shows the child's unfinished work on that picture, like the page grid does.
  useFocusEffect(
    useCallback(() => {
      if (!cover) return;
      let cancelled = false;
      findInProgressColoring(db, cover.id)
        .then((saved) => !cancelled && setProgress(saved ? { fills: saved.fills, strokes: saved.strokes } : null))
        .catch((e: unknown) => console.warn('Could not load cover progress', e));
      return () => {
        cancelled = true;
      };
    }, [db, cover]),
  );

  return (
    <CatalogCard
      label={theme.title}
      accent={theme.color}
      onPress={() => router.push({ pathname: '/themes/[themeId]', params: { themeId: theme.id } })}
      style={{ width, aspectRatio: CARD_ASPECT }}
    >
      {cover ? <PageThumbnail page={cover} fills={progress?.fills} strokes={progress?.strokes} fit="content" style={styles.thumb} /> : undefined}
    </CatalogCard>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 24 },
  viewport: { flex: 1, alignSelf: 'stretch' },
  page: { alignItems: 'center', justifyContent: 'center' },
  // Left-aligned so a part-filled row keeps the grid columns.
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: COLUMN_GAP, rowGap: ROW_GAP, justifyContent: 'flex-start' },
  thumb: { flex: 1, alignSelf: 'stretch' },
});
