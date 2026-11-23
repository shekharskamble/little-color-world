// Store screenshots: colour chosen pages for the App Store screenshots (docs/ASO.md).
// Usage: npx tsx tools/store/colorize.ts <out dir> tools/store/colors.json
// Writes <out>/<id>.png (a preview to check) and <out>/seed.json (artwork rows for the simulator's database).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import CanvasKitInit from 'canvaskit-wasm';

import { mixHex, patternFill } from '../../src/engine/fills/fills';
import { flattenPath, type Point, type Subpath } from '../../src/engine/geometry/path';
import { boundsOf, containsPoint } from '../../src/engine/geometry/polygon';
import { ColoringPage } from '../../src/content/schema/page';
import type { FillStyle, PatternId } from '../../src/content/schema/fill';

const ROOT = join(__dirname, '../..');
type Spec = string | { glitter: string } | { pattern: PatternId; color: string } | { rainbow: string[]; angle?: number };
type Plan = Record<string, { fills: Record<string, Spec>; shadeSmall?: boolean; strokes?: unknown[] }>;

const toFill = (s: Spec): FillStyle =>
  typeof s === 'string'
    ? { type: 'solid', color: s }
    : 'glitter' in s
      ? { type: 'texture', textureId: 'glitter', color: s.glitter }
      : 'pattern' in s
        ? patternFill(s.pattern, s.color)
        : { type: 'linear', stops: s.rainbow.map((color, i) => ({ offset: i / (s.rainbow.length - 1), color })), angle: s.angle ?? 90 };

const base = (f: FillStyle): string =>
  f.type === 'solid' || f.type === 'texture' ? f.color : f.type === 'pattern' ? f.fg : f.stops[Math.floor(f.stops.length / 2)]!.color;

function insidePoint(subpaths: Subpath[], rule: 'nonzero' | 'evenodd'): Point | null {
  const b = boundsOf(subpaths);
  for (const steps of [4, 8, 16, 32]) {
    for (let i = 1; i < steps; i++)
      for (let j = 1; j < steps; j++) {
        const p = { x: b.minX + ((b.maxX - b.minX) * i) / steps, y: b.minY + ((b.maxY - b.minY) * j) / steps };
        if (containsPoint(subpaths, p, rule)) return p;
      }
  }
  return null;
}

async function main() {
  const [outDir, planPath] = process.argv.slice(2) as [string, string];
  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as Plan;
  const ck = await CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
  const seed: unknown[] = [];
  for (const [id, p] of Object.entries(plan)) {
    const page = ColoringPage.parse(JSON.parse(readFileSync(join(ROOT, 'content/pages', `${id}.json`), 'utf8')));
    const fills: Record<string, FillStyle> = {};
    for (const [rid, s] of Object.entries(p.fills)) fills[rid] = toFill(s);
    if (p.shadeSmall !== false) {
      const shapes = page.regions.map((r) => ({ id: r.id, sub: flattenPath(r.d), rule: r.fillRule }));
      page.regions.forEach((r, i) => {
        if (fills[r.id] || r.locked || !r.id.startsWith('small')) return;
        const at = insidePoint(shapes[i]!.sub, r.fillRule);
        if (!at) return;
        const under = shapes
          .slice(0, i)
          .reverse()
          .find((s) => containsPoint(s.sub, at, s.rule));
        const f = under && fills[under.id];
        if (f) fills[r.id] = { type: 'solid', color: mixHex(base(f), '#2A2733', 0.18) };
      });
    }
    seed.push({ pageId: id, pageVersion: page.version, fills, strokes: p.strokes ?? [] });

    // Preview: same drawing order as the app (fills, then outlines). Glitter and patterns show as their base colours.
    const [, , w, h] = page.viewBox;
    const surface = ck.MakeSurface(w, h)!;
    const canvas = surface.getCanvas();
    canvas.clear(ck.parseColorString(page.background));
    const paint = new ck.Paint();
    paint.setAntiAlias(true);
    for (const r of page.regions) {
      const path = ck.Path.MakeFromSVGString(r.d)!;
      if (r.fillRule === 'evenodd') path.setFillType(ck.FillType.EvenOdd);
      const f = fills[r.id] ?? r.defaultFill;
      paint.setShader(null);
      if (f?.type === 'linear') {
        const [l = 0, t = 0, rr = 0, b = 0] = path.computeTightBounds();
        const rad = (f.angle * Math.PI) / 180;
        const cx = (l + rr) / 2;
        const cy = (t + b) / 2;
        const half = Math.max(rr - l, b - t) / 2;
        paint.setShader(
          ck.Shader.MakeLinearGradient(
            [cx - Math.cos(rad) * half, cy - Math.sin(rad) * half],
            [cx + Math.cos(rad) * half, cy + Math.sin(rad) * half],
            f.stops.map((s) => ck.parseColorString(s.color)),
            f.stops.map((s) => s.offset),
            ck.TileMode.Clamp,
          ),
        );
      } else paint.setColor(ck.parseColorString(f ? (f.type === 'pattern' ? mixHex(f.fg, f.bg, 0.5) : base(f)) : page.background));
      canvas.drawPath(path, paint);
      path.delete();
    }
    paint.setShader(null);
    paint.setStyle(ck.PaintStyle.Stroke);
    paint.setColor(ck.parseColorString(page.outlineColor));
    for (const o of page.outline) {
      const path = ck.Path.MakeFromSVGString(o.d)!;
      paint.setStrokeWidth(o.strokeWidth);
      paint.setStrokeCap(ck.StrokeCap.Round);
      paint.setStrokeJoin(ck.StrokeJoin.Round);
      canvas.drawPath(path, paint);
      path.delete();
    }
    const img = surface.makeImageSnapshot();
    writeFileSync(join(outDir, `${id}.png`), img.encodeToBytes()!);
  }
  writeFileSync(join(outDir, 'seed.json'), JSON.stringify(seed));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
