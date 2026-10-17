import { useLocalSearchParams } from 'expo-router';

import { getPage } from '@/content/registry';
import { ColoringScreen } from '@/features/coloring/ColoringScreen';
import { ComingSoon } from '@/ui/ComingSoon';

export default function ColorRoute() {
  const { pageId } = useLocalSearchParams<{ pageId: string }>();
  const page = getPage(pageId);
  // Unknown or invalid page (e.g. a stale deep link): show a harmless dead end, never crash.
  if (!page) return <ComingSoon glyph="🔍" title="Picture not found" phase={1} />;
  return <ColoringScreen key={page.id} page={page} />;
}
