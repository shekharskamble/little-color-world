// Generates the Halloween pages from the owner's "Cute Spooky SVG Bundle, Kawaii Halloween" clipart
// (art/svg/halloween/source/halloween-<nn>.svg from Halloween.zip "Pack 1 (20 designs)/SVG/<n>.svg", and
// halloween-p2-<nn>.svg, -p3-<nn>.svg, -p4-<nn>.svg, -p5-<nn>.svg from "Pack 2 (30 designs)", "Pack 3 (15 designs)", "Pack 4 (20 designs)", "Pack 5 (5 designs)").
//   npx tsx tools/halloween/generate.ts              writes art/svg/halloween/halloween-<nn>.svg
//   npx tsx tools/halloween/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Christmas pages (tools/art/clipart.ts): no background, each picture drawn big and centred.
// Page 26 (Skeleton Fox, Pack 3 file 5) was removed by the owner (2026-11-24); its number is not reused.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the page number (id `halloween-<n>`), `src` the source file (Pack 1 number, or `p<pack>-<n>`).
 * `eyeAt` marks each eye (source units) where the converter guesses wrong. `minCore` lowers the size at which solid
 * black is opened up. `keepSpots` keeps loose solid shapes black (Pack 3 draws eyes as plain black ovals). */
type Pic = { n: string; src: string; title: string; subtitle: string; minCore?: number; eyeAt?: [number, number][]; keepSpots?: boolean };

const PICS: Pic[] = [
  { n: '01', src: '01', title: 'Happy Pumpkin', subtitle: 'A smiley pumpkin!' },
  { n: '02', src: '03', title: 'Little Bat', subtitle: 'Flap, flap, little bat!' },
  { n: '03', src: '04', title: 'Ghost in a Hat', subtitle: 'A ghost in a witch hat!' },
  { n: '04', src: '05', title: 'Magic Broom', subtitle: 'Swish, swish, magic broom!' },
  { n: '05', src: '06', title: 'Bubbling Pot', subtitle: 'Bubble, bubble, pop!' },
  { n: '06', src: '07', title: 'Sweet Candy', subtitle: 'A happy, sweet candy!' },
  { n: '07', src: '08', title: 'Little Spider', subtitle: 'A spider says hello!' },
  { n: '08', src: '09', title: 'Spider Web', subtitle: 'A big, twisty web!' },
  { n: '09', src: '11', title: 'Candle Friend', subtitle: 'Three little flames!' },
  { n: '10', src: '12', title: 'Friendly Ghost', subtitle: 'Boo! A friendly ghost!' },
  { n: '11', src: '16', title: 'Little Vampire', subtitle: 'A vampire with a cape!' },
  { n: '12', src: '17', title: 'Mummy', subtitle: 'A mummy waves hello!' },
  { n: '13', src: '18', title: 'Spooky House', subtitle: 'A happy little house!' },
  { n: '14', src: '20', title: 'Little Witch', subtitle: 'Zoom! A witch on her broom!' },
  { n: '15', src: 'p2-07', title: 'Happy Skull', subtitle: 'A big, smiley skull!', eyeAt: [[4360, 6143], [7213, 6143]] },
  { n: '16', src: 'p2-10', title: 'Moon and Clouds', subtitle: 'The moon peeks out!' },
  { n: '17', src: 'p2-11', title: 'Black Cat', subtitle: 'Meow! A Halloween cat!', eyeAt: [[3241, 7388], [5025, 7277]] },
  { n: '18', src: 'p2-14', title: 'Scarecrow', subtitle: 'A scarecrow in a witch hat!', eyeAt: [[5012, 6995], [6195, 6946]] },
  { n: '19', src: 'p2-15', title: 'Bony Hand', subtitle: 'Wave hello, bony hand!' },
  { n: '20', src: 'p2-16', title: 'Crossbones', subtitle: 'Two big bones!' },
  { n: '21', src: 'p2-19', title: 'Night Owl', subtitle: 'Hoo, hoo! A wise owl!' },
  { n: '22', src: 'p2-21', title: 'Pumpkin Head', subtitle: 'Peekaboo, pumpkin face!', eyeAt: [[4530, 7882], [6809, 7882], [5845, 7296]] },
  { n: '23', src: 'p2-22', title: 'Mummy Walk', subtitle: 'A mummy goes for a walk!', eyeAt: [[4981, 7659], [6526, 7661]] },
  { n: '24', src: 'p2-24', title: 'Count Vampire', subtitle: 'A vampire with tiny fangs!', eyeAt: [[5039, 7127], [6820, 7126]] },
  { n: '25', src: 'p3-03', title: 'Wizard Frog', subtitle: 'A frog with a magic wand!', keepSpots: true },
  { n: '27', src: 'p3-06', title: 'Pumpkin Puppy', subtitle: 'A puppy in a pumpkin hat!', keepSpots: true },
  { n: '28', src: 'p3-07', title: 'Witchy Owl', subtitle: 'An owl sits on a pumpkin!', keepSpots: true },
  { n: '29', src: 'p3-08', title: 'Pumpkin Piggy', subtitle: 'A piggy in a pumpkin hood!', keepSpots: true },
  { n: '30', src: 'p3-10', title: 'Witch Frog', subtitle: 'A frog stirs the pot!', keepSpots: true },
  { n: '31', src: 'p3-11', title: 'Monster Monkey', subtitle: 'A monkey dressed up as a monster!', keepSpots: true },
  { n: '32', src: 'p3-12', title: 'Mummy Kitty', subtitle: 'A sleepy mummy kitty!', keepSpots: true },
  { n: '33', src: 'p3-14', title: 'Pumpkin Bear', subtitle: 'A bear in a big pumpkin!', keepSpots: true },
  { n: '34', src: 'p3-15', title: 'Bat-Wing Deer', subtitle: 'A little deer with bat wings!' },
  { n: '35', src: 'p4-01', title: 'Howling Wolf', subtitle: 'Aroo! A little wolf!' },
  { n: '36', src: 'p4-05', title: 'Ghost Kitty', subtitle: 'A kitty ghost says boo!' },
  { n: '37', src: 'p4-10', title: 'Top Hat Skeleton', subtitle: 'A skeleton in a top hat!' },
  { n: '38', src: 'p4-11', title: 'Flying Pot', subtitle: 'A magic pot with bat wings!' },
  { n: '39', src: 'p4-14', title: 'Magic Mirror', subtitle: 'A ghost in the mirror!' },
  { n: '40', src: 'p4-16', title: 'Pumpkin Ghost', subtitle: 'A ghost on a pumpkin!', keepSpots: true },
  { n: '41', src: 'p4-17', title: 'Skeleton Dance', subtitle: 'Wave your bony arms!' },
  { n: '42', src: 'p4-20', title: 'Flying Witch', subtitle: 'Up, up on her broom!' },
  { n: '43', src: 'p5-01', title: 'Trick-or-Treat Ghost', subtitle: 'A ghost with a candy basket!', keepSpots: true },
  { n: '44', src: 'p5-02', title: 'Heart-Eyes Pumpkin', subtitle: 'A pumpkin full of love!' },
  { n: '45', src: 'p5-04', title: 'Cat in a Pot', subtitle: 'A kitty in a magic pot!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `halloween-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/halloween/source/halloween-${p.src}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, eyeAt: p.eyeAt, keepSpots: p.keepSpots });
    pages.push({ id: `halloween-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/halloween'), 'halloween', { theme: 'Halloween', generator: 'tools/halloween/generate.ts' });
}

if (require.main === module) void main();
