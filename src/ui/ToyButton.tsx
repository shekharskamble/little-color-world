import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type Insets, type StyleProp, type ViewStyle } from 'react-native';

import { size, tones, type Tone } from './tokens';

type Props = {
  accessibilityLabel: string;
  onPress: () => void;
  tone?: Tone;
  /** Custom face/lip colors (e.g. a theme tint); overrides `tone`. */
  colors?: { face: string; lip: string };
  borderRadius?: number;
  lip?: number;
  disabled?: boolean;
  hitSlop?: number | Insets;
  /** Outer size and placement (width, height, flex). */
  style?: StyleProp<ViewStyle>;
  /** Layout of the face's content. */
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Toy Box button: a colored face sitting on a darker lip. Pressing pushes the
 * face down onto the lip, so it reads as a physical, pressable toy.
 */
export function ToyButton({
  accessibilityLabel,
  onPress,
  tone = 'white',
  colors,
  borderRadius = 999,
  lip = size.lip,
  disabled = false,
  hitSlop,
  style,
  contentStyle,
  children,
}: Props) {
  const t = colors ?? tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      style={[{ paddingBottom: lip }, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.lip, { top: lip, borderRadius, backgroundColor: t.lip }]} />
          <View
            style={[
              styles.face,
              { borderRadius, backgroundColor: t.face, transform: [{ translateY: pressed ? lip * 0.75 : 0 }] },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  disabled: { opacity: 0.4 },
});
