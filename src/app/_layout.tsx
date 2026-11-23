import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { loadInstalledContent, startContentUpdateCheck } from '@/features/content-updates/contentUpdates';
import { migrate } from '@/persistence/migrations';
import { preloadPageList, preloadPages } from '@/render/preloadPages';
import { RotateHint } from '@/ui/RotateHint';
import { colors } from '@/ui/tokens';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  // Landscape only. app.json already locks native builds; this also covers Expo Go and any runtime change.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {
      // Expo Go on iPad can refuse the lock while multitasking is allowed. The native build is locked by config.
    });
  }, []);
  // iPadOS 26 can still show the app upright (UIRequiresFullScreen is deprecated), so cover it with a "turn me sideways"
  // picture. The app keeps running underneath, so nothing is lost.
  const { width, height } = useWindowDimensions();
  const portrait = height > width;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <StatusBar hidden />
      <Suspense fallback={<View style={{ flex: 1, backgroundColor: colors.bgApp }} />}>
        <SQLiteProvider
          databaseName="little-color-world.db"
          onInit={async (db) => {
            await migrate(db);
            // Pictures downloaded on earlier launches. A failure here must not stop the app: bundled content still shows.
            await loadInstalledContent(db).catch((e: unknown) => console.warn('Could not load downloaded pictures', e));
          }}
          useSuspense
        >
          <ContentUpdateCheck />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: colors.bgApp },
              // iPadOS 26 fades scroll views' edges where content runs under them; on the theme picker's pages it showed
              // as a shadow over the meadow backdrop (owner report 2026-11-13). The app has no bars for it to serve.
              scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
            }}
          />
        </SQLiteProvider>
      </Suspense>
      {portrait && <RotateHint />}
    </GestureHandlerRootView>
  );
}

/**
 * Runs once the database is ready (downloaded pictures are in the registry by then). Builds every picture's paths in
 * the background so the first open of a theme is quick, then starts this launch's check for new pictures
 * (docs/CONTENT_DELIVERY.md) and preloads any that arrive.
 */
function ContentUpdateCheck() {
  const db = useSQLiteContext();
  useEffect(() => {
    const stop = preloadPages();
    startContentUpdateCheck(db, (pack) => preloadPageList(pack.pages));
    return stop;
  }, [db]);
  return null;
}
