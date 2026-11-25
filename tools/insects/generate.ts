// Generates the Insects pages from the owner's insect pack (art/svg/insects/bugs/<Name>.svg, from
// ~/Desktop/Little Color World/Insects). It replaced the earlier insect clipart on 2026-11-25 (owner); that pack's
// generator is kept as tools/insects/generate-retired.ts and its insect-<name> page ids are not reused.
//   npx tsx tools/insects/generate.ts              writes art/svg/insects/bug-<id>.svg
//   npx tsx tools/insects/generate.ts --import     also imports each page (npm run lcw -- page import)
// The sources mix thick outlines with thin, tapered inner lines, so each is first redrawn with lines of one width
// (tools/insects/uniform_all.sh, into art/svg/insects/bugs-uniform/; owner 2026-11-25: "no uniformity between
// strokes"). Then converted like the other no-background packs (tools/art/clipart.ts): each bug big and centred.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** The redrawn lines' width (uniform_lines.py --width): kept as is, not thinned again. */
const LINE = 10.5;
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file name (without .svg); the page id is `bug-<id>`. The bugs have no faces, so no eyes are kept
 * black (a ladybird spot was taken for an eye). Lines the artist left open are closed in uniform_all.sh. */
type Pic = { id: string; src: string; title: string; subtitle: string; minCore?: number };

const PICS: Pic[] = [
  { id: 'butterfly', src: 'Butterfly', title: 'Butterfly', subtitle: 'Flutter, flutter, butterfly!' },
  { id: 'ant', src: 'Ant', title: 'Ant', subtitle: 'A tiny, busy ant!' },
  { id: 'aphid', src: 'Aphid', title: 'Aphid', subtitle: 'A little aphid!' },
  { id: 'bumblebee', src: 'Bumblebee', title: 'Bumblebee', subtitle: 'Buzz, buzz, bumblebee!' },
  { id: 'caterpillar', src: 'Caterpillar', title: 'Caterpillar', subtitle: 'Wiggle, wiggle, caterpillar!' },
  { id: 'cicada', src: 'Cicada', title: 'Cicada', subtitle: 'A singing cicada!' },
  { id: 'click-beetle', src: 'Click_beetle', title: 'Click Beetle', subtitle: 'Click, click, beetle!' },
  { id: 'damselfly', src: 'Damselfly', title: 'Damselfly', subtitle: 'A dainty damselfly!' },
  { id: 'dragonfly', src: 'Dragonfly', title: 'Dragonfly', subtitle: 'Zoom, zoom, dragonfly!' },
  { id: 'earwig', src: 'Earwig', title: 'Earwig', subtitle: 'An earwig with pincers!' },
  { id: 'eggs', src: 'Egg_cluster', title: 'Bug Eggs', subtitle: 'Tiny eggs, waiting to hatch!' },
  { id: 'firefly', src: 'Firefly', title: 'Firefly', subtitle: 'A glowing firefly!' },
  { id: 'honeybee', src: 'Honeybee', title: 'Honeybee', subtitle: 'A busy honeybee!' },
  { id: 'housefly', src: 'Housefly', title: 'Fly', subtitle: 'Buzz! A little fly!' },
  { id: 'hoverfly', src: 'Hoverfly', title: 'Hoverfly', subtitle: 'A hovering hoverfly!' },
  { id: 'net', src: 'Insect_net', title: 'Bug Net', subtitle: 'Catch a bug, then let it go!' },
  { id: 'ladybug', src: 'Ladybug', title: 'Ladybug', subtitle: 'A spotty ladybug!' },
  { id: 'leafhopper', src: 'Leafhopper', title: 'Leafhopper', subtitle: 'Hop, hop, leafhopper!' },
  { id: 'mayfly', src: 'Mayfly', title: 'Mayfly', subtitle: 'A floaty mayfly!' },
  { id: 'mosquito', src: 'Mosquito', title: 'Mosquito', subtitle: 'A tiny mosquito!' },
  { id: 'moth', src: 'Moth', title: 'Moth', subtitle: 'A fuzzy moth!' },
  { id: 'wasp-nest', src: 'Paper_wasp_nest', title: 'Wasp Nest', subtitle: 'A papery wasp nest!' },
  { id: 'praying-mantis', src: 'Praying_mantis', title: 'Praying Mantis', subtitle: 'A mantis says hello!' },
  { id: 'shield-bug', src: 'Shield_bug', title: 'Shield Bug', subtitle: 'A bug shaped like a shield!' },
  { id: 'cocoon', src: 'Silk_cocoon', title: 'Cocoon', subtitle: 'A cosy silk cocoon!' },
  { id: 'silverfish', src: 'Silverfish', title: 'Silverfish', subtitle: 'A wiggly silverfish!' },
  { id: 'stag-beetle', src: 'Stag_beetle', title: 'Stag Beetle', subtitle: 'A beetle with big horns!' },
  { id: 'stick-insect', src: 'Stick_insect', title: 'Stick Insect', subtitle: 'It looks like a stick!' },
  { id: 'wasp', src: 'Wasp', title: 'Wasp', subtitle: 'A stripy wasp!' },
  { id: 'weevil', src: 'Weevil', title: 'Weevil', subtitle: 'A weevil with a long nose!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.includes(`bug-${x.id}`))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/insects/bugs-uniform/${p.src}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, eyes: false, target: LINE, lineWidth: LINE });
    pages.push({ id: `bug-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/insects'), 'insects', { theme: 'Insects', generator: 'tools/insects/generate.ts' });
}

if (require.main === module) void main();
