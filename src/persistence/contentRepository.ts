import type { SqlDatabase } from './sql';

export type InstalledPackRow = { packId: string; version: number; path: string; installedAt: number };

/**
 * NEW badges: a theme shows NEW until it is opened after its new pictures arrived; a picture shows NEW until it is
 * opened. `themes` maps each badged theme to when its newest picture arrived (newest first in the picker). `recent`
 * holds every picture that arrived in the last RECENT_MS, badged or not: they stay at the front of their theme, so a
 * picture does not jump to the back the moment a child opens it.
 */
export type NewBadges = { themes: ReadonlyMap<string, number>; pages: ReadonlySet<string>; recent: ReadonlyMap<string, number> };

export const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

export async function listInstalledPacks(db: SqlDatabase): Promise<InstalledPackRow[]> {
  const rows = await db.getAllAsync<{ pack_id: string; version: number; path: string; installed_at: number }>(
    'SELECT pack_id, version, path, installed_at FROM installed_content ORDER BY installed_at',
  );
  return rows.map((r) => ({ packId: r.pack_id, version: r.version, path: r.path, installedAt: r.installed_at }));
}

/**
 * Records an installed (or upgraded) pack in one transaction. `pages` are every page the pack now holds; the ones the
 * app did not have before get a NEW badge, and pages a newer version dropped lose theirs.
 */
export async function recordInstall(
  db: SqlDatabase,
  pack: { packId: string; version: number; path: string; pages: readonly { id: string; themeId: string }[]; previousPageIds: readonly string[] },
  now = Date.now(),
): Promise<void> {
  const before = new Set(pack.previousPageIds);
  const after = new Set(pack.pages.map((p) => p.id));
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO installed_content (pack_id, version, path, installed_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(pack_id) DO UPDATE SET version = excluded.version, path = excluded.path, installed_at = excluded.installed_at`,
      pack.packId,
      pack.version,
      pack.path,
      now,
    );
    for (const p of pack.pages) {
      if (before.has(p.id)) continue;
      await db.runAsync('INSERT OR IGNORE INTO new_page (page_id, theme_id, added_at) VALUES (?, ?, ?)', p.id, p.themeId, now);
    }
    for (const id of before) if (!after.has(id)) await db.runAsync('DELETE FROM new_page WHERE page_id = ?', id);
  });
}

export async function removeInstalledPack(db: SqlDatabase, packId: string, pageIds: readonly string[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM installed_content WHERE pack_id = ?', packId);
    for (const id of pageIds) await db.runAsync('DELETE FROM new_page WHERE page_id = ?', id);
  });
}

export async function loadNewBadges(db: SqlDatabase, now = Date.now()): Promise<NewBadges> {
  const rows = await db.getAllAsync<{ page_id: string; theme_id: string; added_at: number; theme_seen_at: number | null; page_seen_at: number | null }>(
    'SELECT page_id, theme_id, added_at, theme_seen_at, page_seen_at FROM new_page WHERE theme_seen_at IS NULL OR page_seen_at IS NULL OR added_at > ?',
    now - RECENT_MS,
  );
  const themes = new Map<string, number>();
  const pages = new Set<string>();
  const recent = new Map<string, number>();
  for (const r of rows) {
    if (r.theme_seen_at === null) themes.set(r.theme_id, Math.max(themes.get(r.theme_id) ?? 0, r.added_at));
    if (r.page_seen_at === null) pages.add(r.page_id);
    if (r.page_seen_at === null || r.added_at > now - RECENT_MS) recent.set(r.page_id, r.added_at);
  }
  return { themes, pages, recent };
}

export async function markThemeSeen(db: SqlDatabase, themeId: string, now = Date.now()): Promise<void> {
  await db.runAsync('UPDATE new_page SET theme_seen_at = ? WHERE theme_id = ? AND theme_seen_at IS NULL', now, themeId);
}

export async function markPageSeen(db: SqlDatabase, pageId: string, now = Date.now()): Promise<void> {
  await db.runAsync('UPDATE new_page SET page_seen_at = ?, theme_seen_at = COALESCE(theme_seen_at, ?) WHERE page_id = ?', now, now, pageId);
}
