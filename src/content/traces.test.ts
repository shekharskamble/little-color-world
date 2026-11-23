import traceJson from '../../content/trace.json';
import { flattenPath } from '../engine/geometry/path';
import { isTraceDone, START, traceMove } from '../engine/tracing/trace';
import { directionAt, pointAt, trackFromSubpath } from '../engine/tracing/track';
import { getPage } from './registry';
import { validateTrace } from './schema/validateTrace';
import { allTraces } from './traces';

describe('bundled trace items', () => {
  it('all pass the schema check', () => {
    expect(allTraces()).toHaveLength((traceJson as unknown[]).length);
  });

  it.each(allTraces().map((i) => [i.id, i] as const))('%s lies on its coloring page', (_id, item) => {
    const page = getPage(item.colorPageId);
    expect(page?.themeId).toBe('tracing');
    expect(validateTrace(item, page ?? undefined).issues).toEqual([]);
  });

  it.each(allTraces().map((i) => [i.id, i] as const))('%s can be finished by following its strokes', (_id, item) => {
    const tracks = item.strokes.map((st) => trackFromSubpath(flattenPath(st.d)[0]!));
    let state = START;
    // A finger wobbling up to 20 units either side of the path, sampled every 10 units, lifting between strokes.
    tracks.forEach((track, i) => {
      let prev = null;
      for (let at = 0; at <= track.length + 10; at += 10) {
        const p = pointAt(track, at);
        const dir = directionAt(track, at);
        const side = 20 * Math.sin(at / 25);
        const wobble = { x: p.x - dir.y * side, y: p.y + dir.x * side };
        state = traceMove(tracks, state, prev, wobble);
        prev = wobble;
      }
      expect(state.stroke).toBe(i + 1);
    });
    expect(isTraceDone(state, tracks)).toBe(true);
  });

  it('has unique ids and orders within each set', () => {
    const items = allTraces();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => `${i.set}:${i.order}`)).size).toBe(items.length);
  });
});
