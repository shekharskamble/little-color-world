// Trace-and-color progress: the child follows each stroke in order, from its start dot, in its direction.
// There is no failure state. A finger off the path, going backwards, or jumping ahead just makes no progress.

import { dist, type Point } from '../geometry/path';
import { projectWithin, type Track } from './track';

export type TraceSettings = Readonly<{
  /** How far (page units) the finger may stray from the path and still count. */
  tolerance: number;
  /** How far ahead of the traced part the finger may be and still count; stops skipping to the end. */
  reach: number;
  /** Fraction of a stroke that completes it (the last few units are hard to hit exactly). */
  completeAt: number;
}>;

/** Generous for ages 2–5 on a 1024-unit page. */
export const DEFAULT_TRACE_SETTINGS: TraceSettings = { tolerance: 56, reach: 72, completeAt: 0.94 };

export type TraceState = Readonly<{
  /** Index of the stroke being traced; equals the stroke count when everything is done. */
  stroke: number;
  /** Arc length traced along the current stroke. */
  progress: number;
}>;

export const START: TraceState = { stroke: 0, progress: 0 };

export function isTraceDone(state: TraceState, strokes: readonly Track[]): boolean {
  return state.stroke >= strokes.length;
}

/**
 * One small finger step from `from` to `to`. Progress only moves forward, only along the current stroke, and only when
 * the finger itself moves forward along it: so approaching the start dot from the wrong side earns nothing.
 */
export function traceStep(strokes: readonly Track[], state: TraceState, from: Point, to: Point, settings = DEFAULT_TRACE_SETTINGS): TraceState {
  const track = strokes[state.stroke];
  if (!track) return state;
  // A stroke starts at its start dot; further along only counts once the traced part reaches it.
  const end = state.progress + (state.progress === 0 ? settings.tolerance / 2 : settings.reach);
  const hit = projectWithin(track, to, state.progress, end);
  const before = projectWithin(track, from, state.progress, end);
  if (!hit || !before || hit.offset > settings.tolerance || hit.at <= state.progress || hit.at <= before.at) return state;
  if (hit.at >= track.length * settings.completeAt) return { stroke: state.stroke + 1, progress: 0 };
  return { stroke: state.stroke, progress: hit.at };
}

/**
 * A finger movement from `from` to `to` (`from` is null on touch-down, which never makes progress by itself). Fast
 * swipes deliver far-apart samples, so the move is split into steps no longer than half the tolerance.
 */
export function traceMove(
  strokes: readonly Track[],
  state: TraceState,
  from: Point | null,
  to: Point,
  settings = DEFAULT_TRACE_SETTINGS,
): TraceState {
  if (!from) return state;
  const steps = Math.max(1, Math.ceil(dist(from, to) / (settings.tolerance / 2)));
  let next = state;
  let last = from;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) };
    const before = next.stroke;
    next = traceStep(strokes, next, last, p, settings);
    last = p;
    // A finished stroke ends this movement; the next stroke picks up from the next sample.
    if (next.stroke !== before) return next;
  }
  return next;
}

/**
 * A saved state made safe for the item as it is now (content can change between versions): the stroke is clamped to
 * the item's strokes and the progress to that stroke. `completed` with no usable state means finished.
 */
export function restoreTrace(strokes: readonly Track[], saved: { stroke: number; progress: number } | null, completed: boolean): TraceState {
  if (!saved) return completed ? { stroke: strokes.length, progress: 0 } : START;
  const stroke = Math.max(0, Math.min(strokes.length, Math.floor(saved.stroke)));
  const track = strokes[stroke];
  const progress = track && Number.isFinite(saved.progress) ? Math.max(0, Math.min(track.length, saved.progress)) : 0;
  return { stroke, progress };
}
