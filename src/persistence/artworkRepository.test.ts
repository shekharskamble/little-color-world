/** @jest-environment node */
import { openTestDatabase } from '../test-utils/nodeSqlite';
import { findInProgressColoring, newArtworkId, saveColoring } from './artworkRepository';
import { LATEST_SCHEMA_VERSION, migrate, type Migration } from './migrations';

const red = { type: 'solid', color: '#FF0000' } as const;
const blue = { type: 'solid', color: '#0000FF' } as const;

async function freshDb() {
  const db = openTestDatabase();
  await migrate(db);
  return db;
}

describe('migrations', () => {
  it('migrates an empty database and is idempotent', async () => {
    const db = openTestDatabase();
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(['artwork', 'preferences']);
  });

  it('rolls back a failing migration and leaves the version unchanged', async () => {
    const db = openTestDatabase();
    const bad: Migration[] = [
      { version: 1, up: (d) => d.execAsync('CREATE TABLE ok (id INTEGER)') },
      { version: 2, up: (d) => d.execAsync('CREATE TABLE half (id INTEGER); THIS IS NOT SQL') },
    ];
    await expect(migrate(db, bad)).rejects.toThrow();
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(1);
    const half = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'half'");
    expect(half).toBeNull();
  });

  it('refuses to open a database from a newer app version', async () => {
    const db = openTestDatabase();
    await db.execAsync('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toThrow(/newer/);
  });
});

describe('artwork repository', () => {
  it('saves and restores unfinished coloring', async () => {
    const db = await freshDb();
    expect(await findInProgressColoring(db, 'dino')).toBeNull();
    const id = newArtworkId();
    await saveColoring(db, { id, pageId: 'dino', pageVersion: 1, fills: { body: red }, createdAt: 100 }, 200);
    await saveColoring(db, { id, pageId: 'dino', pageVersion: 1, fills: { body: blue, head: red }, createdAt: 100 }, 300);
    const restored = await findInProgressColoring(db, 'dino');
    expect(restored).toEqual({ id, pageId: 'dino', pageVersion: 1, fills: { body: blue, head: red }, createdAt: 100, updatedAt: 300 });
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM artwork');
    expect(count?.n).toBe(1); // upsert, not a new row per save
  });

  it('returns the most recently updated artwork for the page only', async () => {
    const db = await freshDb();
    await saveColoring(db, { id: 'old', pageId: 'dino', pageVersion: 1, fills: { body: red }, createdAt: 1 }, 10);
    await saveColoring(db, { id: 'new', pageId: 'dino', pageVersion: 1, fills: { body: blue }, createdAt: 2 }, 20);
    await saveColoring(db, { id: 'other', pageId: 'cat', pageVersion: 1, fills: {}, createdAt: 3 }, 30);
    expect((await findInProgressColoring(db, 'dino'))?.id).toBe('new');
  });

  it('skips corrupt state and falls back to an older valid row', async () => {
    const db = await freshDb();
    await saveColoring(db, { id: 'good', pageId: 'dino', pageVersion: 1, fills: { body: red }, createdAt: 1 }, 10);
    await db.runAsync(
      `INSERT INTO artwork (id, kind, page_id, page_version, state_json, created_at, updated_at)
       VALUES ('bad', 'coloring', 'dino', 1, '{"v":1,"fills":{"body":{"type":"laser"}}}', 2, 20)`,
    );
    expect((await findInProgressColoring(db, 'dino'))?.id).toBe('good');
  });
});
