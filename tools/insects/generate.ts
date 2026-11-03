// Generates the Insects pages from the owner's insect clipart (art/svg/insects/source/<name>.svg).
//   npx tsx tools/insects/generate.ts              writes art/svg/insects/insect-<name>.svg
//   npx tsx tools/insects/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Sea Animals (tools/art/clipart.ts). No background (owner, 2026-11-02): each bug is drawn big and
// centred on the page. The pack's scenery pieces (apple, bush, cloud, flowers, leaf, mushrooms) are not used.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file's name without `.svg`; the page id is `insect-<id>`. `spotLine` thins opened solid
 * spots (butterfly-03's closed eyes were too heavy, owner 2026-11-02). */
type Pic = { src: string; id: string; title: string; subtitle: string; spotLine?: number };

const PICS: Pic[] = [
  { src: 'ant-01', id: 'ant-01', title: 'Ant', subtitle: 'A tiny, busy ant!' },
  { src: 'ant-02', id: 'ant-02', title: 'Ant', subtitle: 'The ant carries a big leaf!' },
  { src: 'aphid', id: 'aphid', title: 'Aphid', subtitle: 'A little green aphid!' },
  { src: 'bee-01', id: 'bee-01', title: 'Bee', subtitle: 'Buzz buzz, busy bee!' },
  { src: 'bee-02', id: 'bee-02', title: 'Bee', subtitle: 'The bee picks a flower!' },
  { src: 'beetle', id: 'beetle', title: 'Beetle', subtitle: 'A shiny, spotty beetle!' },
  { src: 'butterfly-01', id: 'butterfly-01', title: 'Butterfly', subtitle: 'Flutter, flutter, butterfly!' },
  { src: 'butterfly-02', id: 'butterfly-02', title: 'Butterfly', subtitle: 'Big, pretty wings!' },
  { src: 'butterfly-03', id: 'butterfly-03', title: 'Butterfly', subtitle: 'A butterfly full of colours!', spotLine: 5 },
  { src: 'butterfly-04', id: 'butterfly-04', title: 'Butterfly', subtitle: 'The butterfly loves flowers!' },
  { src: 'caterpillar-01', id: 'caterpillar-01', title: 'Caterpillar', subtitle: 'A long, wiggly caterpillar!' },
  { src: 'caterpillar-02', id: 'caterpillar-02', title: 'Caterpillar', subtitle: 'Munch munch, yummy apple!' },
  { src: 'caterpillar-03', id: 'caterpillar-03', title: 'Caterpillar', subtitle: 'The caterpillar munches a leaf!' },
  { src: 'dragonfly', id: 'dragonfly', title: 'Dragonfly', subtitle: 'Zoom! The dragonfly flies!' },
  { src: 'firefly', id: 'firefly', title: 'Firefly', subtitle: 'The firefly glows at night!' },
  { src: 'grasshopper', id: 'grasshopper-01', title: 'Grasshopper', subtitle: 'Hop, hop, grasshopper!' },
  { src: 'grasshopper-02', id: 'grasshopper-02', title: 'Grasshopper', subtitle: 'Hop over the leaf!' },
  { src: 'june-bug', id: 'june-bug', title: 'June Bug', subtitle: 'A round, happy June bug!' },
  { src: 'ladybug-01', id: 'ladybug-01', title: 'Ladybug', subtitle: 'Count the ladybug’s spots!' },
  { src: 'ladybug-02', id: 'ladybug-02', title: 'Ladybug', subtitle: 'A ladybug and a flower!' },
  { src: 'ladybug-03', id: 'ladybug-03', title: 'Ladybug', subtitle: 'The ladybug sits on a flower!' },
  { src: 'mosquito', id: 'mosquito', title: 'Mosquito', subtitle: 'A silly little mosquito!' },
  { src: 'praying-mantis', id: 'praying-mantis', title: 'Praying Mantis', subtitle: 'A tall, green mantis!' },
  { src: 'slug', id: 'slug', title: 'Slug', subtitle: 'Slow and slimy slug!' },
  { src: 'snail-01', id: 'snail-01', title: 'Snail', subtitle: 'A snail with a swirly shell!' },
  { src: 'snail-02', id: 'snail-02', title: 'Snail', subtitle: 'The snail rides a leaf!' },
  { src: 'snail-03', id: 'snail-03', title: 'Snail', subtitle: 'A snail and a spotty mushroom!' },
  { src: 'spider-01', id: 'spider-01', title: 'Spider', subtitle: 'A friendly spider!' },
  { src: 'spider-02', id: 'spider-02', title: 'Spider', subtitle: 'The spider spins a web!' },
  { src: 'stink-bug', id: 'stink-bug', title: 'Stink Bug', subtitle: 'A funny stink bug!' },
  { src: 'walking-stick', id: 'walking-stick', title: 'Walking Stick', subtitle: 'It looks like a twig!' },
  { src: 'weevil', id: 'weevil', title: 'Weevil', subtitle: 'A weevil with a long nose!' },
  { src: 'worm', id: 'worm', title: 'Worm', subtitle: 'A wiggly, happy worm!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `insect-${x.id}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/insects/source/${p.src}.svg`), FIT);
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: MIN_CORE, maxRegions: 80, spotLine: p.spotLine });
    pages.push({ id: `insect-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/insects'), 'insects', { theme: 'Insects', generator: 'tools/insects/generate.ts' });
}

if (require.main === module) void main();
