/** @jest-environment node */
import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm';

import { TEXTURE_IDS } from '../content/schema/fill';

import { TEXTURE_KIND, TEXTURE_SKSL } from './textureShader';

let ck: CanvasKit;
beforeAll(async () => {
  ck = await CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
});

const SIZE = 120;

/** Renders `kind` in pure blue over a white page and returns the pixels (RGBA, unpremultiplied). */
function render(kind: number): Uint8Array {
  const effect = ck.RuntimeEffect.Make(TEXTURE_SKSL)!;
  const surface = ck.MakeSurface(SIZE, SIZE)!;
  const canvas = surface.getCanvas();
  canvas.clear(ck.WHITE);
  const shader = effect.makeShader([kind, 0, 0, 1, 1, 0, 0, SIZE, SIZE]);
  const paint = new ck.Paint();
  paint.setShader(shader);
  canvas.drawRect(ck.LTRBRect(0, 0, SIZE, SIZE), paint);
  const px = canvas.readPixels(0, 0, { width: SIZE, height: SIZE, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB })!;
  paint.delete();
  shader.delete();
  surface.delete();
  effect.delete();
  return px as Uint8Array;
}

/** Share of pixels that are mostly the paint colour (blue), and that are near white. */
function census(px: Uint8Array) {
  let blue = 0;
  let white = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 2]! > 200 && px[i]! < 120) blue++;
    if (px[i]! > 235 && px[i + 1]! > 235 && px[i + 2]! > 235) white++;
  }
  const n = px.length / 4;
  return { blue: blue / n, white: white / n };
}

describe('texture shader', () => {
  it('compiles', () => {
    const errors: string[] = [];
    const effect = ck.RuntimeEffect.Make(TEXTURE_SKSL, (e) => errors.push(e));
    expect(errors).toEqual([]);
    expect(effect).not.toBeNull();
    effect?.delete();
  });

  it('has a kind for every fill texture', () => {
    expect(TEXTURE_IDS.map((id) => TEXTURE_KIND[id])).toEqual([0, 1]);
  });

  it('glossy is mostly the colour with a white shine', () => {
    const { blue, white } = census(render(TEXTURE_KIND.glossy));
    expect(blue).toBeGreaterThan(0.6);
    expect(white).toBeGreaterThan(0.005);
    expect(white).toBeLessThan(0.1);
  });

  it('glitter is mostly the colour with white sparkles', () => {
    const { blue, white } = census(render(TEXTURE_KIND.glitter));
    expect(blue).toBeGreaterThan(0.5);
    expect(white).toBeGreaterThan(0.005);
  });

  it('pencil is mostly solid with fine paper flecks', () => {
    const px = render(TEXTURE_KIND.pencil);
    let strong = 0;
    let pale = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i]! < 40) strong++;
      if (px[i]! > 70) pale++;
    }
    const n = px.length / 4;
    expect(strong / n).toBeGreaterThan(0.4);
    expect(pale / n).toBeGreaterThan(0.02);
  });

  it('crayon lets the white paper show through', () => {
    const px = render(TEXTURE_KIND.crayon);
    let pale = 0;
    let strong = 0;
    for (let i = 0; i < px.length; i += 4) {
      expect(px[i + 2]).toBeGreaterThan(240); // blue channel: always paint or paper
      if (px[i]! > 90) pale++;
      if (px[i]! < 40) strong++;
    }
    const n = px.length / 4;
    expect(pale / n).toBeGreaterThan(0.1);
    expect(strong / n).toBeGreaterThan(0.2);
  });
});
