import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';
import { colors, roundedFont, shadow } from './tokens';

type Props = {
  label: string;
  /** Hide the name pill (e.g. page tiles); `label` still names the card for VoiceOver. */
  hideLabel?: boolean;
  /** The picture fills the card up to its border, with no white margin (page tiles). */
  bleed?: boolean;
  accent: string;
  onPress: () => void;
  /** The picture; without it the card shows an empty image slot (artwork pending). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const PILL_HEIGHT = 46;

/**
 * Catalog tile (docs/UX.md, "Sunny Meadow"): a white card with a thick accent
 * border and a name pill sitting on the bottom edge. The picture carries the
 * meaning for children; the pill is a friendly caption for grown-ups.
 */
export function CatalogCard({ label, hideLabel = false, bleed = false, accent, onPress, children, style }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[!hideLabel && styles.outer, style]}>
      {({ pressed }) => (
        <View
          style={[styles.card, hideLabel && styles.cardNoPill, bleed && styles.cardBleed, { borderColor: accent, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <View style={[styles.picture, bleed && styles.pictureBleed]}>
            {children ?? (
              <View style={[styles.emptySlot, { borderColor: accent }]}>
                <Icon name="gallery" size={56} color={accent} strokeWidth={4} />
              </View>
            )}
          </View>
          {!hideLabel && (
            <View style={[styles.pill, { backgroundColor: accent }]}>
              <Text style={styles.pillText} numberOfLines={1}>
                {label}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { paddingBottom: PILL_HEIGHT / 2 },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 6,
    borderRadius: 28,
    padding: 14,
    paddingBottom: PILL_HEIGHT / 2 + 6,
    ...shadow,
  },
  cardNoPill: { paddingBottom: 14 },
  cardBleed: { padding: 0, paddingBottom: 0 },
  picture: { flex: 1, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  // Rounds with the card's inner edge (28 radius minus the 6 pt border).
  pictureBleed: { borderRadius: 22 },
  emptySlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 3,
    borderStyle: 'dashed',
    opacity: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -PILL_HEIGHT / 2 - 3,
    height: PILL_HEIGHT,
    minWidth: '52%',
    paddingHorizontal: 22,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 4,
    borderColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: roundedFont, fontSize: 22, fontWeight: '800', color: colors.bgCard, letterSpacing: 0.3 },
});
