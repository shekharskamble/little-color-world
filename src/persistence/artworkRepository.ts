import { z } from 'zod';

import { FillStyle } from '../content/schema/fill';
import type { FillMap, Stroke } from '../engine/coloring/history';
import type { SqlDatabase } from './sql';

export type ColoringArtwork = {
  id: string;
  pageId: string;
  pageVersion: number;
  fills: FillMap;
  strokes: readonly Stroke[];
  createdAt: number;
  updatedAt: number;
};

/** Versioned payload stored in artwork.state_json for coloring artwork. v1 had fills only; v2 adds brush strokes. */
const ColoringStateV1 = z.object({ v: z.literal(1), fills: z.record(z.string(), FillStyle) });
const StrokeSchema = z.object({
  regionId: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  width: z.number().positive(),
  points: z.array(z.number()).min(2),
  /** Rubbing-eraser stroke (added 2026-11-02; optional, so older saves still parse). */
  erase: z.literal(true).optional(),
  /** Crayon, glitter or spray (added 2026-11-03; optional, absent = marker). Any short id parses, for newer saves. */
  pen: z.string().min(1).max(32).optional(),
});
const ColoringStateV2 = z.object({ v: z.literal(2), fills: z.record(z.string(), FillStyle), strokes: z.array(StrokeSchema) });
const ColoringState = z.union([ColoringStateV1, ColoringStateV2]);

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
    const state = parseState(row.state_json);
    if (state) {
      return {
        id: row.id,
        pageId: row.page_id,
        pageVersion: row.page_version,
        ...state,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }
  return null;
}

export async function saveColoring(db: SqlDatabase, art: Omit<ColoringArtwork, 'updatedAt'>, now = Date.now()): Promise<void> {
  const state = JSON.stringify({ v: 2, fills: art.fills, strokes: art.strokes });
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

function parseState(json: string): { fills: FillMap; strokes: Stroke[] } | null {
  try {
    const parsed = ColoringState.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return { fills: parsed.data.fills, strokes: parsed.data.v === 2 ? parsed.data.strokes : [] };
  } catch {
    return null;
  }
}
