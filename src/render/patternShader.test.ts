/** @jest-environment node */
import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm';

import { PATTERN_IDS } from '../content/schema/fill';

import { PATTERN_CELL, PATTERN_SKSL } from './patternShader';

let ck: CanvasKit;
beforeAll(async () => {
  ck = await CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
});

describe('pattern shader', () => {
  it('compiles', () => {
    const errors: string[] = [];
    const effect = ck.RuntimeEffect.Make(PATTERN_SKSL, (e) => errors.push(e));
    expect(errors).toEqual([]);
    expect(effect).not.toBeNull();
    effect?.delete();
  });

  it.each(PATTERN_IDS.map((id, kind) => [id, kind] as const))('draws %s as a mix of fg and bg', (_id, kind) => {
    const effect = ck.RuntimeEffect.Make(PATTERN_SKSL)!;
    const size = PATTERN_CELL * 3;
    const surface = ck.MakeSurface(size, size)!;
    // fg pure red, bg pure blue: every pixel should be some blend of the two, and both should show up.
    const shader = effect.makeShader([kind, PATTERN_CELL, 1, 0, 0, 1, 0, 0, 1, 1]);
    const paint = new ck.Paint();
    paint.setShader(shader);
    surface.getCanvas().drawRect(ck.LTRBRect(0, 0, size, size), paint);
    const px = surface.getCanvas().readPixels(0, 0, { width: size, height: size, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB })!;
    let red = 0;
    let blue = 0;
    for (let i = 0; i < px.length; i += 4) {
      expect(px[i + 1]).toBeLessThan(8);
      if (px[i]! > 240) red++;
      if (px[i + 2]! > 240) blue++;
    }
    const n = size * size;
    expect(red / n).toBeGreaterThan(0.05);
    expect(blue / n).toBeGreaterThan(0.2);
    paint.delete();
    shader.delete();
    surface.delete();
    effect.delete();
  });
});
