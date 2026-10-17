import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './tokens';

export function Screen({ children, background = colors.bgApp }: { children: ReactNode; background?: string }) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, padding: 24 },
});
