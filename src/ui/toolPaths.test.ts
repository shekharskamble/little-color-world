/** @jest-environment node */
import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm';

import { TOOL_ART, TOOL_ART_H, TOOL_ART_W, TOOL_OWN_COLOR } from './toolPaths';

let ck: CanvasKit;
beforeAll(async () => {
  ck = await CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
});

describe('tool pictures', () => {
  it.each(Object.keys(TOOL_ART))('%s parses and stays on its 120 × 48 grid', (name) => {
    for (const p of TOOL_ART[name as keyof typeof TOOL_ART]) {
      const path = ck.Path.MakeFromSVGString(p.d);
      expect(path).not.toBeNull();
      const [l, t, r, b] = path!.computeTightBounds();
      expect(l).toBeGreaterThanOrEqual(0);
      expect(t).toBeGreaterThanOrEqual(-2); // the pail's handle arcs just above the top
      expect(r).toBeLessThanOrEqual(TOOL_ART_W);
      expect(b).toBeLessThanOrEqual(TOOL_ART_H);
      path!.delete();
    }
  });

  it('gives every tool its own paint colour', () => {
    expect(Object.keys(TOOL_OWN_COLOR).sort()).toEqual(Object.keys(TOOL_ART).sort());
  });
});
