import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { RainbowTitle } from '@/ui/RainbowTitle';
import { Screen } from '@/ui/Screen';
import { ToyButton } from '@/ui/ToyButton';
import { colors, roundedFont, tones } from '@/ui/tokens';

/**
 * Home is a single obvious action for now. The other activities (trace, free
 * drawing, creations, stickers), New Pictures and the Parents entry keep their
 * routes but are not linked until they are built (docs/ROADMAP.md).
 */
export default function Home() {
  return (
    <Screen>
      <View style={styles.center}>
        <RainbowTitle title="Little Color World" big />
        <ToyButton
          accessibilityLabel="Let's color"
          tone="green"
          borderRadius={999}
          lip={12}
          onPress={() => router.push('/themes')}
          style={styles.cta}
          contentStyle={styles.ctaFace}
        >
          <Icon name="palette" size={64} color={tones.green.icon} strokeWidth={4.5} />
          <Text style={styles.ctaText}>Let&apos;s Color</Text>
        </ToyButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 48, paddingBottom: 64 },
  cta: { height: 128, minWidth: 420 },
  ctaFace: { flexDirection: 'row', gap: 20, paddingHorizontal: 56 },
  ctaText: { fontFamily: roundedFont, fontSize: 44, fontWeight: '900', color: colors.bgCard, letterSpacing: 0.5 },
});
