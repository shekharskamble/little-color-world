import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ColoringPage } from '@/content/schema/page';
import { canRedo, canUndo } from '@/engine/coloring/history';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { colors, radius, shadow } from '@/ui/tokens';

import { ColoringCanvas } from './ColoringCanvas';
import { Palette, type Tool } from './Palette';
import { TODDLER_PALETTE } from './swatches';
import { ResetSheet } from './ResetSheet';
import { useColoringSession } from './useColoringSession';

export function ColoringScreen({ page }: { page: ColoringPage }) {
  const { state, dispatch, ready } = useColoringSession(page);
  const [tool, setTool] = useState<Tool>({ kind: 'fill', swatch: TODDLER_PALETTE[0]! });
  const [confirmingReset, setConfirmingReset] = useState(false);

  const onRegionTap = (regionId: string) => {
    dispatch(tool.kind === 'eraser' ? { type: 'erase', regionId } : { type: 'fill', regionId, fill: tool.swatch.fill });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); // most iPads have no haptics
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton glyph="⬅️" accessibilityLabel="Back" onPress={() => router.back()} />
        <View style={styles.topActions}>
          <IconButton glyph="↩️" accessibilityLabel="Undo" disabled={!canUndo(state)} onPress={() => dispatch({ type: 'undo' })} />
          <IconButton glyph="↪️" accessibilityLabel="Redo" disabled={!canRedo(state)} onPress={() => dispatch({ type: 'redo' })} />
          <IconButton
            glyph="🗑️"
            accessibilityLabel="Start over"
            disabled={Object.keys(state.fills).length === 0}
            onPress={() => setConfirmingReset(true)}
          />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.canvasCard}>
          <ColoringCanvas page={page} fills={state.fills} enabled={ready} onRegionTap={onRegionTap} />
        </View>
        <Palette swatches={TODDLER_PALETTE} tool={tool} onSelect={setTool} />
      </View>
      <ResetSheet
        visible={confirmingReset}
        page={page}
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          dispatch({ type: 'reset' });
          setConfirmingReset(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  topActions: { flexDirection: 'row', gap: 20 },
  body: { flex: 1, flexDirection: 'row', gap: 20 },
  canvasCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.card, overflow: 'hidden', ...shadow },
});
