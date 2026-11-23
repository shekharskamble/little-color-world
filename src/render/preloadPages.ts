import { listPages, listThemes, themeCover } from '@/content/registry';
import type { ColoringPage } from '@/content/schema/page';

import { skiaPageFor } from './useSkiaPage';

/** Work on the JS thread for at most this long before letting taps and animations through. */
const SLICE_MS = 8;

/**
 * Builds every page's Skia paths in the background after launch, so the first open of a theme (its thumbnails) and of
 * a picture does not stall (owner report 2026-11-03). Theme covers go first, then each theme's pages in catalog order.
 * Returns a function that stops it.
 */
export function preloadPages(): () => void {
  const themes = listThemes();
  return preloadPageList([
    ...themes.map(themeCover).filter((p): p is ColoringPage => p !== undefined),
    ...themes.flatMap((t) => listPages(t.id)),
  ]);
}

/**
 * Builds the given pages' Skia paths in short slices with a yield between them, so the app stays responsive while it
 * runs (also used for pictures that download while the app is open). Returns a function that stops it.
 */
export function preloadPageList(queue: readonly ColoringPage[]): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let next = 0;
  const step = () => {
    const start = Date.now();
    while (!stopped && next < queue.length && Date.now() - start < SLICE_MS) skiaPageFor(queue[next++]!);
    if (!stopped && next < queue.length) timer = setTimeout(step, 0);
    else if (__DEV__ && !stopped) console.log(`Preloaded ${queue.length} pages`);
  };
  timer = setTimeout(step, 0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
