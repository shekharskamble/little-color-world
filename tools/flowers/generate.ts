// Generates the Flowers pages from the owner's "Bold Flowers" clipart
// (art/svg/flowers/source/flower-<nn>.svg, from ~/Desktop/Little Color World/BoldflowersSVG/Flowers-<nn>.svg).
//   npx tsx tools/flowers/generate.ts              writes art/svg/flowers/flower-<nn>.svg
//   npx tsx tools/flowers/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Monsters pages (tools/art/clipart.ts): no background, each flower drawn big and centred.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the page number (id `flower-<n>`) and the number in the clipart pack. `minCore` lowers the size at which solid
 * black is opened up. `target` is the line thickness lines are thinned to. */
type Pic = { n: string; title: string; subtitle: string; minCore?: number; target?: number };

const PICS: Pic[] = [
  { n: '01', title: 'Daffodil', subtitle: 'A sunny daffodil!' },
  { n: '02', title: 'Iris', subtitle: 'A pretty iris!' },
  { n: '03', title: 'Five Petals', subtitle: 'Count the five petals!' },
  { n: '04', title: 'Carnation', subtitle: 'A frilly carnation!' },
  { n: '05', title: 'Calla Lily', subtitle: 'A curly calla lily!' },
  { n: '06', title: 'Peony', subtitle: 'A big, fluffy peony!' },
  { n: '07', title: 'Daisy', subtitle: 'A happy daisy!' },
  { n: '08', title: 'Dahlia', subtitle: 'Lots of pointy petals!' },
  { n: '09', title: 'Tulip', subtitle: 'A tall tulip!' },
  { n: '10', title: 'Spring Tulip', subtitle: 'Hello, spring!' },
  { n: '11', title: 'Big Daisy', subtitle: 'A big round middle!' },
  { n: '12', title: 'Trumpet Daffodil', subtitle: 'Toot toot, a trumpet flower!' },
  { n: '13', title: 'Tall Iris', subtitle: 'A tall, tall iris!' },
  { n: '14', title: 'Little Flower', subtitle: 'A sweet little flower!' },
  { n: '15', title: 'Lily Cup', subtitle: 'A lily like a little cup!' },
  { n: '16', title: 'Star Flower', subtitle: 'Petals like a star!' },
  { n: '17', title: 'Pink Carnation', subtitle: 'Frilly, frilly petals!' },
  { n: '18', title: 'Orchid', subtitle: 'A pretty orchid!' },
  { n: '19', title: 'Rose', subtitle: 'A lovely rose!' },
  { n: '20', title: 'Sunflower', subtitle: 'A big, sunny sunflower!' },
  { n: '21', title: 'Chrysanthemum', subtitle: 'So many petals!' },
  { n: '22', title: 'Lily', subtitle: 'A lily with long petals!' },
  { n: '23', title: 'Poppy', subtitle: 'A round, happy poppy!' },
  { n: '24', title: 'Black-Eyed Susan', subtitle: 'A flower with a dark middle!' },
  { n: '25', title: 'Spring Blossom', subtitle: 'A blossom in spring!' },
  { n: '26', title: 'Garden Flower', subtitle: 'A flower from the garden!' },
  { n: '27', title: 'Marigold', subtitle: 'A frilly marigold!' },
  { n: '28', title: 'Pansy', subtitle: 'A pansy with a little face!' },
  { n: '29', title: 'Forget-Me-Not', subtitle: 'Lots of tiny flowers!' },
  { n: '30', title: 'Little Pansy', subtitle: 'Four round petals!' },
  { n: '31', title: 'Swirly Rose', subtitle: 'Round and round it goes!' },
  { n: '32', title: 'Aster', subtitle: 'Thin petals all around!' },
  { n: '33', title: 'Two Tulips', subtitle: 'Two tulips together!' },
  { n: '34', title: 'Cornflower', subtitle: 'Zig-zag petals!' },
  { n: '35', title: 'Gerbera', subtitle: 'A bright gerbera daisy!' },
  { n: '36', title: 'Snapdragon', subtitle: 'Little bells up the stem!' },
  { n: '37', title: 'Flower Spike', subtitle: 'Flowers all the way up!' },
  { n: '38', title: 'Flower Bunch', subtitle: 'A bunch of little flowers!' },
  { n: '39', title: 'Round Tulip', subtitle: 'A round, cosy tulip!' },
  { n: '40', title: 'Smiley Flower', subtitle: 'A big round flower!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `flower-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/flowers/source/flower-${p.n}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, target: p.target });
    pages.push({ id: `flower-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/flowers'), 'flowers', { theme: 'Flowers', generator: 'tools/flowers/generate.ts' });
}

if (require.main === module) void main();
