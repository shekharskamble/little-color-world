import { flattenPath, parsePath, PathParseError } from './path';
import { area, boundsOf } from './polygon';

describe('parsePath', () => {
  it('parses absolute and relative lines, H/V, and Z', () => {
    expect(parsePath('M10 10 h20 v20 H10 Z')).toEqual([
      { type: 'M', p: { x: 10, y: 10 } },
      { type: 'L', p: { x: 30, y: 10 } },
      { type: 'L', p: { x: 30, y: 30 } },
      { type: 'L', p: { x: 10, y: 30 } },
      { type: 'Z' },
    ]);
  });

  it('treats extra pairs after M as implicit L and handles compact numbers', () => {
    expect(parsePath('M0,0 10-5.5.5.5')).toEqual([
      { type: 'M', p: { x: 0, y: 0 } },
      { type: 'L', p: { x: 10, y: -5.5 } },
      { type: 'L', p: { x: 0.5, y: 0.5 } },
    ]);
  });

  it('reflects control points for S and T', () => {
    const segs = parsePath('M0 0 C10 0 20 10 30 10 S50 20 60 20 M0 0 Q10 10 20 0 T40 0');
    expect(segs[2]).toEqual({ type: 'C', c1: { x: 40, y: 10 }, c2: { x: 50, y: 20 }, p: { x: 60, y: 20 } });
    expect(segs[5]).toEqual({ type: 'Q', c: { x: 30, y: -10 }, p: { x: 40, y: 0 } });
  });

  it('accepts arc flags written without separators', () => {
    const segs = parsePath('M0 0 a10 10 0 0120 0');
    expect(segs.at(-1)).toMatchObject({ type: 'C', p: { x: 20, y: 0 } });
  });

  it('rejects malformed data', () => {
    expect(() => parsePath('M0 0 L10')).toThrow(PathParseError);
    expect(() => parsePath('L0 0')).toThrow(PathParseError);
    expect(() => parsePath('M0 0 X 1 1')).toThrow(PathParseError);
  });
});

describe('flattenPath', () => {
  it('approximates a circle drawn with two arcs', () => {
    const subpaths = flattenPath('M30 100 A70 70 0 1 1 170 100 A70 70 0 1 1 30 100 Z');
    expect(subpaths).toHaveLength(1);
    expect(subpaths[0]!.closed).toBe(true);
    expect(area(subpaths)).toBeCloseTo(Math.PI * 70 * 70, -2); // within ~50 units²
    const b = boundsOf(subpaths);
    expect(b.minX).toBeCloseTo(30, 0);
    expect(b.maxX).toBeCloseTo(170, 0);
    expect(b.minY).toBeCloseTo(30, 0);
    expect(b.maxY).toBeCloseTo(170, 0);
  });

  it('marks subpaths closed only when Z is present', () => {
    const [open, closed] = flattenPath('M0 0 L10 0 L10 10 M20 20 L30 20 L30 30 Z');
    expect(open!.closed).toBe(false);
    expect(closed!.closed).toBe(true);
  });
});
