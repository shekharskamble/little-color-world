// Generates the Monsters pages from the owner's "Cute Monsters" clipart
// (art/svg/monsters/source/monster-<pack number>.svg, from ~/Downloads/Cute Monsters/MonsCharA01/SVG/MonsChar<nnn>.svg).
//   npx tsx tools/monsters/generate.ts              writes art/svg/monsters/monster-<nn>.svg
//   npx tsx tools/monsters/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Food pages (tools/art/clipart.ts): no background, each monster drawn big and centred.
// Pages 11 (Pointy Ears), 14 (Shaggy Tall) and 17 (Lanky Lou) were removed by the owner (2026-11-03); their numbers
// are not reused.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the page number (id `monster-<n>`), `src` the number in the clipart pack. `eyeAt` marks each eye (source
 * units) where the converter guesses wrong. `minCore` lowers the size at which solid black is opened up. `target` is
 * the line thickness lines are thinned to (higher keeps thin details on heavily outlined drawings). */
type Pic = { n: string; src: string; title: string; subtitle: string; minCore?: number; eyeAt?: [number, number][]; target?: number };

const PICS: Pic[] = [
  { n: '01', src: '001', title: 'Tall Fuzzy', subtitle: 'A tall, fuzzy monster!' },
  { n: '02', src: '002', title: 'Snail Princess', subtitle: 'A princess with a shell!' },
  { n: '03', src: '003', title: 'Stripy Waver', subtitle: 'Hello, hello!' },
  { n: '04', src: '004', title: 'Floppy Ears', subtitle: 'Big floppy ears!' },
  { n: '05', src: '005', title: 'Spotty Blob', subtitle: 'Spots and little wings!' },
  { n: '06', src: '006', title: 'Monster King', subtitle: 'A king with one big eye!' },
  { n: '07', src: '007', title: 'Wiggly Waver', subtitle: 'A wiggly, waving monster!' },
  { n: '08', src: '008', title: 'Spotty Hugger', subtitle: 'Arms up for a hug!' },
  { n: '09', src: '009', title: 'Big Grin', subtitle: 'What a big smile!' },
  { n: '10', src: '010', title: 'Jelly Monster', subtitle: 'Long, wiggly legs!' },
  { n: '12', src: '012', title: 'Fluffy Bunny', subtitle: 'Soft and fluffy!' },
  { n: '13', src: '013', title: 'One Eye', subtitle: 'One big eye and lots of spots!' },
  { n: '15', src: '015', title: 'Fluffy Flyer', subtitle: 'A fluffy monster with wings!' },
  { n: '16', src: '016', title: 'Big Horns', subtitle: 'Fluffy with big horns!' },
  { n: '18', src: '018', title: 'Sleepy Dino', subtitle: 'Yawn! Time for bed!' },
  { n: '19', src: '019', title: 'Stripy Bunny', subtitle: 'Stripes and floppy ears!' },
  { n: '20', src: '020', title: 'Shy Squid', subtitle: 'A shy little squid!' },
  { n: '21', src: '021', title: 'Happy Fluff', subtitle: 'A happy, fluffy monster!' },
  { n: '22', src: '022', title: 'Hooray Monster', subtitle: 'Hands up, hooray!' },
  { n: '23', src: '023', title: 'Buzzy Blob', subtitle: 'One eye and little wings!' },
  { n: '24', src: '024', title: 'Grumpy Fluff', subtitle: 'A grumpy, fluffy monster!' },
  { n: '25', src: '025', title: 'Sleepy Blob', subtitle: 'A sleepy, slimy blob!' },
  { n: '26', src: '026', title: 'Little Devil', subtitle: 'Wings and a pointy tail!' },
  { n: '27', src: '027', title: 'Googly Eyes', subtitle: 'Big googly eyes!' },
  { n: '28', src: '028', title: 'Batty Blob', subtitle: 'One eye and bat wings!' },
  { n: '29', src: '029', title: 'Stripy Cyclops', subtitle: 'Stripes and one big eye!' },
  { n: '30', src: '030', title: 'Baby Dragon', subtitle: 'A cute baby dragon!' },
  { n: '31', src: '031', title: 'Octo Monster', subtitle: 'Lots of wiggly legs!' },
  { n: '32', src: '032', title: 'Bat Monster', subtitle: 'Big ears and bat wings!' },
  { n: '33', src: '033', title: 'Fuzzy Cyclops', subtitle: 'Fuzzy with one big eye!' },
  { n: '34', src: '034', title: 'Dragon King', subtitle: 'A dragon with a crown!' },
  { n: '35', src: '035', title: 'Winged Fluff', subtitle: 'Fluffy with bat wings!' },
  { n: '36', src: '036', title: 'Sad Dino', subtitle: 'Can you cheer him up?' },
  { n: '37', src: '037', title: 'Happy Dragon', subtitle: 'A happy little dragon!' },
  { n: '38', src: '038', title: 'Toothy Cyclops', subtitle: 'One eye and a big grin!' },
  { n: '39', src: '039', title: 'Unicorn Monster', subtitle: 'A horn and a spiky tail!' },
  { n: '40', src: '040', title: 'Hello Monster', subtitle: 'Wave hello!' },
  { n: '41', src: '048', title: 'Happy Blob', subtitle: 'One eye and arms up!' },
  { n: '42', src: '054', title: 'Three Eyes', subtitle: 'One, two, three eyes!' },
  { n: '43', src: '064', title: 'Curly Horns', subtitle: 'Fluffy with curly horns!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `monster-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/monsters/source/monster-${p.src}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, eyeAt: p.eyeAt, target: p.target });
    pages.push({ id: `monster-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/monsters'), 'monsters', { theme: 'Monsters', generator: 'tools/monsters/generate.ts' });
}

if (require.main === module) void main();
