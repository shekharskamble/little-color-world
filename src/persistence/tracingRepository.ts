import { z } from 'zod';

import type { SqlDatabase } from './sql';

/**
 * Tracing progress, one artwork row per item (kind 'tracing'): where the child got to (stroke and progress along it),
 * saved as they trace, so the picker can show it and the item reopens where they stopped. `status` becomes
 * 'completed' the first time the item is finished and stays so, even if they trace it again. The colouring that
 * follows a tracing is an ordinary coloring row for the item's page.
 */
export type SavedTrace = { state: { stroke: number; progress: number } | null; completed: boolean };

/** v1 rows (finished items, before progress was saved) carry no state. */
const TraceStateV2 = z.object({ v: z.literal(2), stroke: z.number(), progress: z.number() });

export async function saveTrace(
  db: SqlDatabase,
  itemId: string,
  version: number,
  state: { stroke: number; progress: number },
  completed: boolean,
  now = Date.now(),
): Promise<void> {
  await db.runAsync(
    `INSERT INTO artwork (id, kind, page_id, page_version, state_json, status, created_at, updated_at)
     VALUES (?, 'tracing', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET page_version = excluded.page_version, state_json = excluded.state_json,
       status = CASE WHEN artwork.status = 'completed' THEN 'completed' ELSE excluded.status END,
       updated_at = excluded.updated_at`,
    `trace:${itemId}`,
    itemId,
    version,
    JSON.stringify({ v: 2, stroke: state.stroke, progress: Math.round(state.progress * 10) / 10 }),
    completed ? 'completed' : 'in_progress',
    now,
    now,
  );
}

/** Every item's saved tracing, by item id. Unreadable state counts as none. */
export async function loadTraces(db: SqlDatabase): Promise<Map<string, SavedTrace>> {
  const rows = await db.getAllAsync<{ page_id: string; state_json: string; status: string }>(
    `SELECT page_id, state_json, status FROM artwork WHERE kind = 'tracing'`,
  );
  return new Map(rows.map((r) => [r.page_id, { state: parseState(r.state_json), completed: r.status === 'completed' }]));
}

export async function loadTrace(db: SqlDatabase, itemId: string): Promise<SavedTrace | null> {
  const row = await db.getFirstAsync<{ state_json: string; status: string }>(
    `SELECT state_json, status FROM artwork WHERE kind = 'tracing' AND page_id = ?`,
    itemId,
  );
  return row ? { state: parseState(row.state_json), completed: row.status === 'completed' } : null;
}

function parseState(json: string): SavedTrace['state'] {
  try {
    const parsed = TraceStateV2.safeParse(JSON.parse(json));
    return parsed.success ? { stroke: parsed.data.stroke, progress: parsed.data.progress } : null;
  } catch {
    return null;
  }
}
