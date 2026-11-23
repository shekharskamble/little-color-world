/** @jest-environment node */
import { openTestDatabase } from '../test-utils/nodeSqlite';
import { findInProgressColoring } from './artworkRepository';
import { migrate } from './migrations';
import { loadTrace, loadTraces, saveTrace } from './tracingRepository';

async function freshDb() {
  const db = openTestDatabase();
  await migrate(db);
  return db;
}

describe('tracing repository', () => {
  it('saves progress and reads it back, one row per item', async () => {
    const db = await freshDb();
    expect(await loadTrace(db, 'trace-upper-a')).toBeNull();
    await saveTrace(db, 'trace-upper-a', 1, { stroke: 0, progress: 120.04 }, false, 1000);
    await saveTrace(db, 'trace-upper-a', 1, { stroke: 1, progress: 80 }, false, 2000);
    await saveTrace(db, 'trace-upper-b', 1, { stroke: 0, progress: 10 }, false, 3000);
    expect(await loadTrace(db, 'trace-upper-a')).toEqual({ state: { stroke: 1, progress: 80 }, completed: false });
    const all = await loadTraces(db);
    expect([...all.keys()].sort()).toEqual(['trace-upper-a', 'trace-upper-b']);
    const rows = await db.getAllAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM artwork WHERE kind = 'tracing'`);
    expect(rows[0]!.n).toBe(2);
  });

  it('stays completed when the child traces the item again', async () => {
    const db = await freshDb();
    await saveTrace(db, 'trace-upper-a', 1, { stroke: 3, progress: 0 }, true);
    await saveTrace(db, 'trace-upper-a', 1, { stroke: 0, progress: 40 }, false);
    expect(await loadTrace(db, 'trace-upper-a')).toEqual({ state: { stroke: 0, progress: 40 }, completed: true });
  });

  it('reads a finished item saved before progress was kept as finished, with no state', async () => {
    const db = await freshDb();
    await db.runAsync(
      `INSERT INTO artwork (id, kind, page_id, page_version, state_json, status, created_at, updated_at)
       VALUES ('trace:trace-upper-a', 'tracing', 'trace-upper-a', 1, '{"v":1}', 'completed', 1, 1)`,
    );
    expect(await loadTrace(db, 'trace-upper-a')).toEqual({ state: null, completed: true });
  });

  it('is never mistaken for a coloring of the same page', async () => {
    const db = await freshDb();
    await saveTrace(db, 'trace-upper-a', 1, { stroke: 0, progress: 10 }, false);
    expect(await findInProgressColoring(db, 'trace-upper-a')).toBeNull();
  });
});
