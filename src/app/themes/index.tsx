import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { listThemes } from '@/content/registry';
import { CatalogPager } from '@/features/catalog/CatalogPager';
import { newFirst, useContentRevision, useNewBadges } from '@/features/content-updates/newBadges';
import { IconButton } from '@/ui/IconButton';
import { RainbowTitle } from '@/ui/RainbowTitle';
import { Screen } from '@/ui/Screen';

export default function ThemeSelection() {
  const revision = useContentRevision();
  const badges = useNewBadges();
  // Themes with newly downloaded pictures come first, with a NEW badge (docs/CONTENT_DELIVERY.md).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `revision` re-reads the registry after a download
  const themes = useMemo(() => newFirst(listThemes(), (t) => t.id, badges.themes), [badges, revision]);
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" accessibilityLabel="Back" onPress={() => router.dismissTo('/')} />
        <RainbowTitle subtitle="Pick something fun to color" subtitleFontSize={34} />
        <View style={styles.headerSpacer} />
      </View>
      <CatalogPager themes={themes} newThemeIds={badges.themes} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 80 }, // mirrors the back button so the title stays centered
});
