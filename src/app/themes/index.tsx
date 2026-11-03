import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { listThemes } from '@/content/registry';
import { CatalogPager } from '@/features/catalog/CatalogPager';
import { IconButton } from '@/ui/IconButton';
import { RainbowTitle } from '@/ui/RainbowTitle';
import { Screen } from '@/ui/Screen';

export default function ThemeSelection() {
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" accessibilityLabel="Back" onPress={() => router.dismissTo('/')} />
        <RainbowTitle subtitle="Pick something fun to color" subtitleFontSize={34} />
        <View style={styles.headerSpacer} />
      </View>
      <CatalogPager themes={listThemes()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 80 }, // mirrors the back button so the title stays centered
});
