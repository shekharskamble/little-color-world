import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SunnyBackdrop, type Scenery } from './SunnyBackdrop';

/**
 * Every screen sits on the Sunny Meadow backdrop; `sky` is the quieter variant for the canvas. `overlay` is drawn
 * edge to edge above everything, ignoring the safe-area padding (celebration stars).
 */
export function Screen({ children, scenery = 'full', overlay }: { children: ReactNode; scenery?: Scenery; overlay?: ReactNode }) {
  return (
    <View style={styles.root}>
      <SunnyBackdrop variant={scenery} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.inner}>{children}</View>
      </SafeAreaView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, padding: 24 },
});
