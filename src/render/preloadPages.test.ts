/** @jest-environment node */
import { bundledPageSources, listPages, listThemes, themeCover } from '@/content/registry';
import type { ColoringPage } from '@/content/schema/page';

import { preloadPages } from './preloadPages';
import { skiaPageFor } from './useSkiaPage';

// Skia is native; the preloader's job is only to decide what to build and when.
jest.mock('./useSkiaPage', () => ({ skiaPageFor: jest.fn() }));
const built = skiaPageFor as jest.MockedFunction<typeof skiaPageFor>;

beforeEach(() => {
  jest.useFakeTimers();
  built.mockReset();
});
afterEach(() => jest.useRealTimers());

const builtIds = () => built.mock.calls.map(([p]: [ColoringPage]) => p.id);

describe('preloadPages', () => {
  it('builds theme covers first, then every catalog page', () => {
    preloadPages();
    jest.runAllTimers();
    const covers = listThemes()
      .map(themeCover)
      .filter((p) => p !== undefined)
      .map((p) => p.id);
    expect(builtIds().slice(0, covers.length)).toEqual(covers);
    const catalog = new Set(listThemes().flatMap((t) => listPages(t.id).map((p) => p.id)));
    expect(new Set(builtIds())).toEqual(catalog);
    expect(catalog.size).toBeGreaterThan(0);
    expect(catalog.size).toBeLessThanOrEqual(Object.keys(bundledPageSources).length);
  });

  it('starts after launch and yields between slices', () => {
    // Each build takes 5 ms, so a slice fits two builds before it yields.
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    built.mockImplementation(() => {
      now += 5;
      return undefined as never;
    });
    preloadPages();
    expect(built).not.toHaveBeenCalled();
    jest.advanceTimersToNextTimer();
    expect(built).toHaveBeenCalledTimes(2);
    jest.advanceTimersToNextTimer();
    expect(built).toHaveBeenCalledTimes(4);
  });

  it('stops when asked', () => {
    const stop = preloadPages();
    stop();
    jest.runAllTimers();
    expect(built).not.toHaveBeenCalled();
  });
});
