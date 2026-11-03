/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ColoringPage } from '../../src/content/schema/page';
import { validatePage } from '../../src/content/schema/validatePage';
import { flattenPath } from '../../src/engine/geometry/path';
import { area } from '../../src/engine/geometry/polygon';

import { exportSvg, importSvg, type PageMeta } from './svgPage';

const META: PageMeta = { id: 'test-page', themeId: 'animals', title: 'Test', ageBand: '2-3', version: 1 };
const INK = 'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"';

function svg(body: string, viewBox = '0 0 1024 768'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" ${INK} viewBox="${viewBox}">${body}</svg>`;
}
const layer = (name: string, body: string, extra = '') => `<g inkscape:groupmode="layer" inkscape:label="${name}" ${extra}>${body}</g>`;
const STROKE = 'style="fill:#fff;stroke:#000;stroke-width:10"';

const errors = (r: ReturnType<typeof importSvg>) => r.issues.filter((i) => i.severity === 'error').map((i) => i.message);

describe('importSvg', () => {
  it('turns named, stroked shapes into regions plus outline', () => {
    const r = importSvg(svg(layer('regions', `<rect id="sky" x="0" y="0" width="1024" height="768" ${STROKE}/><circle id="sun" cx="500" cy="300" r="100" ${STROKE}/>`)), META);
    expect(errors(r)).toEqual([]);
    expect(r.page!.regions.map((x) => x.id)).toEqual(['sky', 'sun']);
    expect(r.page!.outline).toHaveLength(1); // same stroke settings are merged into one outline group
    expect(r.page!.outline[0]!.strokeWidth).toBe(10);
    expect(validatePage(r.page).ok).toBe(true);
    expect(r.page!.subtitle).toBeUndefined();
  });

  it('marks regions named small-N as small parts', () => {
    const r = importSvg(svg(layer('regions', `<circle id="sun" cx="500" cy="300" r="100" ${STROKE}/><circle id="small-1" cx="100" cy="100" r="12" ${STROKE}/>`)), META);
    expect(errors(r)).toEqual([]);
    expect(r.page!.regions.find((x) => x.id === 'small-1')!.small).toBe(true);
    expect(r.page!.regions.find((x) => x.id === 'sun')!.small).toBeUndefined();
  });

  it('carries an optional subtitle into the page', () => {
    const r = importSvg(svg(layer('regions', `<circle id="sun" cx="500" cy="300" r="100" ${STROKE}/>`)), { ...META, subtitle: '3 sides, 3 corners' });
    expect(r.page!.subtitle).toBe('3 sides, 3 corners');
    expect(validatePage(r.page).ok).toBe(true);
  });

  it('bakes transforms into coordinates and scales stroke widths', () => {
    const body = layer('regions', `<g transform="translate(100 50) scale(2)"><rect id="box" x="0" y="0" width="100" height="100" style="fill:#fff;stroke:#000;stroke-width:5"/></g>`);
    const r = importSvg(svg(body), META);
    expect(r.page!.regions[0]!.d).toBe('M100 50 L300 50 L300 250 L100 250 Z');
    expect(r.page!.outline[0]!.strokeWidth).toBe(10);
  });

  it('shifts content when the viewBox does not start at 0,0', () => {
    const r = importSvg(svg(layer('regions', `<rect id="box" x="10" y="20" width="200" height="200" ${STROKE}/>`), '10 20 1024 768'), META);
    expect(r.page!.regions[0]!.d.startsWith('M0 0 ')).toBe(true);
  });

  it('prefers the Inkscape label, and normalises it to a region id', () => {
    const r = importSvg(svg(layer('regions', `<rect id="rect12" inkscape:label="Ear Left" x="0" y="0" width="300" height="300" ${STROKE}/>`)), META);
    expect(r.page!.regions[0]).toMatchObject({ id: 'ear-left', label: 'Ear Left' });
  });

  it('reports unnamed region shapes instead of inventing ids', () => {
    const r = importSvg(svg(layer('regions', `<path id="path123" d="M0 0 H300 V300 Z" ${STROKE}/>`)), META);
    expect(r.page).toBeNull();
    expect(errors(r)[0]).toMatch(/no name/);
  });

  it('merges shapes that share a name, and names group children after the group', () => {
    const body = layer(
      'regions',
      `<rect id="a1" inkscape:label="spots" x="0" y="0" width="200" height="200" ${STROKE}/>` +
        `<rect id="a2" inkscape:label="spots" x="400" y="0" width="200" height="200" ${STROKE}/>` +
        `<g id="legs"><rect x="0" y="400" width="200" height="200" ${STROKE}/><rect x="400" y="400" width="200" height="200" ${STROKE}/></g>`,
    );
    const r = importSvg(svg(body), META);
    expect(r.page!.regions.map((x) => x.id)).toEqual(['spots', 'legs']);
    expect(area(flattenPath(r.page!.regions[0]!.d))).toBeCloseTo(80000);
  });

  it('warns when parts of one region are traced in opposite directions (their overlap would be a hole)', () => {
    const cw = 'M 0,0 L 200,0 L 200,200 L 0,200 Z';
    const ccw = 'M 100,100 L 100,300 L 300,300 L 300,100 Z';
    const warnings = (second: string) =>
      importSvg(svg(layer('regions', `<path inkscape:label="body" d="${cw}" ${STROKE}/><path inkscape:label="body" d="${second}" ${STROKE}/>`)), META)
        .issues.filter((i) => i.severity === 'warning' && /opposite directions/.test(i.message));
    expect(warnings(ccw)).toHaveLength(1);
    expect(warnings('M 100,100 L 300,100 L 300,300 L 100,300 Z')).toHaveLength(0);
  });

  it('outlines overlapping parts of one region as a single shape, with no seams inside', () => {
    const body = layer('regions', `<circle inkscape:label="body" cx="300" cy="300" r="100" ${STROKE}/><circle inkscape:label="body" cx="420" cy="300" r="100" ${STROKE}/>`);
    const r = importSvg(svg(body), META);
    const inside = (x: number, y: number) => Math.hypot(x - 300, y - 300) < 95 || Math.hypot(x - 420, y - 300) < 95;
    const points = r.page!.outline.flatMap((o) => flattenPath(o.d).flatMap((sp) => sp.points));
    expect(points.length).toBeGreaterThan(0);
    expect(points.filter((p) => inside(p.x, p.y))).toEqual([]);
  });

  it('makes details locked regions with their own fill, drawn above the others', () => {
    const body =
      layer('details', `<circle cx="100" cy="100" r="40" style="fill:#000"/>`) + layer('regions', `<rect id="body" x="0" y="0" width="400" height="400" ${STROKE}/>`);
    const r = importSvg(svg(body), META);
    expect(r.page!.regions.map((x) => [x.id, x.locked])).toEqual([
      ['body', false],
      ['detail-1', true],
    ]);
    expect(r.page!.regions[1]!.defaultFill).toEqual({ type: 'solid', color: '#000000' });
  });

  it('takes only strokes from the outline layer and warns about filled outline shapes', () => {
    const body =
      layer('regions', `<rect id="body" x="0" y="0" width="400" height="400" style="fill:#fff"/>`) +
      layer('outline', `<path d="M0 500 L400 500" style="fill:none;stroke:#000;stroke-width:12;stroke-linecap:round"/><path id="blob" d="M0 0 H10 V10 Z" style="fill:#000"/>`);
    const r = importSvg(svg(body), META);
    expect(r.page!.outline).toEqual([{ d: 'M0 500 L400 500', strokeWidth: 12, lineCap: 'round', lineJoin: 'round' }]);
    expect(r.issues.some((i) => i.severity === 'warning' && i.path === 'blob')).toBe(true);
  });

  it('ignores other layers (e.g. a reference image) and hidden content', () => {
    const body =
      layer('reference', `<image href="ref.png" width="1024" height="768"/>`) +
      layer('regions', `<rect id="body" x="0" y="0" width="400" height="400" ${STROKE}/><rect id="hidden" style="display:none" x="0" y="0" width="5" height="5"/>`);
    const r = importSvg(svg(body), META);
    expect(errors(r)).toEqual([]);
    expect(r.page!.regions.map((x) => x.id)).toEqual(['body']);
  });

  it('rejects unsupported elements inside page layers', () => {
    const r = importSvg(svg(layer('regions', `<rect id="body" x="0" y="0" width="400" height="400" ${STROKE}/><text id="t1">Hi</text>`)), META);
    expect(errors(r)[0]).toMatch(/<text> is not supported/);
  });

  it('requires a viewBox and at least one outline', () => {
    expect(errors(importSvg('<svg xmlns="http://www.w3.org/2000/svg"/>', META))[0]).toMatch(/viewBox/);
    expect(errors(importSvg(svg(layer('regions', `<rect id="body" x="0" y="0" width="400" height="400" style="fill:#fff"/>`)), META))).toContainEqual(
      expect.stringMatching(/No outlines/),
    );
  });
});

describe('exportSvg', () => {
  it('round-trips the bundled dinosaur with the same regions and geometry', () => {
    const original = ColoringPage.parse(JSON.parse(readFileSync(join(__dirname, '../../content/pages/dino-27.json'), 'utf8')));
    const r = importSvg(exportSvg(original), { ...META, id: original.id, themeId: original.themeId });
    expect(errors(r)).toEqual([]);
    const byId = new Map(r.page!.regions.map((x) => [x.id, x]));
    expect([...byId.keys()].sort()).toEqual(original.regions.map((x) => x.id).sort());
    for (const region of original.regions) {
      const copy = byId.get(region.id)!;
      expect(copy.locked).toBe(region.locked);
      expect(area(flattenPath(copy.d))).toBeCloseTo(area(flattenPath(region.d)), -1);
    }
    // Outlines with identical stroke settings are merged into one group per width.
    const widths = (o: { strokeWidth: number }[]) => [...new Set(o.map((x) => x.strokeWidth))].sort();
    expect(widths(r.page!.outline)).toEqual(widths(original.outline));
    expect(validatePage(r.page).ok).toBe(true);
  });
});
