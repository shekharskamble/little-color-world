/** @jest-environment node */
import { flattenPath } from '../../src/engine/geometry/path';

import { toCover, visibleStroke } from './visibleStroke';

const square = 'M0 0 L100 0 L100 100 L0 100 Z';
const xs = (d: string) => flattenPath(d).flatMap((s) => s.points.map((p) => p.x));

describe('visibleStroke', () => {
  it('keeps the original path when nothing covers it', () => {
    expect(visibleStroke(square, [toCover('M200 200 L300 200 L300 300 Z', 'nonzero')])).toBe(square);
  });

  it('returns null when the stroke is fully covered', () => {
    expect(visibleStroke(square, [toCover('M-10 -10 L110 -10 L110 110 L-10 110 Z', 'nonzero')])).toBeNull();
  });

  it('cuts the covered part and ends the cut on the covering edge', () => {
    // The right half of the square is under another shape.
    const d = visibleStroke(square, [toCover('M50 -10 L200 -10 L200 110 L50 110 Z', 'nonzero')])!;
    const points = xs(d);
    expect(Math.max(...points)).toBeLessThanOrEqual(50.5);
    expect(Math.max(...points)).toBeGreaterThan(49);
    // The visible C-shape is one run (the loop is joined across its start point).
    expect(d.match(/M/g)).toHaveLength(1);
  });

  it('splits an open line into separate visible runs', () => {
    const d = visibleStroke('M0 0 L300 0', [toCover('M100 -10 L200 -10 L200 10 L100 10 Z', 'nonzero')])!;
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it('respects evenodd holes in the covering shape', () => {
    const ring = 'M-50 -50 L150 -50 L150 150 L-50 150 Z M-20 -20 L120 -20 L120 120 L-20 120 Z';
    expect(visibleStroke(square, [toCover(ring, 'evenodd')])).toBe(square);
  });
});
