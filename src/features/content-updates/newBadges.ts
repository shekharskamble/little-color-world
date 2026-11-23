import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, useSyncExternalStore } from 'react';

import { contentRevision, subscribeContent } from '../../content/registry';
import { loadNewBadges, type NewBadges } from '../../persistence/contentRepository';

export { newFirst } from './newFirst';

const NONE: NewBadges = { themes: new Map(), pages: new Set(), recent: new Map() };

/** Changes whenever downloaded content changes, so catalog screens re-read the registry. */
export function useContentRevision(): number {
  return useSyncExternalStore(subscribeContent, contentRevision);
}

/** The NEW badges, re-read each time the screen gains focus and whenever new content arrives. */
export function useNewBadges(): NewBadges {
  const db = useSQLiteContext();
  const revision = useContentRevision();
  const [badges, setBadges] = useState<NewBadges>(NONE);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadNewBadges(db)
        .then((b) => !cancelled && setBadges(b))
        .catch((e: unknown) => console.warn('Could not load NEW badges', e));
      return () => {
        cancelled = true;
      };
      // `revision` re-runs this when a pack installs while the screen is open.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, revision]),
  );
  return badges;
}
