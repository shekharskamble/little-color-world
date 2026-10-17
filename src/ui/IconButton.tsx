import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, size } from './tokens';

type Props = {
  /** Interim glyph until illustrated icons land (docs/PROGRESS.md). */
  glyph: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  diameter?: number;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ glyph, accessibilityLabel, onPress, disabled = false, diameter = 72, style }: Props) {
  const d = Math.max(diameter, size.touchMin);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: d, height: d },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: d * 0.45 }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  glyph: { color: colors.ink },
  disabled: { opacity: 0.35 },
  pressed: { transform: [{ scale: 0.92 }] },
});
