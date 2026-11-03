// Generates the Unicorns pages from the owner's unicorn clipart (art/svg/unicorns/source/unicorn-<nn>.svg).
//   npx tsx tools/unicorns/generate.ts              writes art/svg/unicorns/unicorn-<nn>.svg
//   npx tsx tools/unicorns/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Insects (tools/art/clipart.ts). No background (owner, 2026-11-02): each unicorn is drawn big and
// centred on the page. Replaces the hand-drawn Rainbow Unicorn.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the source number; the page id is `unicorn-<n>`. `minCore` lowers the size at which solid black is opened
 * up (07's small black hooves must become colourable). */
type Pic = { n: string; title: string; subtitle: string; minCore?: number };
/** Nostril rings are drawn this thick inside their own edge (owner: the nostrils were too thick). */
const THIN_SPOTS = 5;

const PICS: Pic[] = [
  { n: '01', title: 'Winged Unicorn', subtitle: 'A little unicorn with wings!' },
  { n: '02', title: 'Donut Unicorn', subtitle: 'The unicorn sits on a donut!' },
  { n: '03', title: 'Winged Unicorn', subtitle: 'Flap, flap, little wings!' },
  { n: '04', title: 'Flower Unicorn', subtitle: 'Roses on her head!' },
  { n: '05', title: 'Cloud Unicorn', subtitle: 'A unicorn ready to fly!' },
  { n: '06', title: 'Flower Crown Unicorn', subtitle: 'A crown of pretty flowers!' },
  { n: '07', title: 'Spotty Unicorn', subtitle: 'Count the unicorn’s spots!', minCore: 900 },
  { n: '08', title: 'Heart Unicorn', subtitle: 'The unicorn hugs a heart!' },
  { n: '09', title: 'Happy Unicorn', subtitle: 'A happy, chubby unicorn!' },
  { n: '10', title: 'Sitting Unicorn', subtitle: 'The unicorn sits down to rest!' },
  { n: '11', title: 'Baby Unicorn', subtitle: 'Big, sparkly eyes!' },
  { n: '12', title: 'Walking Unicorn', subtitle: 'Clip clop, little unicorn!' },
  { n: '13', title: 'Prancing Unicorn', subtitle: 'The unicorn lifts a hoof!' },
  { n: '14', title: 'Flying Unicorn', subtitle: 'Up, up and away!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `unicorn-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/unicorns/source/unicorn-${p.n}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, thinSpots: THIN_SPOTS });
    pages.push({ id: `unicorn-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/unicorns'), 'unicorns', { theme: 'Unicorns', generator: 'tools/unicorns/generate.ts' });
}

if (require.main === module) void main();
