// Generates the Dinosaurs pages from the owner's "Cute Dino" clipart (art/svg/dinosaurs/cute-source/dino-<nn>.svg).
//   npx tsx tools/dinosaurs/generate.ts              writes art/svg/dinosaurs/dino-<nn>.svg
//   npx tsx tools/dinosaurs/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Unicorns (tools/art/clipart.ts). No background (owner, 2026-11-02): each dinosaur is drawn big and
// centred on the page. Replaces the earlier scene pages (tools/dinosaurs/scenes-legacy.ts).
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };
const THIN_SPOTS = 5;

/** `n` is the source number; the page id is `dino-<n>`. 01-30 are the files the owner attached. */
type Pic = { n: string; title: string; subtitle: string; minCore?: number; maxRegions?: number };

const PICS: Pic[] = [
  { n: '01', title: 'Baby Dino', subtitle: 'A happy little dino!' },
  { n: '02', title: 'T-Rex', subtitle: 'A friendly T-Rex says hi!' },
  { n: '03', title: 'Sail Dino', subtitle: 'A dino with a big sail!' },
  { n: '04', title: 'Spinosaurus', subtitle: 'Stomp, stomp, little dino!' },
  { n: '05', title: 'Long Neck', subtitle: 'A tall dino sits down!' },
  { n: '06', title: 'Brachiosaurus', subtitle: 'Such a long neck!' },
  { n: '07', title: 'Ankylosaurus', subtitle: 'A bumpy armoured dino!' },
  { n: '08', title: 'Baby Ankylosaurus', subtitle: 'Spikes and a club tail!' },
  { n: '09', title: 'Sitting Dino', subtitle: 'Time for a little rest!' },
  { n: '10', title: 'Diplodocus', subtitle: 'A long dino on a walk!' },
  { n: '11', title: 'Feathered Dino', subtitle: 'A dino with feathers!' },
  { n: '12', title: 'Flying Feathers', subtitle: 'Flap, flap, feathery dino!' },
  { n: '13', title: 'Triceratops', subtitle: 'Three horns and a frill!' },
  { n: '14', title: 'Baby Triceratops', subtitle: 'A spotty triceratops!' },
  { n: '15', title: 'Spotty Long Neck', subtitle: 'Count the spots!' },
  { n: '16', title: 'Sitting Long Neck', subtitle: 'A long neck sits and smiles!' },
  { n: '17', title: 'Pterodactyl', subtitle: 'A flying dino lands!' },
  { n: '18', title: 'Flying Pterodactyl', subtitle: 'Up, up in the sky!' },
  { n: '19', title: 'Running T-Rex', subtitle: 'Run, little T-Rex, run!' },
  { n: '20', title: 'Chubby T-Rex', subtitle: 'A chubby dino sits down!' },
  { n: '21', title: 'Waving T-Rex', subtitle: 'Wave hello to the T-Rex!' },
  { n: '22', title: 'Round Dino', subtitle: 'A round and cuddly dino!' },
  { n: '23', title: 'Horned Dino', subtitle: 'A dino with little horns!' },
  { n: '24', title: 'Spotty Horned Dino', subtitle: 'Horns and lots of spots!' },
  { n: '25', title: 'Parasaurolophus', subtitle: 'A dino with a long crest!' },
  { n: '26', title: 'Baby Parasaurolophus', subtitle: 'A crest on top!' },
  { n: '27', title: 'Stegosaurus', subtitle: 'Plates all along its back!' },
  { n: '28', title: 'Baby Stegosaurus', subtitle: 'A spiky little stegosaurus!' },
  { n: '29', title: 'Walking Dino', subtitle: 'A dino out for a stroll!' },
  { n: '30', title: 'Little Long Neck', subtitle: 'A sweet little dino!' },
  // A subset of 31-85 (2026-11-02): the dinosaurs and dino-world scenes. Left out: lone props (eggs, leaves, clouds,
  // stars, rocks, sun, footprints, grass), the two busy full scenes (55, 56) and near-repeats of 01-30.
  { n: '31', title: 'Smiling T-Rex', subtitle: 'A T-Rex with a big smile!' },
  { n: '32', title: 'Spotty T-Rex', subtitle: 'Spots from head to tail!' },
  { n: '33', title: 'Hatching Friends', subtitle: 'Three babies say hello!' },
  { n: '34', title: 'Happy Pterodactyl', subtitle: 'Wings out wide!' },
  { n: '37', title: 'Swimming Dino', subtitle: 'Splash, splash, little dino!' },
  { n: '38', title: 'Sea Long Neck', subtitle: 'A dino in the sea!' },
  { n: '39', title: 'Volcano', subtitle: 'Whoosh goes the volcano!' },
  { n: '43', title: 'Dino Nest', subtitle: 'Three eggs in a cosy nest!' },
  { n: '49', title: 'Peekaboo Dino', subtitle: 'Peekaboo from the egg!' },
  { n: '57', title: 'Cuddly Dino', subtitle: 'A soft and cuddly dino!' },
  { n: '59', title: 'Hatching Triceratops', subtitle: 'A baby pops out!' },
  { n: '61', title: 'Walking Long Neck', subtitle: 'Off for a walk!' },
  { n: '62', title: 'Laughing Triceratops', subtitle: 'Ha ha, happy dino!' },
  { n: '63', title: 'Stomping T-Rex', subtitle: 'Stomp, stomp, stomp!' },
  { n: '64', title: 'Sleepy Stegosaurus', subtitle: 'Shh, time for a nap!' },
  { n: '65', title: 'Sleepy T-Rex', subtitle: 'Sweet dreams, little dino!' },
  { n: '66', title: 'Sleepy Triceratops', subtitle: 'A cosy little nap!' },
  { n: '67', title: 'Sleepy Long Neck', subtitle: 'Curled up and snoozing!' },
  { n: '68', title: 'Little Stegosaurus', subtitle: 'Small and spiky!' },
  { n: '72', title: 'Egg Baby', subtitle: 'Just hatched!' },
  { n: '73', title: 'Little Triceratops', subtitle: 'A frill and two horns!' },
  { n: '77', title: 'Little Crest Dino', subtitle: 'A crest like a hat!' },
  { n: '78', title: 'Little Pterodactyl', subtitle: 'Ready to fly!' },
  { n: '85', title: 'Dino Triplets', subtitle: 'Three babies, one big egg!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `dino-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/dinosaurs/cute-source/dino-${p.n}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: p.maxRegions ?? 80, thinSpots: THIN_SPOTS });
    pages.push({ id: `dino-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/dinosaurs'), 'dinosaurs', { theme: 'Dinosaurs', generator: 'tools/dinosaurs/generate.ts' });
}

if (require.main === module) void main();
