import type { FillStyle } from '../../content/schema/fill';

/** Fills for regions that differ from their default. Missing key = default fill. */
export type FillMap = Readonly<Record<string, FillStyle>>;

export type EditCommand =
  | { kind: 'fill'; regionId: string; before: FillStyle | null; after: FillStyle | null }
  | { kind: 'reset'; before: FillMap };

export type ColoringState = {
  fills: FillMap;
  past: readonly EditCommand[];
  future: readonly EditCommand[];
  /** Increments on every user edit (incl. undo/redo), never on load. Drives autosave. */
  revision: number;
};

export type ColoringAction =
  | { type: 'fill'; regionId: string; fill: FillStyle }
  | { type: 'erase'; regionId: string }
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; fills: FillMap };

export const HISTORY_LIMIT = 100;

export const initialColoringState: ColoringState = { fills: {}, past: [], future: [], revision: 0 };

export function coloringReducer(state: ColoringState, action: ColoringAction): ColoringState {
  switch (action.type) {
    case 'fill':
      return record(state, action.regionId, action.fill);
    case 'erase':
      return record(state, action.regionId, null);
    case 'reset': {
      if (Object.keys(state.fills).length === 0) return state;
      return commit(state, { kind: 'reset', before: state.fills }, {});
    }
    case 'undo': {
      const cmd = state.past[state.past.length - 1];
      if (!cmd) return state;
      return {
        fills: revert(state.fills, cmd),
        past: state.past.slice(0, -1),
        future: [...state.future, cmd],
        revision: state.revision + 1,
      };
    }
    case 'redo': {
      const cmd = state.future[state.future.length - 1];
      if (!cmd) return state;
      return {
        fills: apply(state.fills, cmd),
        past: [...state.past, cmd],
        future: state.future.slice(0, -1),
        revision: state.revision + 1,
      };
    }
    case 'load':
      return { fills: action.fills, past: [], future: [], revision: state.revision };
  }
}

export const canUndo = (s: ColoringState): boolean => s.past.length > 0;
export const canRedo = (s: ColoringState): boolean => s.future.length > 0;

function record(state: ColoringState, regionId: string, after: FillStyle | null): ColoringState {
  const before = state.fills[regionId] ?? null;
  if (fillsEqual(before, after)) return state; // re-filling with the same style is not an edit
  const cmd: EditCommand = { kind: 'fill', regionId, before, after };
  return commit(state, cmd, apply(state.fills, cmd));
}

function commit(state: ColoringState, cmd: EditCommand, fills: FillMap): ColoringState {
  const past = [...state.past, cmd];
  return {
    fills,
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    future: [], // a new action after undo discards the redo branch
    revision: state.revision + 1,
  };
}

function apply(fills: FillMap, cmd: EditCommand): FillMap {
  return cmd.kind === 'reset' ? {} : setFill(fills, cmd.regionId, cmd.after);
}

function revert(fills: FillMap, cmd: EditCommand): FillMap {
  return cmd.kind === 'reset' ? cmd.before : setFill(fills, cmd.regionId, cmd.before);
}

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
