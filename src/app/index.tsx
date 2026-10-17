import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BigCard } from '@/ui/BigCard';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/tokens';

const ACTIVITIES: { label: string; glyph: string; tint: string; href: Href }[] = [
  { label: 'Color', glyph: '🎨', tint: colors.mint, href: '/themes' },
  { label: 'Trace and color', glyph: '✏️', tint: colors.sky, href: '/trace' },
  { label: 'Free drawing', glyph: '🖍️', tint: colors.peach, href: '/draw' },
  { label: 'My creations', glyph: '🖼️', tint: colors.lilac, href: '/creations' },
  { label: 'Stickers', glyph: '⭐', tint: colors.lemon, href: '/stickers' },
  { label: 'New pictures', glyph: '🎁', tint: colors.mint, href: '/new-pictures' },
];

export default function Home() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.logo} accessibilityRole="header">
          Little Color World
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Parents area" onPress={() => router.push('/parents')} style={styles.parents}>
          <Text style={styles.parentsText}>Parents</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {ACTIVITIES.map((a) => (
          <BigCard key={a.label} accessibilityLabel={a.label} glyph={a.glyph} tint={a.tint} onPress={() => router.push(a.href)} style={styles.card} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  logo: { fontSize: 40, fontWeight: '800', color: colors.ink },
  // Deliberately small and low-contrast: an adult entry point, not a child target.
  parents: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(30,27,46,0.06)' },
  parentsText: { fontSize: 15, color: colors.inkSoft },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignContent: 'center', justifyContent: 'center' },
  card: { width: '30%', aspectRatio: 1.35 },
});
