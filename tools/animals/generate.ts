// Generates the Animals pages from the owner's cute animal clipart (art/svg/animals/cute-source/animal-<nn>.svg, copied
// from MeadMor0074-0124).
//   npx tsx tools/animals/generate.ts              writes art/svg/animals/animal-<nn>.svg
//   npx tsx tools/animals/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Dinosaurs (tools/art/clipart.ts). No background (owner, 2026-11-02): each animal is drawn big and
// centred on the page. Replaces the earlier scene pages (tools/animals/scenes-legacy.ts).
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };
const THIN_SPOTS = 5;

/**
 * `n` is the page number; the page id is `animal-<n>`. `src` is the owner's file it was copied from. `eyeAt` marks each
 * eye (source coordinates) where the converter's guess opened one up as a colourable spot.
 */
type Pic = { n: string; src: string; title: string; subtitle: string; minCore?: number; maxRegions?: number; eyeAt?: [number, number][] };

const PICS: Pic[] = [
  { n: '01', src: 'MeadMor0074', title: 'Piglet and Cupcake', subtitle: 'A piglet with a yummy cupcake!' },
  { n: '02', src: 'MeadMor0076', title: 'Cowboy Lamb', subtitle: 'Yee-haw, little lamb!' },
  { n: '03', src: 'MeadMor0078', title: 'Little Leopard', subtitle: 'So many spots to colour!' },
  { n: '04', src: 'MeadMor0079', title: 'Highland Calf', subtitle: 'A fluffy little cow!' },
  { n: '05', src: 'MeadMor0080', title: 'Hamster', subtitle: 'A round and happy hamster!' },
  { n: '06', src: 'MeadMor0082', title: 'Little Bull', subtitle: 'Huff, puff, little bull!', eyeAt: [[168, 297], [335, 243]] },
  { n: '07', src: 'MeadMor0086', title: 'Piglet in a Basket', subtitle: 'Peekaboo from the basket!', eyeAt: [[216, 261], [348, 267]] },
  { n: '08', src: 'MeadMor0091', title: 'Cosy Highland Cow', subtitle: 'A cow in a warm scarf!' },
  { n: '09', src: 'MeadMor0092', title: 'Dancing Elephant', subtitle: 'Dance, little elephant!' },
  { n: '10', src: 'MeadMor0095', title: 'Raccoon Treat', subtitle: 'A raccoon and a cupcake!' },
  { n: '11', src: 'MeadMor0096', title: 'Cowboy Piglet', subtitle: 'A piglet in a cowboy hat!' },
  { n: '12', src: 'MeadMor0097', title: 'Sleepy Raccoon', subtitle: 'Yawn! Time for bed!' },
  { n: '13', src: 'MeadMor0099', title: 'Little Monkey', subtitle: 'A cheeky little monkey!' },
  { n: '14', src: 'MeadMor0103', title: 'Bunny', subtitle: 'Hop, hop, little bunny!' },
  { n: '15', src: 'MeadMor0105', title: 'Armadillo', subtitle: 'A shell like a suit of armour!' },
  { n: '16', src: 'MeadMor0110', title: 'Happy Piglet', subtitle: 'Cupcake time!' },
  { n: '17', src: 'MeadMor0113', title: 'Shaggy Cow', subtitle: 'A cow with lots of hair!' },
  { n: '18', src: 'MeadMor0116', title: 'Tortoise', subtitle: 'Slow and steady!', eyeAt: [[177, 203]] },
  { n: '19', src: 'MeadMor0118', title: 'Rainy Day Mouse', subtitle: 'Splash in the puddle!' },
  { n: '20', src: 'MeadMor0124', title: 'Party Puppy', subtitle: 'A puppy at a party!', eyeAt: [[158, 301], [273, 328], [193, 351]] },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `animal-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/animals/cute-source/animal-${p.n}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: p.maxRegions ?? 80, thinSpots: THIN_SPOTS, eyeAt: p.eyeAt });
    pages.push({ id: `animal-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/animals'), 'animals', { theme: 'Animals', generator: 'tools/animals/generate.ts' });
}

if (require.main === module) void main();
