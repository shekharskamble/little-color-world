import { Modal, StyleSheet, View } from 'react-native';

import type { ColoringPage } from '@/content/schema/page';
import { PageThumbnail } from '@/render/PageThumbnail';
import { IconButton } from '@/ui/IconButton';
import { colors, radius, shadow } from '@/ui/tokens';

type Props = { visible: boolean; page: ColoringPage; onConfirm: () => void; onCancel: () => void };

/**
 * Reset confirmation: a picture of the blank page, ✕ to keep colouring and a big green ✓ that clears on a single tap
 * (owner decision 2026-11-02; it was press-and-hold). Reset is undoable, so an accidental tap is recoverable.
 */
export function ResetSheet({ visible, page, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape']} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <PageThumbnail page={page} style={styles.preview} />
          <View style={styles.actions}>
            <IconButton icon="close" accessibilityLabel="Keep my picture" onPress={onCancel} diameter={96} />
            <IconButton icon="check" tone="green" accessibilityLabel="Clear the picture" onPress={onConfirm} diameter={120} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,39,51,0.35)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: colors.bgCard, borderRadius: radius.card, padding: 32, flexDirection: 'row', alignItems: 'center', gap: 40, ...shadow },
  preview: { width: 320, height: 240, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: colors.sand },
  actions: { alignItems: 'center', gap: 32 },
});
