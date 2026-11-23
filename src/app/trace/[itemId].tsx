import { useLocalSearchParams } from 'expo-router';

import { getPage } from '@/content/registry';
import { getTrace } from '@/content/traces';
import { TraceScreen } from '@/features/tracing/TraceScreen';
import { ComingSoon } from '@/ui/ComingSoon';

export default function TraceRoute() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const item = getTrace(itemId);
  const page = item && getPage(item.colorPageId);
  // Unknown item (e.g. a stale deep link): a harmless dead end, never a crash.
  if (!item || !page) return <ComingSoon glyph="🔍" title="Picture not found" phase={4} />;
  return <TraceScreen key={item.id} item={item} page={page} />;
}
