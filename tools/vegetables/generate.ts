// Generates the Vegetables pages from the owner's "N007 Vegetable" clipart
// (art/svg/vegetables/source/veg-<nn>.svg, from ~/Desktop/Little Color World/N007_Vegetable/02-Individual_SVG/SVG/Asset <n>N007.svg).
//   npx tsx tools/vegetables/generate.ts              writes art/svg/vegetables/veg-<nn>.svg
//   npx tsx tools/vegetables/generate.ts --import     also imports each page (npm run lcw -- page import)
// No background, each vegetable drawn big and centred. Vegetables ships over the CDN only (content/remote.json;
// docs/CONTENT_DELIVERY.md), as pack `vegetables`.
//
// The pack paints dark (.cls-1) and white (.cls-2) shapes in order, and some drawings (Spinach, Onion, Cabbage) are a
// solid dark silhouette with the white inside painted on top. So each source is first flattened to the ink a viewer
// sees (dark shapes added, white shapes cut out, in drawing order), then converted as is (tools/art/clipart.ts
// addClipart): every white area becomes a part and the lines stay exactly as drawn. The fuller converter
// (addClipartRegions) thinned this pack's thin inner lines away and read its thick outline as solid shapes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import CanvasKitInit, { type CanvasKit, type Path } from 'canvaskit-wasm';

import { addClipart, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the page number (id `veg-<n>`) and the asset number in the pack. */
type Pic = { n: string; title: string; subtitle: string };

const PICS: Pic[] = [
  { n: '01', title: 'Chili Pepper', subtitle: 'A hot, hot chili!' },
  { n: '02', title: 'Squash', subtitle: 'A big squash!' },
  { n: '03', title: 'Little Pumpkin', subtitle: 'A round little pumpkin!' },
  { n: '04', title: 'Potato', subtitle: 'A spotty potato!' },
  { n: '05', title: 'Eggplant', subtitle: 'A shiny eggplant!' },
  { n: '06', title: 'Radish', subtitle: 'A round radish!' },
  { n: '07', title: 'Carrot', subtitle: 'Crunch, crunch, carrot!' },
  { n: '08', title: 'Sweet Pepper', subtitle: 'A sweet pepper!' },
  { n: '09', title: 'Spring Onion', subtitle: 'A spring onion!' },
  { n: '10', title: 'Celery Stick', subtitle: 'A crunchy celery stick!' },
  { n: '11', title: 'Mushroom', subtitle: 'A little mushroom!' },
  { n: '12', title: 'Garlic', subtitle: 'A bulb of garlic!' },
  { n: '13', title: 'Tomato', subtitle: 'A juicy tomato!' },
  { n: '14', title: 'Green Peas', subtitle: 'Peas peeking out!' },
  { n: '15', title: 'Spinach', subtitle: 'A big spinach leaf!' },
  { n: '16', title: 'Celery', subtitle: 'Leafy celery!' },
  { n: '17', title: 'Onion', subtitle: 'A round onion!' },
  { n: '18', title: 'Bok Choy', subtitle: 'Leafy bok choy!' },
  { n: '19', title: 'Broccoli', subtitle: 'A little broccoli tree!' },
  { n: '20', title: 'Leafy Carrot', subtitle: 'A carrot with leaves!' },
  { n: '21', title: 'Bell Pepper', subtitle: 'A big bell pepper!' },
  { n: '22', title: 'Pea Pod', subtitle: 'Peas in a pod!' },
  { n: '23', title: 'Corn', subtitle: 'Corn on the cob!' },
  { n: '24', title: 'Lettuce', subtitle: 'Crispy lettuce!' },
  { n: '25', title: 'Sweetcorn', subtitle: 'Sweet, sweet corn!' },
  { n: '26', title: 'Pumpkin', subtitle: 'A big pumpkin!' },
  { n: '27', title: 'Cabbage', subtitle: 'A leafy cabbage!' },
  { n: '28', title: 'Leafy Greens', subtitle: 'Fresh green leaves!' },
  { n: '29', title: 'Green Bean', subtitle: 'A long green bean!' },
  { n: '30', title: 'Open Pea Pod', subtitle: 'One, two, three peas!' },
];

/**
 * Writes `src` as one dark path: the union of its .cls-1 shapes with each later .cls-2 (white) shape cut out, in
 * drawing order. Returns the new file (in a temp folder; the sources are never changed).
 */
function flattenInk(ck: CanvasKit, src: string, out: string): string {
  const svg = readFileSync(src, 'utf8');
  const viewBox = /viewBox="([^"]+)"/.exec(svg)![1]!;
  let ink: Path = new ck.Path();
  for (const m of svg.matchAll(/<(path|polygon)\b[^>]*>/g)) {
    const el = m[0];
    const d = m[1] === 'path' ? /\sd="([^"]+)"/.exec(el)?.[1] : pointsToPath(/\spoints="([^"]+)"/.exec(el)?.[1]);
    if (!d) continue;
    const shape = ck.Path.MakeFromSVGString(d);
    if (!shape) continue;
    shape.setFillType(ck.FillType.Winding);
    const white = /\bclass="cls-2"/.test(el);
    ink = ck.Path.MakeFromOp(ink, shape, white ? ck.PathOp.Difference : ck.PathOp.Union) ?? ink;
  }
  writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${ink.toSVGString()}"/></svg>\n`);
  return out;
}

function pointsToPath(points: string | undefined): string | undefined {
  const nums = points?.trim().split(/[\s,]+/).map(Number);
  if (!nums || nums.length < 6) return undefined;
  const pairs = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push(`${nums[i]} ${nums[i + 1]}`);
  return `M${pairs.join(' L')} Z`;
}

async function main() {
  const ck = await CanvasKitInit({ locateFile: (file) => require.resolve(`canvaskit-wasm/bin/${file}`) });
  const tmp = join(tmpdir(), 'lcw-vegetables');
  mkdirSync(tmp, { recursive: true });
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `veg-${x.n}`.includes(w)))) {
    const a = new Art();
    const src = join(ROOT, `art/svg/vegetables/source/veg-${p.n}.svg`);
    addClipart(a, loadClipart(flattenInk(ck, src, join(tmp, `veg-${p.n}.svg`)), FIT, { dedupe: true }));
    pages.push({ id: `veg-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/vegetables'), 'vegetables', { theme: 'Vegetables', generator: 'tools/vegetables/generate.ts' });
}

if (require.main === module) void main();
