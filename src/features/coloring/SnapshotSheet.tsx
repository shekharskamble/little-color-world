import { Canvas, Image, drawAsImage, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useReducedMotion } from 'react-native-reanimated';

import type { ColoringPage } from '@/content/schema/page';
import type { FillMap, Stroke } from '@/engine/coloring/history';
import { PageArtwork } from '@/render/PageArtwork';
import { useSkiaPage } from '@/render/useSkiaPage';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { colors, radius, shadow } from '@/ui/tokens';

import { CelebrationLayer, type Celebration } from './Celebration';
import { showerStars } from './celebrationStars';
import { savePictureToPhotos } from './savePicture';

/** Saved pictures are twice the page size (2048 × 1536 for a standard page): sharp when printed or zoomed. */
const EXPORT_SCALE = 2;
const PREVIEW_W = 560;
const SAVED_CLOSE_MS = 2000;

type Status = 'ready' | 'saving' | 'saved' | 'denied' | 'failed';

type Props = { page: ColoringPage; fills: FillMap; strokes: readonly Stroke[]; onClose: () => void };

/**
 * The camera's "photo": the child's picture shown big, with ✕ to go back and a big ✓ to save it to Photos. Saving
 * is the child's choice with no grown-up gate (owner decision D10, docs/ROADMAP.md); iOS asks once for add-only access.
 * Mount it only while it is open, so every photo starts fresh.
 */
export function SnapshotSheet({ page, fills, strokes, onClose }: Props) {
  const skia = useSkiaPage(page);
  const reduceMotion = useReducedMotion();
  const [image, setImage] = useState<SkImage | null>(null);
  const [status, setStatus] = useState<Status>('ready');
  const [stars, setStars] = useState<Celebration[]>([]);
  const [, , pw, ph] = page.viewBox;
  const previewH = (PREVIEW_W * ph) / pw;

  // The picture is captured when the sheet opens; the page cannot change underneath a modal.
  useEffect(() => {
    let live = true;
    void drawAsImage(
      <PageArtwork page={page} skia={skia} fills={fills} strokes={strokes} transform={{ scale: EXPORT_SCALE, tx: 0, ty: 0 }} />,
      { width: pw * EXPORT_SCALE, height: ph * EXPORT_SCALE },
    ).then((img) => {
      if (live) setImage(img);
      else img?.dispose();
    });
    return () => {
      live = false;
    };
  }, [page, skia, fills, strokes, pw, ph]);

  useEffect(() => {
    if (status !== 'saved') return;
    const t = setTimeout(onClose, SAVED_CLOSE_MS);
    return () => clearTimeout(t);
  }, [status, onClose]);

  // Back from Settings with Photos turned on (when iOS has not restarted the app): show ✓ again.
  useEffect(() => {
    if (status !== 'denied') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void MediaLibrary.getPermissionsAsync(true).then((p) => {
        if (p.granted) setStatus('ready');
      });
    });
    return () => sub.remove();
  }, [status]);

  const save = async () => {
    if (!image || status === 'saving') return;
    setStatus('saving');
    const result = await savePictureToPhotos(image);
    setStatus(result);
    if (result === 'saved') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStars([{ key: Date.now(), stars: showerStars(PREVIEW_W, previewH, reduceMotion), duration: 1800 }]);
    }
  };
  const doneStars = useCallback(() => setStars([]), []);

  return (
    <Modal visible transparent animationType="fade" supportedOrientations={['landscape']} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View>
            <View style={[styles.photo, { width: PREVIEW_W, height: previewH }]}>
              {image && (
                <Canvas style={{ width: PREVIEW_W, height: previewH }} accessibilityLabel={`Photo of ${page.title}`}>
                  <Image image={image} x={0} y={0} width={PREVIEW_W} height={previewH} fit="contain" />
                </Canvas>
              )}
              {status === 'saved' && (
                <View style={styles.savedBadge} accessibilityLabel="Saved to Photos">
                  <Icon name="check" size={84} color="#FFFFFF" strokeWidth={7} />
                </View>
              )}
              <CelebrationLayer items={stars} onDone={doneStars} />
            </View>
            {/* For the grown-up: a child can't fix these, so they are small words, not a child-facing cue. */}
            {/* iOS asks only once; after "Don't Allow" only Settings can turn saving back on, so link straight there. */}
            {status === 'denied' && (
              <View style={styles.denied}>
                <Text style={styles.note}>Saving to Photos is turned off. A grown-up can turn on Photos for Little Color World in Settings.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Settings"
                  onPress={() => void Linking.openSettings().catch(() => {})}
                  style={styles.settings}
                >
                  <Text style={styles.settingsText}>Open Settings</Text>
                </Pressable>
              </View>
            )}
            {status === 'failed' && <Text style={styles.note}>That picture didn&apos;t save. Tap the tick to try again.</Text>}
          </View>
          <View style={styles.actions}>
            <IconButton icon="close" accessibilityLabel="Back to colouring" onPress={onClose} diameter={96} />
            {status !== 'denied' && (
              <IconButton
                icon="check"
                tone="green"
                accessibilityLabel="Save my picture"
                onPress={() => void save()}
                disabled={!image || status === 'saving' || status === 'saved'}
                diameter={120}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,39,51,0.45)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: colors.bgCard, borderRadius: radius.card, padding: 28, flexDirection: 'row', alignItems: 'center', gap: 36, ...shadow },
  // A thick white frame with a sand lip, like a printed photo.
  photo: { borderRadius: 18, overflow: 'hidden', borderWidth: 4, borderBottomWidth: 10, borderColor: colors.sand, backgroundColor: colors.lemon, boxSizing: 'content-box' },
  savedBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -70,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.confirm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: 12, maxWidth: PREVIEW_W, fontSize: 15, color: colors.inkSoft },
  denied: { maxWidth: PREVIEW_W, gap: 10, alignItems: 'flex-start' },
  // Grown-up control: plain and small on purpose, so it does not look like one of the child's toy buttons.
  settings: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: colors.sand },
  settingsText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  actions: { alignItems: 'center', gap: 32 },
});
