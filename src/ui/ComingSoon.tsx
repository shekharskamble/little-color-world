import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from './IconButton';
import { Screen } from './Screen';
import { colors } from './tokens';

/**
 * Explicit placeholder for screens scheduled in a later phase. It is
 * deliberately obvious so it is never mistaken for finished functionality.
 */
export function ComingSoon({ glyph, phase, title }: { glyph: string; phase: number; title: string }) {
  return (
    <Screen>
      <IconButton glyph="⬅️" accessibilityLabel="Back" onPress={() => router.back()} />
      <View style={styles.center}>
        <Text style={styles.glyph}>{glyph}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.caption}>Coming soon · Phase {phase}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  glyph: { fontSize: 120 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  caption: { fontSize: 18, color: colors.inkSoft },
});
