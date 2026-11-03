import { FillStyle } from '../../content/schema/fill';

import { gradientEnds, mixHex, patternFill } from './fills';

describe('gradientEnds', () => {
  const box = { x: 10, y: 20, width: 100, height: 50 };

  it('runs left to right across the box at 0°', () => {
    const { start, end } = gradientEnds(box, 0);
    expect(start.x).toBeCloseTo(10);
    expect(end.x).toBeCloseTo(110);
    expect(start.y).toBeCloseTo(45);
    expect(end.y).toBeCloseTo(45);
  });

  it('runs top to bottom at 90°', () => {
    const { start, end } = gradientEnds(box, 90);
    expect(start.y).toBeCloseTo(20);
    expect(end.y).toBeCloseTo(70);
    expect(start.x).toBeCloseTo(60);
  });

  it('reaches both far corners on a diagonal', () => {
    const { start, end } = gradientEnds(box, 45);
    const along = (p: { x: number; y: number }) => (p.x + p.y) / Math.SQRT2;
    expect(along(start)).toBeCloseTo(along({ x: 10, y: 20 }));
    expect(along(end)).toBeCloseTo(along({ x: 110, y: 70 }));
  });
});

describe('patternFill', () => {
  it('draws the chosen colour on a pale tint of it', () => {
    const f = patternFill('dots', '#3a7beb');
    expect(f).toEqual({ type: 'pattern', patternId: 'dots', fg: '#3A7BEB', bg: mixHex('#3A7BEB', '#FFFFFF', 0.78) });
    expect(FillStyle.safeParse(f).success).toBe(true);
  });

  it('keeps very light colours visible by using them as the background', () => {
    const f = patternFill('stars', '#FFFFFF');
    expect(f.bg).toBe('#FFFFFF');
    expect(f.fg).not.toBe('#FFFFFF');
  });
});

describe('mixHex', () => {
  it('blends channel by channel', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mixHex('#E8453C', '#E8453C', 0.3)).toBe('#E8453C');
  });
});
