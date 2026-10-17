import { flattenPath, PathParseError, type Subpath } from '../../engine/geometry/path';
import { area, boundsOf } from '../../engine/geometry/polygon';
import { ColoringPage } from './page';

export type Issue = { severity: 'error' | 'warning'; path: string; message: string };
export type PageValidationResult =
  | { ok: true; page: ColoringPage; issues: Issue[] }
  | { ok: false; issues: Issue[] };

/** Minimum region area as a fraction of the page, per age band (docs/ARTWORK_PIPELINE.md). */
const MIN_AREA = { '2-3': 0.004, '4-5': 0.0015, all: 0.004 } as const;
const MIN_OUTLINE = { '2-3': 8, '4-5': 6, all: 8 } as const; // per 1024 units of width
const MAX_REGIONS = { '2-3': 25, '4-5': 80, all: 25 } as const;
const CLOSE_EPSILON = 0.5;

/**
 * Schema + geometry validation for a coloring page. Errors make the page
 * unusable; warnings flag pages that need human review.
 */
export function validatePage(input: unknown): PageValidationResult {
  const parsed = ColoringPage.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ severity: 'error', path: i.path.join('.'), message: i.message })),
    };
  }
  const page = parsed.data;
  const issues: Issue[] = [];
  const [, , w, h] = page.viewBox;
  const pageArea = w * h;
  const margin = Math.max(w, h) * 0.05;

  const seen = new Set<string>();
  page.regions.forEach((region, i) => {
    const at = `regions.${i}(${region.id})`;
    if (seen.has(region.id)) issues.push({ severity: 'error', path: at, message: 'Duplicate region id' });
    seen.add(region.id);

    let subpaths: Subpath[];
    try {
      subpaths = flattenPath(region.d);
    } catch (e) {
      issues.push({ severity: 'error', path: at, message: e instanceof PathParseError ? e.message : String(e) });
      return;
    }
    if (subpaths.length === 0) {
      issues.push({ severity: 'error', path: at, message: 'Empty path' });
      return;
    }
    for (const sp of subpaths) {
      const first = sp.points[0]!;
      const last = sp.points[sp.points.length - 1]!;
      const coincident = Math.hypot(first.x - last.x, first.y - last.y) <= CLOSE_EPSILON;
      if (!sp.closed && !coincident) issues.push({ severity: 'error', path: at, message: 'Subpath is not closed' });
      if (sp.points.length < 3) issues.push({ severity: 'error', path: at, message: 'Subpath has fewer than 3 points' });
    }
    const b = boundsOf(subpaths);
    if (b.minX < -margin || b.minY < -margin || b.maxX > w + margin || b.maxY > h + margin) {
      issues.push({ severity: 'error', path: at, message: 'Region extends outside the viewBox' });
    }
    if (!region.locked) {
      const fraction = area(subpaths) / pageArea;
      const min = MIN_AREA[page.ageBand];
      if (fraction < min / 2) {
        issues.push({ severity: 'error', path: at, message: `Region too small (${pct(fraction)} < ${pct(min / 2)})` });
      } else if (fraction < min) {
        issues.push({ severity: 'warning', path: at, message: `Small region (${pct(fraction)} < ${pct(min)})` });
      }
    }
  });

  const fillable = page.regions.filter((r) => !r.locked).length;
  if (fillable === 0) issues.push({ severity: 'error', path: 'regions', message: 'No fillable regions' });
  if (page.regions.length > MAX_REGIONS[page.ageBand]) {
    issues.push({ severity: 'warning', path: 'regions', message: `Many regions for age ${page.ageBand}` });
  }

  const minStroke = (MIN_OUTLINE[page.ageBand] * w) / 1024;
  page.outline.forEach((o, i) => {
    const at = `outline.${i}`;
    if (o.strokeWidth < minStroke) {
      issues.push({ severity: 'error', path: at, message: `Outline too thin (${o.strokeWidth} < ${minStroke.toFixed(1)})` });
    }
    try {
      flattenPath(o.d);
    } catch (e) {
      issues.push({ severity: 'error', path: at, message: e instanceof PathParseError ? e.message : String(e) });
    }
  });

  const hasErrors = issues.some((i) => i.severity === 'error');
  return hasErrors ? { ok: false, issues } : { ok: true, page, issues };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}
