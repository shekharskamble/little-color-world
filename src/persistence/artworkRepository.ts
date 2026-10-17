import { z } from 'zod';

import { FillStyle } from '../content/schema/fill';
import type { FillMap } from '../engine/coloring/history';
import type { SqlDatabase } from './sql';

export type ColoringArtwork = {
  id: string;
  pageId: string;
  pageVersion: number;
  fills: FillMap;
  createdAt: number;
  updatedAt: number;
};

/** Versioned payload stored in artwork.state_json for coloring artwork. */
const ColoringStateV1 = z.object({ v: z.literal(1), fills: z.record(z.string(), FillStyle) });

type ArtworkRow = {
  id: string;
  page_id: string;
  page_version: number;
  state_json: string;
  created_at: number;
  updated_at: number;
};

export function newArtworkId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Most recently edited unfinished coloring of `pageId`, or null. Corrupt rows are skipped. */
export async function findInProgressColoring(db: SqlDatabase, pageId: string): Promise<ColoringArtwork | null> {
  const rows = await db.getAllAsync<ArtworkRow>(
    `SELECT id, page_id, page_version, state_json, created_at, updated_at FROM artwork
     WHERE kind = 'coloring' AND status = 'in_progress' AND page_id = ?
     ORDER BY updated_at DESC LIMIT 5`,
    pageId,
  );
  for (const row of rows) {
    const fills = parseState(row.state_json);
    if (fills) {
      return {
        id: row.id,
        pageId: row.page_id,
        pageVersion: row.page_version,
        fills,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }
  return null;
}

export async function saveColoring(db: SqlDatabase, art: Omit<ColoringArtwork, 'updatedAt'>, now = Date.now()): Promise<void> {
  const state = JSON.stringify({ v: 1, fills: art.fills });
  await db.runAsync(
    `INSERT INTO artwork (id, kind, page_id, page_version, state_json, status, created_at, updated_at)
     VALUES (?, 'coloring', ?, ?, ?, 'in_progress', ?, ?)
     ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
    art.id,
    art.pageId,
    art.pageVersion,
    state,
    art.createdAt,
    now,
  );
}

function parseState(json: string): FillMap | null {
  try {
    const parsed = ColoringStateV1.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.fills : null;
  } catch {
    return null;
  }
}
