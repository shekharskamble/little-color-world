// PNG previews rendered with CanvasKit (the same Skia the app uses):
//   <id>.png        the blank page as a child first sees it
//   <id>.debug.png  every region in its own color with its id, so gaps
//                   (white) and slivers are easy to spot

import { existsSync, readFileSync } from 'node:fs';

import CanvasKitInit, { type CanvasKit, type Font } from 'canvaskit-wasm';

import { flattenPath, type Point, type Subpath } from '../../src/engine/geometry/path';
import { boundsOf, containsPoint, distanceToEdges } from '../../src/engine/geometry/polygon';
import { fillBaseColor } from '../../src/content/schema/fill';
import type { ColoringPage } from '../../src/content/schema/page';

const FONT_CANDIDATES = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf'];

let kit: Promise<CanvasKit> | null = null;
function canvasKit(): Promise<CanvasKit> {
  kit ??= CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
  return kit;
}

export async function renderPreviews(page: ColoringPage, scale = 1): Promise<{ blank: Uint8Array; debug: Uint8Array }> {
  const ck = await canvasKit();
  const fontPath = FONT_CANDIDATES.find((p) => existsSync(p));
  const typeface = fontPath ? ck.Typeface.MakeFreeTypeFaceFromData(new Uint8Array(readFileSync(fontPath)).buffer) : null;
  const font = typeface ? new ck.Font(typeface, 18) : null;
  return {
    blank: render(ck, page, scale, null),
    debug: render(ck, page, scale, font),
  };
}

function render(ck: CanvasKit, page: ColoringPage, scale: number, labels: Font | null): Uint8Array {
  const [, , w, h] = page.viewBox;
  const surface = ck.MakeSurface(Math.ceil(w * scale), Math.ceil(h * scale));
  if (!surface) throw new Error('Could not create a drawing surface');
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  canvas.clear(ck.parseColorString(page.background));

  const paint = new ck.Paint();
  paint.setAntiAlias(true);
  const debug = labels !== null;

  page.regions.forEach((r, i) => {
    const path = ck.Path.MakeFromSVGString(r.d);
    if (!path) return;
    if (r.fillRule === 'evenodd') path.setFillType(ck.FillType.EvenOdd);
    paint.setStyle(ck.PaintStyle.Fill);
    const color = (r.defaultFill && fillBaseColor(r.defaultFill)) ?? (debug && !r.locked ? debugColor(i) : page.background);
    paint.setColor(ck.parseColorString(color));
    canvas.drawPath(path, paint);
    path.delete();
  });

  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setColor(ck.parseColorString(page.outlineColor));
  for (const o of page.outline) {
    const path = ck.Path.MakeFromSVGString(o.d);
    if (!path) continue;
    paint.setStrokeWidth(o.strokeWidth);
    paint.setStrokeCap(o.lineCap === 'butt' ? ck.StrokeCap.Butt : o.lineCap === 'square' ? ck.StrokeCap.Square : ck.StrokeCap.Round);
    paint.setStrokeJoin(o.lineJoin === 'miter' ? ck.StrokeJoin.Miter : o.lineJoin === 'bevel' ? ck.StrokeJoin.Bevel : ck.StrokeJoin.Round);
    canvas.drawPath(path, paint);
    path.delete();
  }

  if (labels) {
    const halo = new ck.Paint();
    halo.setAntiAlias(true);
    halo.setStyle(ck.PaintStyle.Stroke);
    halo.setStrokeWidth(5);
    halo.setColor(ck.WHITE);
    const ink = new ck.Paint();
    ink.setAntiAlias(true);
    ink.setColor(ck.parseColorString('#1E1B2E'));
    const shapes = page.regions.map((r) => ({ subpaths: flattenPath(r.d), fillRule: r.fillRule }));
    for (const [i, r] of page.regions.entries()) {
      if (r.locked) continue;
      const at = labelPoint(shapes[i]!, shapes.slice(i + 1));
      if (!at) continue;
      const glyphs = labels.getGlyphIDs(r.id);
      const widths = labels.getGlyphWidths(glyphs);
      const textWidth = widths.reduce((sum, v) => sum + v, 0);
      canvas.drawText(r.id, at.x - textWidth / 2, at.y + 6, halo, labels);
      canvas.drawText(r.id, at.x - textWidth / 2, at.y + 6, ink, labels);
    }
    halo.delete();
    ink.delete();
  }

  paint.delete();
  const image = surface.makeImageSnapshot();
  const bytes = image.encodeToBytes();
  image.delete();
  surface.delete();
  if (!bytes) throw new Error('PNG encoding failed');
  return bytes;
}

/** Well-separated pastel colors, so neighbouring regions are easy to tell apart. */
function debugColor(i: number): string {
  const hue = (i * 137.508) % 360;
  return hslToHex(hue, 0.75, 0.72);
}

type Shape = { subpaths: Subpath[]; fillRule: 'nonzero' | 'evenodd' };

/** The sampled point of a region farthest from its edges, skipping spots covered by regions drawn above it. */
function labelPoint({ subpaths, fillRule }: Shape, above: Shape[]): Point | null {
  const b = boundsOf(subpaths);
  let best: Point | null = null;
  let bestDist = -1;
  const steps = 24;
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const p = { x: b.minX + ((b.maxX - b.minX) * i) / steps, y: b.minY + ((b.maxY - b.minY) * j) / steps };
      if (!containsPoint(subpaths, p, fillRule) || above.some((s) => containsPoint(s.subpaths, p, s.fillRule))) continue;
      const dist = Math.min(distanceToEdges(subpaths, p), ...above.map((s) => distanceToEdges(s.subpaths, p)));
      if (dist > bestDist) [best, bestDist] = [p, dist];
    }
  }
  return best;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
