import type { FillStyle } from '../../content/schema/fill';

/** Fills for regions that differ from their default. Missing key = default fill. */
export type FillMap = Readonly<Record<string, FillStyle>>;

/** How a stroke looks. A stroke without a `pen` is a marker; an id this app version does not know draws as a marker. */
export const PEN_IDS = ['marker', 'crayon', 'glitter', 'spray', 'pencil'] as const;
export type PenId = (typeof PEN_IDS)[number];

/**
 * A freehand brush stroke. It is clipped to the region it started in, so paint stays inside the lines.
 * `points` are page units, flattened as [x0, y0, x1, y1, …]; a single point is a dot.
 * An `erase` stroke rubs out earlier brush paint under it (never fills); its `color` is unused.
 * `pen` is left out for a marker, so saves from before pens existed read the same.
 */
export type Stroke = Readonly<{ regionId: string; color: string; width: number; points: readonly number[]; erase?: true; pen?: string }>;

/** Everything a child has painted on a page. Saved and restored as a whole. */
export type Artwork = Readonly<{ fills: FillMap; strokes: readonly Stroke[] }>;

export type EditCommand =
  | { kind: 'fill'; regionId: string; before: FillStyle | null; after: FillStyle | null }
  /** `cleared` holds the fills an eraser rub removed (whole parts it passed over), so undo can restore them. */
  | { kind: 'stroke'; stroke: Stroke; cleared?: Readonly<Record<string, FillStyle>> }
  /** Clears a region's fill and its brush strokes; `removed` keeps each stroke's position for undo. */
  | { kind: 'erase'; regionId: string; before: FillStyle | null; removed: readonly { index: number; stroke: Stroke }[] }
  | { kind: 'reset'; before: Artwork };

export type ColoringState = Artwork & {
  past: readonly EditCommand[];
  future: readonly EditCommand[];
  /** Increments on every user edit (incl. undo/redo), never on load. Drives autosave. */
  revision: number;
};

export type ColoringAction =
  | { type: 'fill'; regionId: string; fill: FillStyle }
  /** `clearFills`: parts an eraser stroke passed over; their bucket fills are cleared in the same undo step. */
  | { type: 'stroke'; stroke: Stroke; clearFills?: readonly string[] }
  | { type: 'erase'; regionId: string }
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; fills: FillMap; strokes?: readonly Stroke[] };

export const HISTORY_LIMIT = 100;

export const initialColoringState: ColoringState = { fills: {}, strokes: [], past: [], future: [], revision: 0 };

export function coloringReducer(state: ColoringState, action: ColoringAction): ColoringState {
  switch (action.type) {
    case 'fill': {
      const before = state.fills[action.regionId] ?? null;
      if (fillsEqual(before, action.fill)) return state; // re-filling with the same style is not an edit
      return commit(state, { kind: 'fill', regionId: action.regionId, before, after: action.fill });
    }
    case 'stroke': {
      if (action.stroke.points.length < 2) return state;
      if (!action.stroke.erase) return commit(state, { kind: 'stroke', stroke: action.stroke });
      const cleared: Record<string, FillStyle> = {};
      for (const id of action.clearFills ?? []) {
        const f = state.fills[id];
        if (f) cleared[id] = f;
      }
      const clearsFills = Object.keys(cleared).length > 0;
      // A rub over nothing coloured (no fills under it, no brush paint anywhere) is not an edit.
      if (!clearsFills && !state.strokes.some((s) => !s.erase)) return state;
      return commit(state, { kind: 'stroke', stroke: action.stroke, ...(clearsFills && { cleared }) });
    }
    case 'erase': {
      const before = state.fills[action.regionId] ?? null;
      const removed = state.strokes.flatMap((stroke, index) => (clearedBy(stroke, action.regionId) ? [{ index, stroke }] : []));
      if (before === null && removed.length === 0) return state;
      return commit(state, { kind: 'erase', regionId: action.regionId, before, removed });
    }
    case 'reset':
      if (isBlank(state)) return state;
      return commit(state, { kind: 'reset', before: { fills: state.fills, strokes: state.strokes } });
    case 'undo': {
      const cmd = state.past[state.past.length - 1];
      if (!cmd) return state;
      return { ...revert(state, cmd), past: state.past.slice(0, -1), future: [...state.future, cmd], revision: state.revision + 1 };
    }
    case 'redo': {
      const cmd = state.future[state.future.length - 1];
      if (!cmd) return state;
      return { ...apply(state, cmd), past: [...state.past, cmd], future: state.future.slice(0, -1), revision: state.revision + 1 };
    }
    case 'load':
      return { fills: action.fills, strokes: action.strokes ?? [], past: [], future: [], revision: state.revision };
  }
}

