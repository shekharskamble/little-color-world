import { flattenPath, PathParseError, type Subpath } from '../../engine/geometry/path';
import { containsPoint } from '../../engine/geometry/polygon';
import { pointAt, trackFromSubpath } from '../../engine/tracing/track';
import type { ColoringPage } from './page';
import { TraceItem } from './trace';
import type { Issue } from './validatePage';

export type TraceValidationResult = { ok: true; item: TraceItem; issues: Issue[] } | { ok: false; issues: Issue[] };

/** Shorter strokes are too fiddly for small fingers, in units per 1024 of page width. */
const MIN_STROKE_LENGTH = 60;
/** Stroke points checked against the coloring page, in page units. */
const SAMPLE_STEP = 8;

/**
 * Schema + geometry checks for a trace item. With `colorPage`, every stroke must also lie on a colorable part of that
 * page, so the letter the child traced is the letter they then color.
 */
export function validateTrace(input: unknown, colorPage?: ColoringPage): TraceValidationResult {
  const parsed = TraceItem.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => ({ severity: 'error', path: i.path.join('.'), message: i.message })) };
  }
  const item = parsed.data;
  const issues: Issue[] = [];
  const [, , w, h] = item.viewBox;
  // The page-sized background is colourable too, but a stroke must lie on the drawing itself.
  const regions = colorPage?.regions.filter((r) => !r.locked && r.id !== 'background').map((r) => ({ subpaths: flattenPath(r.d), rule: r.fillRule }));

  if (colorPage && colorPage.id !== item.colorPageId) {
    issues.push({ severity: 'error', path: 'colorPageId', message: `Expected page ${item.colorPageId}, got ${colorPage.id}` });
  }
  if (colorPage && (colorPage.viewBox[2] !== w || colorPage.viewBox[3] !== h)) {
    issues.push({ severity: 'error', path: 'viewBox', message: 'Differs from the coloring page' });
  }

  item.strokes.forEach((stroke, i) => {
    const at = `strokes.${i}`;
    let subpaths: Subpath[];
    try {
      subpaths = flattenPath(stroke.d);
    } catch (e) {
      issues.push({ severity: 'error', path: at, message: e instanceof PathParseError ? e.message : String(e) });
      return;
    }
    if (subpaths.length !== 1) {
      issues.push({ severity: 'error', path: at, message: `Needs exactly one subpath, has ${subpaths.length}` });
      return;
    }
    const track = trackFromSubpath(subpaths[0]!);
    if (track.length < (MIN_STROKE_LENGTH * w) / 1024) {
      issues.push({ severity: 'error', path: at, message: `Too short to trace (${Math.round(track.length)} units)` });
    }
    if (track.points.some((p) => p.x < 0 || p.y < 0 || p.x > w || p.y > h)) {
      issues.push({ severity: 'error', path: at, message: 'Leaves the page' });
    }
    if (regions) {
      for (let s = 0; s <= track.length; s += SAMPLE_STEP) {
        const p = pointAt(track, s);
        if (!regions.some((r) => containsPoint(r.subpaths, p, r.rule))) {
          issues.push({ severity: 'error', path: at, message: `Leaves the colorable shape at (${Math.round(p.x)}, ${Math.round(p.y)})` });
          break;
        }
      }
    }
  });

  return issues.some((i) => i.severity === 'error') ? { ok: false, issues } : { ok: true, item, issues };
}
