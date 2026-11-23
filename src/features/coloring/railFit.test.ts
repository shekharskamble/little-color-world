import { RAIL_MIN_SCALE, railHeight, railScale } from './railFit';

describe('tool rail fit', () => {
  it('keeps full size when there is room (13" iPad)', () => {
    expect(railScale(900)).toBe(1);
  });

  // Rail heights measured from the layout: screen height minus safe areas, top bar, paddings and the panel's padding.
  it.each([
    ['iPad Pro 11" (834 pt tall)', 616],
    ['iPad Air / 10th gen (820 pt)', 602],
    ['iPad 9th gen (810 pt)', 592],
  ])('fits the fullest rail without scrolling on %s', (_name, available) => {
    const k = railScale(available);
    expect(k).toBeLessThan(1);
    expect(k).toBeGreaterThan(RAIL_MIN_SCALE);
    expect(railHeight(k)).toBeLessThanOrEqual(available + 1e-9);
  });

  it('never shrinks below the minimum on a tiny screen', () => {
    expect(railScale(300)).toBe(RAIL_MIN_SCALE);
  });

  it('treats an unmeasured rail as full size', () => {
    expect(railScale(0)).toBe(1);
  });
});
