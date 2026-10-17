import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from './tokens';

type Props = {
  accessibilityLabel: string;
  onPress: () => void;
  tint?: string;
  /** Large interim glyph; pass `children` instead for a custom illustration. */
  glyph?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BigCard({ accessibilityLabel, onPress, tint = colors.bgCard, glyph, children, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: tint }, pressed && styles.pressed, style]}
    >
      {children ?? (
        <View style={styles.center}>
          <Text style={styles.glyph}>{glyph}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, overflow: 'hidden', ...shadow },
  pressed: { transform: [{ scale: 0.96 }] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 88 },
});
