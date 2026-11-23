import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';
import { colors, roundedFont, shadow, tones } from './tokens';

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
  /** Shows a NEW badge on the top corner (pictures that just downloaded, docs/CONTENT_DELIVERY.md). */
  isNew?: boolean;
  /** Shows a green check sticker on the top corner (a finished tracing). */
  done?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PILL_HEIGHT = 46;

/**
 * Catalog tile (docs/UX.md, "Sunny Meadow"): a white card with a thick accent
 * border and a name pill sitting on the bottom edge. The picture carries the
 * meaning for children; the pill is a friendly caption for grown-ups.
 */
export function CatalogCard({ label, hideLabel = false, bleed = false, accent, onPress, children, isNew = false, done = false, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isNew ? `${label}, new` : done ? `${label}, done` : label}
      onPress={onPress}
      style={[!hideLabel && styles.outer, style]}
    >
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
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
          {done && !isNew && (
            <View style={styles.doneBadge}>
              <Icon name="check" size={30} color={colors.bgCard} strokeWidth={6} />
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
  // Sits on the top-right corner, tilted like a sticker, so it reads as "something special" without words.
  newBadge: {
    position: 'absolute',
    top: -14,
    right: -14,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.bgCard,
    backgroundColor: tones.pink.face,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
    ...shadow,
  },
  doneBadge: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: colors.bgCard,
    backgroundColor: tones.green.face,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  newText: { fontFamily: roundedFont, fontSize: 18, fontWeight: '900', color: colors.bgCard, letterSpacing: 1 },
});
