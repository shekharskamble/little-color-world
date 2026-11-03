import type { SkImage } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type SaveResult = 'saved' | 'denied' | 'failed';

/**
 * Saves a finished picture to Photos. Asks for add-only access (iOS shows its prompt once; the app can never read the
 * library), writes a PNG to the cache, hands it to Photos, then removes the cache copy. Nothing leaves the device.
 */
export async function savePictureToPhotos(image: SkImage): Promise<SaveResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  const file = new File(Paths.cache, `little-color-world-${Date.now()}.png`);
  try {
    file.create();
    await file.write(image.encodeToBytes());
    await MediaLibrary.Asset.create(file.uri);
    return 'saved';
  } catch {
    return 'failed';
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // A leftover cache file is harmless; iOS clears the cache when space is needed.
    }
  }
}
