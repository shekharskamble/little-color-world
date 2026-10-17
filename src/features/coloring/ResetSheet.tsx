import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { ColoringPage } from '@/content/schema/page';
import { PageThumbnail } from '@/render/PageThumbnail';
import { IconButton } from '@/ui/IconButton';
import { colors, radius, shadow } from '@/ui/tokens';

const HOLD_MS = 1500;
const BUTTON = 120;

type Props = { visible: boolean; page: ColoringPage; onConfirm: () => void; onCancel: () => void };

/**
 * Reset confirmation: the child must press and hold ✓ for 1.5 s (progress
 * fills the button). Releasing early cancels. Reset itself is also undoable.
 */
export function ResetSheet({ visible, page, onConfirm, onCancel }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(progress);
      progress.set(0);
    }
  }, [visible, progress]);

  const start = () => {
    progress.set(
      withTiming(1, { duration: HOLD_MS }, (finished) => {
        // Only a hold that runs to completion confirms; cancelAnimation passes finished=false.
        if (finished) scheduleOnRN(onConfirm);
      }),
    );
  };

  const stop = () => {
    cancelAnimation(progress);
    progress.set(withTiming(0, { duration: 200 }));
  };

  const fillStyle = useAnimatedStyle(() => ({ height: progress.get() * BUTTON }));

  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape']} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <PageThumbnail page={page} style={styles.preview} />
          <View style={styles.actions}>
            <IconButton glyph="✕" accessibilityLabel="Keep my picture" onPress={onCancel} diameter={96} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hold to clear the picture"
              onPressIn={start}
              onPressOut={stop}
              style={styles.hold}
            >
              <Animated.View style={[styles.holdFill, fillStyle]} />
              <Text style={styles.check}>✓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,27,46,0.35)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: colors.bgCard, borderRadius: radius.card, padding: 32, flexDirection: 'row', alignItems: 'center', gap: 40, ...shadow },
  preview: { width: 320, height: 240, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: colors.peach },
  actions: { alignItems: 'center', gap: 32 },
  hold: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    backgroundColor: '#D9F5E8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdFill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.confirm },
  check: { fontSize: 56, color: colors.ink, fontWeight: '800' },
});
