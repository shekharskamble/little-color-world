import traceJson from '../../content/trace.json';
import { TraceItem, type TraceSet } from './schema/trace';

/**
 * Trace and Color items, bundled from content/trace.json (written by tools/tracing/generate.ts). Each one's strokes are
 * checked against its coloring page in `npm test` (traces.test.ts); here they get the schema check only, and an item
 * that fails it is left out rather than crashing the app.
 */
const ITEMS: readonly TraceItem[] = (traceJson as unknown[]).flatMap((raw) => {
  const parsed = TraceItem.safeParse(raw);
  if (!parsed.success) console.warn('Skipping invalid trace item', parsed.error.issues[0]);
  return parsed.success ? [parsed.data] : [];
});

/** The picker's sets, in order. `cover` is the item shown on the set's card. */
export const TRACE_SETS: readonly { id: TraceSet; title: string; color: string; cover: string }[] = [
  { id: 'uppercase', title: 'ABC', color: '#E8453C', cover: 'trace-upper-a' },
  { id: 'lowercase', title: 'abc', color: '#4C8DF0', cover: 'trace-lower-a' },
  { id: 'numbers', title: '123', color: '#F2A93B', cover: 'trace-number-2' },
  { id: 'shapes', title: 'Shapes', color: '#3DBE6B', cover: 'trace-shape-circle' },
];

/**
 * The part of a tracing page every letter, number and shape fits in (page units, tails included). Thumbnails size
 * themselves by it, so all share one scale and a short lowercase letter is not blown up to look thicker.
 */
export const TRACE_FRAME = { x: 112, y: 70, width: 800, height: 690 };

export function listTraces(set: TraceSet): TraceItem[] {
  return ITEMS.filter((i) => i.set === set).sort((a, b) => a.order - b.order);
}

export function getTrace(id: string): TraceItem | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function allTraces(): readonly TraceItem[] {
  return ITEMS;
}
