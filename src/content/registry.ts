import remoteJson from '../../content/remote.json';
import themesJson from '../../content/themes.json';
import { BUNDLED_PAGES } from './bundledPages';
import { ColoringPage, Theme } from './schema/page';

/**
 * Content registry: bundled pages plus downloaded packs (docs/CONTENT_DELIVERY.md). `BUNDLED_PAGES` is generated from
 * content/pages by `npm run lcw -- index` (run automatically by `page import`). Pages are schema-checked on first
 * access; a page that fails is excluded rather than crashing the app.
 *
 * Bundled pages get the schema check only (it also applies defaults). The full geometry check (`validatePage`) took
 * about 1.5 s for all pages on a Mac, far more on an iPad, the first time a theme opened (owner report 2026-11-03).
 * It already runs on every bundled page at import (`lcw page validate`) and in `npm test` (validatePage.test.ts), so a
 * bundled page that fails it never ships. Downloaded pages get the full check before they are installed.
 *
 * Themes listed in content/remote.json ship over the CDN only: their entry stays in themes.json (the pack builder
 * reads it) but the bundled catalog leaves them out until a pack brings them.
 */
const remoteThemeIds = new Set<string>(remoteJson.themes);

const bundledThemes: Theme[] = Theme.array()
  .parse(themesJson)
  .filter((t) => !remoteThemeIds.has(t.id));

/** A downloaded pack whose pages already passed `validatePage`. */
export type InstalledPack = { id: string; version: number; theme?: Theme; pages: readonly ColoringPage[] };

let installed: readonly InstalledPack[] = [];
let installedPages = new Map<string, ColoringPage>();
let themes: Theme[] = sortThemes(bundledThemes);
let revision = 0;
const listeners = new Set<() => void>();
const pageCache = new Map<string, ColoringPage | null>();

function sortThemes(list: Theme[]): Theme[] {
  return [...list].sort((a, b) => a.order - b.order);
}

/** Replaces the downloaded packs (at launch, and after each install) and tells subscribed screens. */
export function setInstalledPacks(packs: readonly InstalledPack[]): void {
  installed = packs;
  installedPages = new Map(packs.flatMap((p) => p.pages.map((page) => [page.id, page] as const)));
  themes = sortThemes([...bundledThemes, ...packs.flatMap((p) => (p.theme ? [p.theme] : []))]);
  for (const id of [...pageCache.keys()]) if (!(id in BUNDLED_PAGES)) pageCache.delete(id);
  revision++;
  for (const l of listeners) l();
}

export function installedPacks(): readonly InstalledPack[] {
  return installed;
}

/** For `useSyncExternalStore`: changes whenever downloaded content changes. */
export function subscribeContent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function contentRevision(): number {
  return revision;
}

/** Ids already taken (checked before a pack installs); `exceptPack` leaves out the pack being upgraded. */
export function existingContent(exceptPack?: string): { themeIds: Set<string>; pageIds: Set<string> } {
  const others = installed.filter((p) => p.id !== exceptPack);
  return {
    themeIds: new Set([...bundledThemes.map((t) => t.id), ...others.flatMap((p) => (p.theme ? [p.theme.id] : []))]),
    pageIds: new Set([...Object.keys(BUNDLED_PAGES), ...others.flatMap((p) => p.pages.map((page) => page.id))]),
  };
}

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
  const downloaded = installedPages.get(id);
  if (downloaded) return downloaded;
  if (pageCache.has(id)) return pageCache.get(id) ?? null;
  const raw = BUNDLED_PAGES[id];
  let page: ColoringPage | null = null;
  if (raw !== undefined) {
    const result = ColoringPage.safeParse(raw);
    if (result.success) page = result.data;
    else if (__DEV__) console.warn(`Invalid page ${id}`, result.error.issues);
  }
  pageCache.set(id, page);
  return page;
}

/** A theme's pages: bundled first, then downloaded ones in pack order. */
export function listPages(themeId: string): ColoringPage[] {
  return [...Object.keys(BUNDLED_PAGES), ...installedPages.keys()]
    .map(getPage)
    .filter((p): p is ColoringPage => p !== null && p.themeId === themeId);
}

/** For tests: raw bundled sources. */
export const bundledPageSources: Readonly<Record<string, unknown>> = BUNDLED_PAGES;
