// Generates the Christmas pages from the owner's "400+ Kawaii Christmas" clipart
// (art/svg/christmas/source/christmas-<pack number>.svg).
//   npx tsx tools/christmas/generate.ts              writes art/svg/christmas/christmas-<nn>.svg
//   npx tsx tools/christmas/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Unicorns (tools/art/clipart.ts). No background (owner, 2026-11-02): each picture is drawn big and
// centred on the page.
import { join } from 'node:path';

import { addClipartRegions, Art, dropRings, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the page number (id `christmas-<n>`), `src` the number in the clipart pack. `eyeAt` marks each eye (source units) where the converter guesses wrong. `dropRings` leaves out small rings
 * (source units, inside each ring), e.g. cheek circles the owner did not want. `minCore` lowers the size at
 * which solid black is opened up. */
type Pic = { n: string; src: string; title: string; subtitle: string; minCore?: number; eyeAt?: [number, number][]; dropRings?: [number, number][] };

const PICS: Pic[] = [
  { n: '01', src: '007', title: 'Santa', subtitle: 'Ho, ho, ho! Santa has a big sack!', eyeAt: [[151.25, 70.5], [182, 62]] },
  { n: '02', src: '025', title: 'Busy Elf', subtitle: 'The elf wraps a present!', eyeAt: [[115, 102.75], [158.75, 109.25]], dropRings: [[108.5, 113.8], [164.6, 121.9]] },
  { n: '03', src: '031', title: 'Snowman Snow Globe', subtitle: 'Shake it and watch it snow!', eyeAt: [[114.25, 115], [158.75, 117.5]] },
  { n: '04', src: '042', title: 'Sitting Reindeer', subtitle: 'Jingle goes the little bell!', eyeAt: [[99.25, 127.75], [173.5, 124.25]] },
  { n: '05', src: '043', title: 'Little Reindeer', subtitle: 'A reindeer in a cosy scarf!', minCore: 600 },
  { n: '06', src: '058', title: 'Gingerbread Chef', subtitle: 'A gingerbread man in a chef hat!' },
  { n: '07', src: '060', title: 'Gingerbread House', subtitle: 'A house you can eat!' },
  { n: '08', src: '062', title: 'Snowy Cabin', subtitle: 'Snow on the roof!' },
  { n: '09', src: '066', title: 'Waving Bear', subtitle: 'The bear waves hello!', eyeAt: [[98.75, 83.75], [178.75, 83.75]] },
  { n: '10', src: '079', title: 'Penguin', subtitle: 'The penguin holds a bauble!' },
  { n: '11', src: '090', title: 'Christmas Tree', subtitle: 'A star on the top!' },
  { n: '12', src: '112', title: 'Kitten in a Basket', subtitle: 'A kitten in a Santa hat!' },
  { n: '13', src: '122', title: 'Reindeer Puppy', subtitle: 'A puppy with antlers!' },
  { n: '14', src: '132', title: 'Gnome', subtitle: 'The gnome has a candy cane!' },
  { n: '15', src: '160', title: 'Snow Friends', subtitle: 'A snowman and a penguin!' },
  { n: '16', src: '161', title: 'Gingerbread Pair', subtitle: 'Two gingerbread friends!' },
  { n: '17', src: '164', title: 'Elf Twins', subtitle: 'Two elves carry a gift!' },
  { n: '18', src: '165', title: 'Santa and Reindeer', subtitle: 'Best friends at Christmas!' },
  { n: '19', src: '178', title: 'Drum', subtitle: 'Rat-a-tat-tat!' },
  { n: '20', src: '180', title: 'Toy Train', subtitle: 'Choo choo, presents coming!' },
  { n: '21', src: '186', title: 'Tree Snow Globe', subtitle: 'A tree inside a snow globe!' },
  { n: '22', src: '192', title: 'Wreath', subtitle: 'A wreath with a big bow!' },
  { n: '23', src: '196', title: 'Candles', subtitle: 'Three happy candles!' },
  { n: '24', src: '213', title: 'Christmas Cupcake', subtitle: 'A cupcake in a Santa hat!' },
  { n: '25', src: '218', title: 'Christmas Pudding', subtitle: 'Yummy pudding with holly!' },
  { n: '26', src: '240', title: 'Christmas Cookies', subtitle: 'Cookies for Santa!' },
  { n: '27', src: '249', title: 'Sleigh', subtitle: 'A sleigh full of presents!' },
  { n: '28', src: '260', title: 'Christmas Jumper', subtitle: 'A cosy, snuggly jumper!' },
  { n: '29', src: '299', title: 'Fireplace', subtitle: 'A stocking by the fire!' },
  { n: '30', src: '315', title: 'Mitten', subtitle: 'A warm mitten with hearts!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `christmas-${x.n}`.includes(w)))) {
    const a = new Art();
    const loaded = loadClipart(join(ROOT, `art/svg/christmas/source/christmas-${p.src}.svg`), FIT, { dedupe: true });
    const clip = p.dropRings ? dropRings(loaded, p.dropRings) : loaded;
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, eyeAt: p.eyeAt });
    pages.push({ id: `christmas-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/christmas'), 'christmas', { theme: 'Christmas', generator: 'tools/christmas/generate.ts' });
}

if (require.main === module) void main();
