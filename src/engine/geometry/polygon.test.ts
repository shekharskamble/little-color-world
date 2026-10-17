import { flattenPath } from './path';
import { containsPoint, distanceToEdges } from './polygon';
import { fitContain, pageToScreen, screenToPage } from './viewTransform';

// Outer square with an inner square hole, both wound clockwise.
const SAME_WINDING = flattenPath('M0 0 H100 V100 H0 Z M25 25 H75 V75 H25 Z');
// Inner square wound counter-clockwise: a hole under both rules.
const OPPOSITE_WINDING = flattenPath('M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z');

describe('containsPoint', () => {
  it('handles even-odd holes', () => {
    expect(containsPoint(SAME_WINDING, { x: 10, y: 10 }, 'evenodd')).toBe(true);
    expect(containsPoint(SAME_WINDING, { x: 50, y: 50 }, 'evenodd')).toBe(false);
  });

  it('handles nonzero winding', () => {
    expect(containsPoint(SAME_WINDING, { x: 50, y: 50 }, 'nonzero')).toBe(true);
    expect(containsPoint(OPPOSITE_WINDING, { x: 50, y: 50 }, 'nonzero')).toBe(false);
    expect(containsPoint(OPPOSITE_WINDING, { x: 10, y: 90 }, 'nonzero')).toBe(true);
  });

  it('treats open subpaths as implicitly closed and rejects outside points', () => {
    const triangle = flattenPath('M0 0 L100 0 L0 100');
    expect(containsPoint(triangle, { x: 20, y: 20 }, 'nonzero')).toBe(true);
    expect(containsPoint(triangle, { x: 80, y: 80 }, 'nonzero')).toBe(false);
    expect(containsPoint(triangle, { x: -1, y: 5 }, 'nonzero')).toBe(false);
  });
});

describe('distanceToEdges', () => {
  it('measures to the nearest edge', () => {
    expect(distanceToEdges(OPPOSITE_WINDING, { x: 50, y: -10 })).toBeCloseTo(10);
    expect(distanceToEdges(OPPOSITE_WINDING, { x: 50, y: 20 })).toBeCloseTo(5);
  });
});

describe('view transform', () => {
  it('fits a landscape page inside a view and round-trips points', () => {
    const t = fitContain(1024, 768, 2048, 768);
    expect(t.scale).toBe(1);
    expect(t.tx).toBe(512);
    expect(t.ty).toBe(0);
    const p = { x: 123, y: 456 };
    const back = screenToPage(t, pageToScreen(t, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
});
