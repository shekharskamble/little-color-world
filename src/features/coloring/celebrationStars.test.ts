import { popStars, showerStars } from './celebrationStars';

const fixed = () => 0.5;

describe('celebration stars', () => {
  it('pops stars outward from the tap point', () => {
    const stars = popStars(100, 200, false, undefined, fixed);
    expect(stars).toHaveLength(5);
    for (const s of stars) {
      expect([s.x0, s.y0]).toEqual([100, 200]);
      expect(Math.hypot(s.x1 - s.x0, s.y1 - s.y0)).toBeGreaterThan(50);
      expect(s.size).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps stars in place when reduced motion is on', () => {
    for (const s of [...popStars(10, 20, true, undefined, fixed), ...showerStars(800, 600, true, undefined, fixed)]) {
      expect([s.x1, s.y1, s.spin]).toEqual([s.x0, s.y0, 0]);
    }
  });

  it('floats the shower up from below the screen to inside it', () => {
    for (const s of showerStars(800, 600, false)) {
      expect(s.y0).toBeGreaterThan(600);
      expect(s.y1).toBeGreaterThanOrEqual(0);
      expect(s.y1).toBeLessThan(600);
      expect(s.x0).toBeGreaterThanOrEqual(0);
      expect(s.x0).toBeLessThanOrEqual(800);
    }
  });

  it('paints every star with the fill the child used', () => {
    const hearts = { type: 'pattern', patternId: 'hearts', fg: '#E8453C', bg: '#FADAD8' } as const;
    for (const s of [...popStars(0, 0, false, hearts), ...showerStars(800, 600, false, hearts)]) expect(s.fill).toBe(hearts);
  });

  it('falls back to bright colours when no fill is given', () => {
    expect(new Set(showerStars(800, 600, false).map((s) => JSON.stringify(s.fill))).size).toBeGreaterThan(1);
  });
});