export const canUndo = (s: ColoringState): boolean => s.past.length > 0;
export const canRedo = (s: ColoringState): boolean => s.future.length > 0;
export const isBlank = (a: Artwork): boolean => Object.keys(a.fills).length === 0 && a.strokes.length === 0;

function commit(state: ColoringState, cmd: EditCommand): ColoringState {
  const past = [...state.past, cmd];
  return {
    ...apply(state, cmd),
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    future: [], // a new action after undo discards the redo branch
    revision: state.revision + 1,
  };
}

function apply(art: Artwork, cmd: EditCommand): Artwork {
  switch (cmd.kind) {
    case 'fill':
      return { fills: setFill(art.fills, cmd.regionId, cmd.after), strokes: art.strokes };
    case 'stroke': {
      let fills = art.fills;
      for (const id of Object.keys(cmd.cleared ?? {})) fills = setFill(fills, id, null);
      return { fills, strokes: [...art.strokes, cmd.stroke] };
    }
    case 'erase':
      return { fills: setFill(art.fills, cmd.regionId, null), strokes: art.strokes.filter((s) => !clearedBy(s, cmd.regionId)) };
    case 'reset':
      return { fills: {}, strokes: [] };
  }
}

function revert(art: Artwork, cmd: EditCommand): Artwork {
  switch (cmd.kind) {
    case 'fill':
      return { fills: setFill(art.fills, cmd.regionId, cmd.before), strokes: art.strokes };
    case 'stroke': {
      // Undo always reverts the latest command, so this stroke is the last one.
      const i = art.strokes.lastIndexOf(cmd.stroke);
      let fills = art.fills;
      for (const [id, f] of Object.entries(cmd.cleared ?? {})) fills = setFill(fills, id, f);
      return { fills, strokes: i < 0 ? art.strokes : [...art.strokes.slice(0, i), ...art.strokes.slice(i + 1)] };
    }
    case 'erase': {
      const strokes = [...art.strokes];
      for (const { index, stroke } of cmd.removed) strokes.splice(index, 0, stroke); // ascending, so indices line up
      return { fills: setFill(art.fills, cmd.regionId, cmd.before), strokes };
    }
    case 'reset':
      return cmd.before;
  }
}

/**
 * Clearing a part removes its brush paint. Eraser strokes stay: one that crossed into a neighbouring part must keep
 * rubbing out paint there, and it can only clear paint drawn before it, so keeping it never hides later paint.
 */
const clearedBy = (stroke: Stroke, regionId: string) => stroke.regionId === regionId && !stroke.erase;

function setFill(fills: FillMap, regionId: string, fill: FillStyle | null): FillMap {
  if (fill === null) {
    if (!(regionId in fills)) return fills;
    const { [regionId]: _removed, ...rest } = fills;
    return rest;
  }
  return { ...fills, [regionId]: fill };
}

export function fillsEqual(a: FillStyle | null, b: FillStyle | null): boolean {
  if (a === null || b === null) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Drops fills for regions that no longer exist or are locked (e.g. after a content update). */
export function sanitizeFills(fills: FillMap, fillableRegionIds: ReadonlySet<string>): FillMap {
  const out: Record<string, FillStyle> = {};
  for (const [id, fill] of Object.entries(fills)) if (fillableRegionIds.has(id)) out[id] = fill;
  return out;
}

/** Drops strokes whose region no longer exists or is locked. */
export function sanitizeStrokes(strokes: readonly Stroke[], fillableRegionIds: ReadonlySet<string>): Stroke[] {
  return strokes.filter((s) => fillableRegionIds.has(s.regionId));
}
