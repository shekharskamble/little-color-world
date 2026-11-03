import { fitContain, fitContainRect, pageToScreen, zoomAbout } from './viewTransform';

describe('zoomAbout', () => {
  it('keeps the zoom point fixed and scales distances from it', () => {
    const t = fitContain(1024, 768, 400, 300);
    const z = zoomAbout(t, 1.2, 200, 150);
    expect(z.scale).toBeCloseTo(t.scale * 1.2);
    // The page centre stays at the view centre.
    expect(pageToScreen(z, { x: 512, y: 384 })).toEqual({ x: 200, y: 150 });
    // A corner moves 1.2× as far from the centre.
    const corner = pageToScreen(z, { x: 0, y: 0 });
    expect(corner.x).toBeCloseTo(200 - 200 * 1.2);
    expect(corner.y).toBeCloseTo(150 - 150 * 1.2);
  });

  it('is the identity at factor 1', () => {
    const t = { scale: 0.5, tx: 10, ty: 20 };
    expect(zoomAbout(t, 1, 99, 77)).toEqual(t);
  });
});

describe('fitContainRect', () => {
  it('centres the rectangle and fills the tighter side', () => {
    const t = fitContainRect({ x: 100, y: 200, width: 400, height: 200 }, 300, 300, 10);
    expect(t.scale).toBeCloseTo(280 / 400);
    expect(pageToScreen(t, { x: 300, y: 300 })).toEqual({ x: 150, y: 150 });
    expect(pageToScreen(t, { x: 100, y: 300 }).x).toBeCloseTo(10);
  });
});
