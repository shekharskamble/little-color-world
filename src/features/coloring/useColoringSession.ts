import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState } from 'react-native';

import type { ColoringPage } from '@/content/schema/page';
import { createAutosaver } from '@/engine/autosave';
import { coloringReducer, initialColoringState, sanitizeFills, type FillMap } from '@/engine/coloring/history';
import { findInProgressColoring, newArtworkId, saveColoring } from '@/persistence/artworkRepository';

const AUTOSAVE_DELAY_MS = 1500;

/**
 * Coloring state for one page: restores unfinished artwork, applies edits via
 * the pure reducer, and autosaves (debounced, plus on blur/background/unmount).
 * `ready` is false until restore finishes; edits must wait for it so a restore
 * can never overwrite fresh taps.
 */
export function useColoringSession(page: ColoringPage) {
  const db = useSQLiteContext();
  const [state, dispatch] = useReducer(coloringReducer, initialColoringState);
  const [ready, setReady] = useState(false);
  // Identity for a new artwork; replaced by the restored one if it exists. No row
  // is written until the first real edit, so opening a page never creates clutter.
  const [artwork, setArtwork] = useState(() => ({ id: newArtworkId(), createdAt: Date.now() }));

  const fillable = useMemo(() => new Set(page.regions.filter((r) => !r.locked).map((r) => r.id)), [page]);

  useEffect(() => {
    let cancelled = false;
    findInProgressColoring(db, page.id)
      .then((saved) => {
        if (cancelled || !saved) return;
        setArtwork({ id: saved.id, createdAt: saved.createdAt });
        dispatch({ type: 'load', fills: sanitizeFills(saved.fills, fillable) });
      })
      .catch((e: unknown) => console.warn('Could not restore artwork', e))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [db, page.id, fillable]);

  const saver = useMemo(
    () =>
      createAutosaver<FillMap>(
        (fills) => saveColoring(db, { ...artwork, pageId: page.id, pageVersion: page.version, fills }),
        AUTOSAVE_DELAY_MS,
        (e) => console.warn('Autosave failed', e),
      ),
    // `artwork` only changes during restore, before editing is enabled.
    [db, page.id, page.version, artwork],
  );

  useEffect(() => {
    if (state.revision > 0) saver.schedule(state.fills);
  }, [saver, state.revision, state.fills]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void saver.flush();
    });
    return () => {
      sub.remove();
      void saver.flush();
    };
  }, [saver]);

  useFocusEffect(
    useCallback(
      () => () => {
        void saver.flush();
      },
      [saver],
    ),
  );

  return { state, dispatch, ready };
}
