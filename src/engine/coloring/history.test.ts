import type { FillStyle } from '../../content/schema/fill';
import {
  canRedo,
  canUndo,
  coloringReducer,
  HISTORY_LIMIT,
  initialColoringState,
  isBlank,
  sanitizeFills,
  sanitizeStrokes,
  type ColoringAction,
  type ColoringState,
  type Stroke,
} from './history';

const red: FillStyle = { type: 'solid', color: '#FF0000' };
const blue: FillStyle = { type: 'solid', color: '#0000FF' };
const stroke = (regionId: string, color = '#E8453C'): Stroke => ({ regionId, color, width: 24, points: [10, 10, 40, 30] });
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

describe('brush strokes', () => {
  it('adds strokes in order, and undo and redo remove and restore them', () => {
    const a = stroke('body');
    const b = stroke('head', '#3A7BEB');
    const s = run([{ type: 'stroke', stroke: a }, { type: 'stroke', stroke: b }]);
    expect(s.strokes).toEqual([a, b]);
    const undone = coloringReducer(s, { type: 'undo' });
    expect(undone.strokes).toEqual([a]);
    expect(coloringReducer(undone, { type: 'redo' }).strokes).toEqual([a, b]);
  });

  it('ignores a stroke with no points', () => {
    const s = coloringReducer(initialColoringState, { type: 'stroke', stroke: { ...stroke('body'), points: [] } });
    expect(s).toBe(initialColoringState);
  });

  it('erasing a region clears its fill and its strokes only, and undo puts them back in place', () => {
    const a = stroke('body');
    const b = stroke('head');
    const c = stroke('body', '#3A7BEB');
    const s = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'stroke', stroke: a },
      { type: 'stroke', stroke: b },
      { type: 'stroke', stroke: c },
      { type: 'erase', regionId: 'body' },
    ]);
    expect(s.fills).toEqual({});
    expect(s.strokes).toEqual([b]);
    const undone = coloringReducer(s, { type: 'undo' });
    expect(undone.fills).toEqual({ body: red });
    expect(undone.strokes).toEqual([a, b, c]);
  });

  it('erasing a region with only strokes is an edit; with nothing at all it is not', () => {
    const s = run([{ type: 'stroke', stroke: stroke('body') }]);
    expect(coloringReducer(s, { type: 'erase', regionId: 'body' }).strokes).toEqual([]);
    expect(coloringReducer(s, { type: 'erase', regionId: 'head' })).toBe(s);
  });

  it('keeps rubbing-eraser strokes when a part is cleared, and undoes a rub like any stroke', () => {
    const paint = stroke('body');
    const rub: Stroke = { ...stroke('body'), erase: true };
    const s = run([{ type: 'fill', regionId: 'body', fill: red }, { type: 'stroke', stroke: paint }, { type: 'stroke', stroke: rub }]);
    expect(s.fills).toEqual({ body: red }); // rubbing never touches fills
    expect(coloringReducer(s, { type: 'undo' }).strokes).toEqual([paint]);
    const cleared = coloringReducer(s, { type: 'erase', regionId: 'body' });
    expect(cleared.strokes).toEqual([rub]);
    expect(coloringReducer(cleared, { type: 'undo' }).strokes).toEqual([paint, rub]);
  });

  it('a rub clears the bucket colour of the parts it crossed, in one undo step', () => {
    const rub: Stroke = { ...stroke('body'), erase: true };
    const s = run([
      { type: 'fill', regionId: 'body', fill: red },
      { type: 'fill', regionId: 'head', fill: blue },
      { type: 'stroke', stroke: rub, clearFills: ['body', 'tail'] },
    ]);
    expect(s.fills).toEqual({ head: blue });
    const undone = coloringReducer(s, { type: 'undo' });
    expect(undone.fills).toEqual({ body: red, head: blue });
    expect(undone.strokes).toEqual([]);
    expect(coloringReducer(undone, { type: 'redo' }).fills).toEqual({ head: blue });
  });

  it('a rub over nothing coloured is not an edit', () => {
    const rub: Stroke = { ...stroke('body'), erase: true };
    const s = run([{ type: 'fill', regionId: 'head', fill: blue }]);
    expect(coloringReducer(s, { type: 'stroke', stroke: rub, clearFills: ['body'] })).toBe(s);
  });

  it('reset clears fills and strokes, and undo restores both', () => {
    const a = stroke('body');
    const s = run([{ type: 'fill', regionId: 'head', fill: blue }, { type: 'stroke', stroke: a }, { type: 'reset' }]);
    expect(isBlank(s)).toBe(true);
    const undone = coloringReducer(s, { type: 'undo' });
    expect(undone.fills).toEqual({ head: blue });
    expect(undone.strokes).toEqual([a]);
  });

  it('a page with only strokes can be reset', () => {
    const s = run([{ type: 'stroke', stroke: stroke('body') }]);
    expect(coloringReducer(s, { type: 'reset' }).strokes).toEqual([]);
  });

  it('load restores strokes and clears history', () => {
    const a = stroke('body');
    const loaded = coloringReducer(initialColoringState, { type: 'load', fills: {}, strokes: [a] });
    expect(loaded.strokes).toEqual([a]);
    expect(canUndo(loaded)).toBe(false);
  });

  it('sanitizeStrokes drops strokes in regions that are gone or locked', () => {
    expect(sanitizeStrokes([stroke('body'), stroke('gone')], new Set(['body']))).toEqual([stroke('body')]);
  });
});

describe('sanitizeFills', () => {
  it('drops unknown and non-fillable region ids', () => {
    expect(sanitizeFills({ body: red, gone: blue }, new Set(['body', 'head']))).toEqual({ body: red });
  });
});
