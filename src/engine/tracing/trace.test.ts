import { flattenPath } from '../geometry/path';
import { isTraceDone, restoreTrace, START, traceMove, type TraceState } from './trace';
import { directionAt, pointAt, projectWithin, trackFromSubpath } from './track';

const line = (d: string) => trackFromSubpath(flattenPath(d)[0]!);
/** "L": down, then right. */
const strokes = [line('M100 100 V500'), line('M100 500 H400')];

/** Feeds a finger path to the tracer, sample by sample, like the screen does. */
function drag(state: TraceState, points: { x: number; y: number }[]): TraceState {
  let s = state;
  let prev: { x: number; y: number } | null = null;
  for (const p of points) {
    s = traceMove(strokes, s, prev, p);
    prev = p;
  }
  return s;
}

describe('track', () => {
  it('measures arc length and finds points along it', () => {
    const t = line('M0 0 H300 V400');
    expect(t.length).toBe(700);
    expect(pointAt(t, 150)).toEqual({ x: 150, y: 0 });
    expect(pointAt(t, 500)).toEqual({ x: 300, y: 200 });
    expect(pointAt(t, 9999)).toEqual({ x: 300, y: 400 });
    expect(directionAt(t, 0)).toEqual({ x: 1, y: 0 });
    expect(directionAt(t, 700)).toEqual({ x: 0, y: 1 });
  });

  it('projects only onto the allowed part of the track', () => {
    // A closed loop: its start and end are the same place.
    const loop = line('M0 0 H100 V100 H0 Z');
    expect(projectWithin(loop, { x: 1, y: 1 }, 0, 50)!.at).toBeCloseTo(1);
    expect(projectWithin(loop, { x: 1, y: 1 }, 350, 400)!.at).toBeCloseTo(399);
  });
});

describe('tracing', () => {
  it('advances along the stroke as the finger follows it', () => {
    const s = drag(START, [
      { x: 100, y: 100 },
      { x: 104, y: 200 },
      { x: 96, y: 300 },
    ]);
    expect(s.stroke).toBe(0);
    expect(s.progress).toBeCloseTo(200);
  });

  it('ignores a finger far from the path', () => {
    expect(drag(START, [{ x: 300, y: 100 }, { x: 300, y: 400 }])).toBe(START);
  });

  it('makes no progress from a touch alone', () => {
    expect(traceMove(strokes, START, null, { x: 100, y: 110 })).toBe(START);
  });

  it('does not let the finger skip ahead to the end of a stroke', () => {
    expect(drag(START, [{ x: 100, y: 480 }, { x: 100, y: 495 }])).toBe(START);
    expect(drag(START, [{ x: 100, y: 100 }, { x: 100, y: 120 }, { x: 100, y: 495 }]).progress).toBeLessThan(200);
  });

  it('never goes backwards', () => {
    const s = drag(START, [{ x: 100, y: 100 }, { x: 100, y: 300 }]);
    expect(drag(s, [{ x: 100, y: 300 }, { x: 100, y: 150 }])).toEqual(s);
  });

  it('makes no progress tracing a stroke from the wrong end', () => {
    expect(drag(START, [{ x: 100, y: 500 }, { x: 100, y: 300 }, { x: 100, y: 100 }])).toEqual(START);
  });

  it('counts a quick swipe that follows the path', () => {
    expect(drag(START, [{ x: 100, y: 100 }, { x: 100, y: 500 }]).stroke).toBe(1);
  });

  it('finishes each stroke in order, then the whole item', () => {
    let s = drag(START, [{ x: 100, y: 100 }, { x: 100, y: 500 }]);
    expect(s).toEqual({ stroke: 1, progress: 0 });
    expect(isTraceDone(s, strokes)).toBe(false);
    s = drag(s, [{ x: 100, y: 500 }, { x: 250, y: 505 }, { x: 395, y: 500 }]);
    expect(isTraceDone(s, strokes)).toBe(true);
    expect(drag(s, [{ x: 100, y: 100 }, { x: 100, y: 200 }])).toBe(s);
  });

  it('does not let one stroke start the next one out of order', () => {
    // Tracing the second stroke first does nothing.
    expect(drag(START, [{ x: 100, y: 500 }, { x: 400, y: 500 }])).toEqual(START);
  });

  it('needs the whole way round a closed shape, not just its start', () => {
    const circle = [line('M0 -200 A200 200 0 1 1 0 200 A200 200 0 1 1 0 -200')];
    // Coming into the start dot backwards (from the end of the loop) counts for nothing.
    expect(traceMove(circle, START, { x: -60, y: -190 }, { x: -2, y: -200 })).toEqual(START);
    let s = START;
    let prev: { x: number; y: number } | null = null;
    for (let a = 0; a <= 360; a += 5) {
      const p = { x: 200 * Math.sin((a * Math.PI) / 180), y: -200 * Math.cos((a * Math.PI) / 180) };
      s = traceMove(circle, s, prev, p);
      prev = p;
    }
    expect(isTraceDone(s, circle)).toBe(true);
  });
});

describe('restoring a saved tracing', () => {
  it('keeps a valid state as it was', () => {
    expect(restoreTrace(strokes, { stroke: 1, progress: 120 }, false)).toEqual({ stroke: 1, progress: 120 });
    expect(restoreTrace(strokes, { stroke: 2, progress: 0 }, true)).toEqual({ stroke: 2, progress: 0 });
  });

  it('starts over with nothing saved, and shows a finished item finished', () => {
    expect(restoreTrace(strokes, null, false)).toBe(START);
    expect(isTraceDone(restoreTrace(strokes, null, true), strokes)).toBe(true);
  });

  it('clamps a state saved for a different version of the item', () => {
    expect(restoreTrace(strokes, { stroke: 9, progress: 50 }, false)).toEqual({ stroke: 2, progress: 0 });
    expect(restoreTrace(strokes, { stroke: 0, progress: 9999 }, false)).toEqual({ stroke: 0, progress: 400 });
    expect(restoreTrace(strokes, { stroke: -1, progress: Number.NaN }, false)).toEqual({ stroke: 0, progress: 0 });
  });
});
