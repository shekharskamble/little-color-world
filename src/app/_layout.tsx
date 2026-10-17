import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { migrate } from '@/persistence/migrations';
import { colors } from '@/ui/tokens';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
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
