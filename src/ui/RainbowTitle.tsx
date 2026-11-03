import { StyleSheet, Text, View } from 'react-native';

import { colors, roundedFont } from './tokens';

const LETTER_COLORS = ['#EF4F4F', '#F7A531', '#F5C518', '#6CC04A', '#4AA3EE', '#9A6FE0', '#F2709C'];

/** Chunky multicolor heading with a white outline, as in the Sunny Meadow catalog. */
export function RainbowTitle({
  title,
  subtitle,
  big = false,
  subtitleFontSize,
}: {
  /** Omit to show only the subtitle. */
  title?: string;
  subtitle?: string;
  big?: boolean;
  subtitleFontSize?: number;
}) {
  let n = 0;
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel={title || subtitle}>
      {title ? (
        <Text style={[styles.title, big && styles.titleBig]} numberOfLines={1} adjustsFontSizeToFit>
          {[...title].map((ch, i) => (
            <Text key={i} style={{ color: ch === ' ' ? undefined : LETTER_COLORS[n++ % LETTER_COLORS.length] }}>
              {ch}
            </Text>
          ))}
        </Text>
      ) : null}
      {subtitle ? <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.subtitle, subtitleFontSize !== undefined && { fontSize: subtitleFontSize }]}>{subtitle}</Text> : null}
    </View>
  );
}

const outline = { textShadowColor: colors.bgCard, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 };

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  title: { fontFamily: roundedFont, fontSize: 56, fontWeight: '900', letterSpacing: 0.5, ...outline },
  titleBig: { fontSize: 88, textShadowRadius: 10 },
  subtitle: { fontFamily: roundedFont, fontSize: 22, fontWeight: '800', color: colors.ink, ...outline },
});
