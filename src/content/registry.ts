import themesJson from '../../content/themes.json';
import { BUNDLED_PAGES } from './bundledPages';
import { Theme, type ColoringPage } from './schema/page';
import { validatePage } from './schema/validatePage';

/**
 * Bundled content registry. `BUNDLED_PAGES` is generated from content/pages
 * by `npm run lcw -- index` (run automatically by `page import`). Downloaded packs join this in Phase 5
 * (docs/CONTENT_DELIVERY.md). Pages are validated on first access; a page
 * that fails validation is excluded rather than crashing the app.
 */
const themes: Theme[] = Theme.array()
  .parse(themesJson)
  .sort((a, b) => a.order - b.order);

const pageCache = new Map<string, ColoringPage | null>();

/** Themes shown in the catalog; hidden ones are left out. */
export function listThemes(): Theme[] {
  return themes.filter((t) => !t.hidden);
}

/** The page shown on a theme's catalog card: its `cover`, else its first page. */
export function themeCover(theme: Theme): ColoringPage | undefined {
  return (theme.cover ? getPage(theme.cover) : null) ?? listPages(theme.id)[0];
}

export function getTheme(id: string): Theme | undefined {
  return themes.find((t) => t.id === id);
}

export function getPage(id: string): ColoringPage | null {
  if (pageCache.has(id)) return pageCache.get(id) ?? null;
  const raw = BUNDLED_PAGES[id];
  let page: ColoringPage | null = null;
  if (raw !== undefined) {
    const result = validatePage(raw);
    if (result.ok) page = result.page;
    else if (__DEV__) console.warn(`Invalid page ${id}`, result.issues);
  }
  pageCache.set(id, page);
  return page;
}

export function listPages(themeId: string): ColoringPage[] {
  return Object.keys(BUNDLED_PAGES)
    .map(getPage)
    .filter((p): p is ColoringPage => p !== null && p.themeId === themeId);
}

/** For tests: raw bundled sources. */
export const bundledPageSources: Readonly<Record<string, unknown>> = BUNDLED_PAGES;
