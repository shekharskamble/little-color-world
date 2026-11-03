import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { shade } from './shade';
import { ToyButton } from './ToyButton';
import { colors, radius } from './tokens';

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
  const lip = tint === colors.bgCard ? colors.sand : shade(tint, 0.2);
  return (
    <ToyButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      colors={{ face: tint, lip }}
      borderRadius={radius.card}
      lip={10}
      style={style}
    >
      {children ?? <Text style={styles.glyph}>{glyph}</Text>}
    </ToyButton>
  );
}

const styles = StyleSheet.create({
  glyph: { fontSize: 88 },
});
