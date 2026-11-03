/** @jest-environment node */
import { apply, parseTransform, scaleFactor } from './matrix';

const near = (p: { x: number; y: number }, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x, 6);
  expect(p.y).toBeCloseTo(y, 6);
};

describe('parseTransform', () => {
  it('returns identity for empty input', () => {
    near(apply(parseTransform(null), { x: 3, y: 4 }), 3, 4);
  });

  it('applies a list right-to-left, as SVG does', () => {
    // scale first, then translate
    near(apply(parseTransform('translate(10, 20) scale(2)'), { x: 1, y: 1 }), 12, 22);
  });

  it('rotates about a center point', () => {
    near(apply(parseTransform('rotate(90 10 10)'), { x: 20, y: 10 }), 10, 20);
  });

  it('reads matrix() and non-uniform scale', () => {
    near(apply(parseTransform('matrix(1 0 0 1 5 6)'), { x: 0, y: 0 }), 5, 6);
    near(apply(parseTransform('scale(2 3)'), { x: 1, y: 1 }), 2, 3);
  });

  it('rejects malformed numbers', () => {
    expect(() => parseTransform('translate(a)')).toThrow();
  });
});

describe('scaleFactor', () => {
  it('is the geometric mean of the axis scales', () => {
    expect(scaleFactor(parseTransform('scale(2 8)'))).toBeCloseTo(4);
    expect(scaleFactor(parseTransform('rotate(30) scale(3)'))).toBeCloseTo(3);
  });
});
