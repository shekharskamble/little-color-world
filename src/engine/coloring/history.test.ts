import type { FillStyle } from '../../content/schema/fill';
import {
  canRedo,
  canUndo,
  coloringReducer,
  HISTORY_LIMIT,
  initialColoringState,
  sanitizeFills,
  type ColoringAction,
  type ColoringState,
} from './history';

const red: FillStyle = { type: 'solid', color: '#FF0000' };
const blue: FillStyle = { type: 'solid', color: '#0000FF' };
const run = (actions: ColoringAction[], from: ColoringState = initialColoringState) => actions.reduce(coloringReducer, from);

describe('coloringReducer', () => {
  it('fills and erases regions', () => {
    const s = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'fill', regionId: 'head', fill: blue },
      { type: 'erase', regionId: 'body' },
    ]);
    expect(s.fills).toEqual({ head: blue });
    expect(s.past).toHaveLength(3);
  });

  it('does not record no-op edits', () => {
    const once = run([{ type: 'fill', regionId: 'body', fill: red }]);
    expect(coloringReducer(once, { type: 'fill', regionId: 'body', fill: { ...red } })).toBe(once);
    expect(coloringReducer(once, { type: 'erase', regionId: 'head' })).toBe(once);
    expect(coloringReducer(initialColoringState, { type: 'reset' })).toBe(initialColoringState);
  });

  it('undoes and redoes in order', () => {
    const s = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'fill', regionId: 'body', fill: blue },
    ]);
    const u1 = coloringReducer(s, { type: 'undo' });
    expect(u1.fills).toEqual({ body: red });
    const u2 = coloringReducer(u1, { type: 'undo' });
    expect(u2.fills).toEqual({});
    expect(canUndo(u2)).toBe(false);
    expect(coloringReducer(u2, { type: 'undo' })).toBe(u2);
    const r1 = coloringReducer(u2, { type: 'redo' });
    expect(r1.fills).toEqual({ body: red });
    expect(coloringReducer(r1, { type: 'redo' }).fills).toEqual({ body: blue });
  });

  it('restores an erased fill on undo', () => {
    const s = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'erase', regionId: 'body' },
      { type: 'undo' },
    ]);
    expect(s.fills).toEqual({ body: red });
  });

  it('clears redo history after a new action following undo', () => {
    const s = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'fill', regionId: 'head', fill: red },
      { type: 'undo' },
    ]);
    expect(canRedo(s)).toBe(true);
    const next = coloringReducer(s, { type: 'fill', regionId: 'tail', fill: blue });
    expect(canRedo(next)).toBe(false);
    expect(coloringReducer(next, { type: 'redo' })).toBe(next);
  });

  it('makes reset undoable and redoable', () => {
    const filled = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'fill', regionId: 'head', fill: blue },
    ]);
    const reset = coloringReducer(filled, { type: 'reset' });
    expect(reset.fills).toEqual({});
    const undone = coloringReducer(reset, { type: 'undo' });
    expect(undone.fills).toEqual({ body: red, head: blue });
    expect(coloringReducer(undone, { type: 'redo' }).fills).toEqual({});
  });

  it('supports at least 60 consecutive undos back to a blank page', () => {
    const colors = ['#111111', '#222222', '#333333'];
    const actions: ColoringAction[] = Array.from({ length: 60 }, (_, i) => ({
      type: 'fill',
      regionId: `r${i % 7}`,
      fill: { type: 'solid', color: colors[i % 3]! },
    }));
    const filled = run(actions);
    expect(filled.past).toHaveLength(60);
    const undone = run(Array.from({ length: 60 }, () => ({ type: 'undo' }) as const), filled);
    expect(undone.fills).toEqual({});
    const redone = run(Array.from({ length: 60 }, () => ({ type: 'redo' }) as const), undone);
    expect(redone.fills).toEqual(filled.fills);
  });

  it(`caps history at ${HISTORY_LIMIT} entries, dropping the oldest`, () => {
    const actions: ColoringAction[] = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => ({
      type: 'fill',
      regionId: `r${i}`,
      fill: red,
    }));
    const s = run(actions);
    expect(s.past).toHaveLength(HISTORY_LIMIT);
    const all = run(Array.from({ length: HISTORY_LIMIT + 20 }, () => ({ type: 'undo' }) as const), s);
    // The first 20 fills fell off the history and remain.
    expect(Object.keys(all.fills)).toHaveLength(20);
    expect(all.fills.r0).toEqual(red);
  });

  it('bumps revision on edits but not on load, and load clears history', () => {
    const s = run([{ type: 'fill', regionId: 'body', fill: red }, { type: 'undo' }, { type: 'redo' }]);
    expect(s.revision).toBe(3);
    const loaded = coloringReducer(s, { type: 'load', fills: { head: blue } });
    expect(loaded.revision).toBe(3);
    expect(loaded.fills).toEqual({ head: blue });
    expect(canUndo(loaded) || canRedo(loaded)).toBe(false);
  });
});

describe('sanitizeFills', () => {
  it('drops unknown and non-fillable region ids', () => {
    expect(sanitizeFills({ body: red, gone: blue }, new Set(['body', 'head']))).toEqual({ body: red });
  });
});
