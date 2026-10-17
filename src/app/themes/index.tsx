import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { listThemes } from '@/content/registry';
import { BigCard } from '@/ui/BigCard';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';

export default function ThemeSelection() {
  return (
    <Screen>
      <IconButton glyph="⬅️" accessibilityLabel="Back" onPress={() => router.back()} />
      <View style={styles.grid}>
        {listThemes().map((t) => (
          <BigCard
            key={t.id}
            accessibilityLabel={t.title}
            glyph={t.emoji}
            tint={t.color}
            onPress={() => router.push({ pathname: '/themes/[themeId]', params: { themeId: t.id } })}
            style={styles.card}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignContent: 'center', justifyContent: 'center' },
  card: { width: '30%', aspectRatio: 1.35 },
});
