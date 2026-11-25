// Generates the Sea Animals pages from the owner's "Cute Fish" pack (art/svg/sea-animals/fish/<NN>.svg, from
// ~/Desktop/Little Color World/sea animals/selected/CUTE FISH-1-<NN>.svg). It replaced the earlier sea clipart on
// 2026-11-25 (owner); that pack's generator is kept as tools/sea-animals/generate-retired.ts and its sea-<name> page
// ids are not reused.
//   npx tsx tools/sea-animals/generate.ts              writes art/svg/sea-animals/ocean-<id>.svg
//   npx tsx tools/sea-animals/generate.ts --import     also imports each page (npm run lcw -- page import)
// Each source's lines are first trimmed to the other packs' thickness (tools/sea-animals/thin_all.sh,
// tools/art/uniform_lines.py --cap, into art/svg/sea-animals/fish-thin/): lines wider than 10.5 are trimmed, thinner
// lines, eyes, dots and little rings stay as drawn (owner 2026-11-25: "reduce the stroke thickness ... keep it consistent
// with other svgs"). Then every line is kept exactly as trimmed and only the white areas become colourable
// (tools/art/clipart.ts addClipart with smallParts; eye shines stay white). No seabed or bubbles; big and centred.
// (Two earlier attempts were dropped: a one-width redraw changed the shapes, and thinning in the converter hollowed
// pupils and opened dots into rings.)
import { join } from 'node:path';

import { addClipart, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file number; the page id is `ocean-<id>`. */
type Pic = { id: string; src: string; title: string; subtitle: string };

const PICS: Pic[] = [
  { id: 'clownfish', src: '14', title: 'Clownfish', subtitle: 'A stripy little clownfish!' },
  { id: 'oarfish', src: '01', title: 'Oarfish', subtitle: 'A long, wavy oarfish!' },
  { id: 'happy-fish', src: '02', title: 'Happy Fish', subtitle: 'A happy fish says hello!' },
  { id: 'crab', src: '03', title: 'Crab', subtitle: 'Snip, snap, little crab!' },
  { id: 'sturgeon', src: '07', title: 'Sturgeon', subtitle: 'A sturgeon with a pointy nose!' },
  { id: 'angelfish', src: '08', title: 'Angelfish', subtitle: 'A tall, stripy angelfish!' },
  { id: 'carp', src: '11', title: 'Carp', subtitle: 'A carp with whiskers!' },
  { id: 'lionfish', src: '15', title: 'Lionfish', subtitle: 'A lionfish with spiky fins!' },
  { id: 'seahorse', src: '16', title: 'Seahorse', subtitle: 'A curly little seahorse!' },
  { id: 'flying-fish', src: '17', title: 'Flying Fish', subtitle: 'Whoosh! A fish with wings!' },
  { id: 'sea-urchin', src: '18', title: 'Sea Urchin', subtitle: 'A spiky, smiley sea urchin!' },
  { id: 'anemone', src: '20', title: 'Sea Anemone', subtitle: 'A wiggly sea anemone!' },
  { id: 'striped-fish', src: '21', title: 'Stripy Fish', subtitle: 'A fish with big stripes!' },
  { id: 'arowana', src: '23', title: 'Arowana', subtitle: 'A long, scaly arowana!' },
  { id: 'perch', src: '24', title: 'Perch', subtitle: 'A perch with lots of scales!' },
  { id: 'fancy-fish', src: '25', title: 'Fancy Fish', subtitle: 'A fish with frilly fins!' },
  { id: 'sea-plant', src: '26', title: 'Sea Plant', subtitle: 'A bubbly sea plant!' },
  { id: 'betta', src: '34', title: 'Betta Fish', subtitle: 'A betta with a swishy tail!' },
  { id: 'seagrass', src: '35', title: 'Sea Grass', subtitle: 'Tall sea grass sways!' },
  { id: 'butterflyfish', src: '36', title: 'Butterflyfish', subtitle: 'A stripy butterflyfish!' },
  { id: 'honeycomb-fish', src: '39', title: 'Honeycomb Fish', subtitle: 'A fish with a pattern!' },
  { id: 'tetra', src: '40', title: 'Tetra', subtitle: 'A little tetra fish!' },
  { id: 'discus', src: '42', title: 'Discus Fish', subtitle: 'A round, wavy discus fish!' },
  { id: 'sponges', src: '43', title: 'Sea Sponges', subtitle: 'Sea sponges on the sand!' },
  { id: 'kelp', src: '47', title: 'Kelp', subtitle: 'Wavy kelp under the sea!' },
  { id: 'flower-fish', src: '50', title: 'Flowery Fish', subtitle: 'A fish covered in flowers!' },
  { id: 'grouper', src: '51', title: 'Grouper', subtitle: 'A big grouper says ooh!' },
  { id: 'pearl-clam', src: '52', title: 'Clam and Pearl', subtitle: 'A clam with a shiny pearl!' },
  { id: 'hammerhead', src: '55', title: 'Hammerhead Shark', subtitle: 'A smiley hammerhead shark!' },
  { id: 'goldfish', src: '56', title: 'Goldfish', subtitle: 'A goldfish with a fancy tail!' },
  { id: 'squid', src: '65', title: 'Squid', subtitle: 'A squid with curly arms!' },
  { id: 'sunfish', src: '69', title: 'Sunfish', subtitle: 'A big, round sunfish!' },
  { id: 'turtle', src: '71', title: 'Sea Turtle', subtitle: 'A sea turtle swims along!' },
  { id: 'starfish', src: '73', title: 'Starfish', subtitle: 'A smiley starfish!' },
  { id: 'sea-dragon', src: '76', title: 'Leafy Sea Dragon', subtitle: 'It looks like seaweed!' },
  { id: 'eel', src: '77', title: 'Eel', subtitle: 'A wiggly, spotty eel!' },
  { id: 'guppy', src: '78', title: 'Guppy', subtitle: 'A spotty little guppy!' },
  { id: 'water-plant', src: '79', title: 'Leafy Plant', subtitle: 'Leaves under the water!' },
  { id: 'anglerfish', src: '80', title: 'Anglerfish', subtitle: 'An anglerfish with a light!' },
  { id: 'koi', src: '82', title: 'Koi', subtitle: 'A spotty koi fish!' },
  { id: 'sea-snail', src: '85', title: 'Sea Snail', subtitle: 'A sea snail with a twisty shell!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.includes(`ocean-${x.id}`))) {
    const a = new Art();
    addClipart(a, loadClipart(join(ROOT, `art/svg/sea-animals/fish-thin/${p.src}.svg`), FIT, { dedupe: true }), 1, { smallParts: true });
    pages.push({ id: `ocean-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/sea-animals'), 'sea-animals', { theme: 'Sea Animals', generator: 'tools/sea-animals/generate.ts' });
}

if (require.main === module) void main();
