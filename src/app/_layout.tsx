import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { migrate } from '@/persistence/migrations';
import { colors } from '@/ui/tokens';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  // Landscape only. app.json already locks native builds; this also covers Expo Go and any runtime change.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {
      // Expo Go on iPad can refuse the lock while multitasking is allowed. The native build is locked by config.
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <StatusBar hidden />
      <Suspense fallback={<View style={{ flex: 1, backgroundColor: colors.bgApp }} />}>
        <SQLiteProvider
          databaseName="little-color-world.db"
          onInit={async (db) => {
            await migrate(db);
          }}
          useSuspense
        >
          <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bgApp } }} />
        </SQLiteProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}
