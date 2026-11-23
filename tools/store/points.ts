// npx tsx tools/store/points.ts <pageId>: a well-inside point for each colourable region (page units), as JSON.
// The App Store preview video taps these points (docs/ASO.md).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ColoringPage } from '../../src/content/schema/page';
import { flattenPath } from '../../src/engine/geometry/path';
import { boundsOf, containsPoint, distanceToEdges } from '../../src/engine/geometry/polygon';

const page = ColoringPage.parse(JSON.parse(readFileSync(join(__dirname, '../../content/pages', `${process.argv[2]}.json`), 'utf8')));
const shapes = page.regions.map((r) => ({ sub: flattenPath(r.d), rule: r.fillRule }));
const out: Record<string, { x: number; y: number; d: number; small: boolean }> = {};
page.regions.forEach((r, i) => {
  if (r.locked) return;
  const { sub, rule } = shapes[i]!;
  const above = shapes.slice(i + 1);
  const b = boundsOf(sub);
  let best: { x: number; y: number; d: number } | null = null;
  const n = 40;
  for (let a = 1; a < n; a++)
    for (let c = 1; c < n; c++) {
      const p = { x: b.minX + ((b.maxX - b.minX) * a) / n, y: b.minY + ((b.maxY - b.minY) * c) / n };
      if (!containsPoint(sub, p, rule) || above.some((s) => containsPoint(s.sub, p, s.rule))) continue;
      const d = Math.min(distanceToEdges(sub, p), ...above.map((s) => distanceToEdges(s.sub, p)));
      if (!best || d > best.d) best = { ...p, d };
    }
  if (best) out[r.id] = { ...best, small: !!r.small };
});
console.log(JSON.stringify(out));
