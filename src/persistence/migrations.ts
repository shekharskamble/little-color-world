import type { SqlDatabase } from './sql';

export type Migration = { version: number; up: (db: SqlDatabase) => Promise<void> };

/** Append-only. Never edit a shipped migration; add a new one. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: (db) =>
      db.execAsync(`
        CREATE TABLE artwork (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('coloring', 'tracing', 'drawing')),
          page_id TEXT,
          page_version INTEGER,
          state_json TEXT NOT NULL,
          thumbnail_path TEXT,
          status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX artwork_page ON artwork (page_id, updated_at DESC);
        CREATE TABLE preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      `),
  },
  {
    // Downloaded content packs (docs/CONTENT_DELIVERY.md) and the NEW badges for what they added.
    version: 2,
    up: (db) =>
      db.execAsync(`
        CREATE TABLE installed_content (
          pack_id TEXT PRIMARY KEY NOT NULL,
          version INTEGER NOT NULL,
          path TEXT NOT NULL,
          installed_at INTEGER NOT NULL
        );
        CREATE TABLE new_page (
          page_id TEXT PRIMARY KEY NOT NULL,
          theme_id TEXT NOT NULL,
          added_at INTEGER NOT NULL,
          theme_seen_at INTEGER,
          page_seen_at INTEGER
        );
        CREATE INDEX new_page_theme ON new_page (theme_id);
      `),
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

/** Runs pending migrations, each in its own transaction, tracked by PRAGMA user_version. */
export async function migrate(db: SqlDatabase, migrations: readonly Migration[] = MIGRATIONS): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  if (current > (migrations[migrations.length - 1]?.version ?? 0)) {
    throw new Error(`Database schema v${current} is newer than this app supports`);
  }
  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}
