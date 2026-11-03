// Generates the Sea Animals pages from the owner's sea clipart (art/svg/sea-animals/source/NNN.svg).
//   npx tsx tools/sea-animals/generate.ts              writes art/svg/sea-animals/sea-<name>.svg
//   npx tsx tools/sea-animals/generate.ts --import     also imports each page (npm run lcw -- page import)
// The clipart is converted like the Dinosaurs (tools/art/clipart.ts): lines thinned to the Animals thickness, every
// closed shape a region. The background is kept minimal (owner, 2026-11-02): swimmers get a sandy seabed and a few
// bubbles, shore animals only the sand, and pictures that already have scenery (bubbles, seaweed, waves) get nothing.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart, seeded } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';
import { circle, n } from '../art/primitives';

type Rand = () => number;
type Box = { minX: number; minY: number; maxX: number; maxY: number };
/** sea: seabed and bubbles. shore: sand only. none: the picture as drawn. */
type Scene = 'sea' | 'shore' | 'none';

const W = 1024;
const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** The seabed's (and the sand's) top edge. The picture stands just above it so no outline crosses the picture. */
const FLOOR_Y = 700;

function floor(a: Art, name: string) {
  a.r(name, `<path d="M -20,${FLOOR_Y} C 220,${FLOOR_Y - 14} 420,${FLOOR_Y + 12} 620,${FLOOR_Y} C 800,${FLOOR_Y - 12} 920,${FLOOR_Y + 8} ${W + 20},${FLOOR_Y - 4} V 790 H -20 Z"`);
}

/** A bubble (the big ones with a little shine). Small ones are `small-` parts (allowed below the area minimum). */
function bubble(a: Art, name: string, x: number, y: number, r: number) {
  a.r(r < 20 ? `small-${name}` : name, circle(x, y, r));
  if (r >= 24) a.l(`M ${n(x - r * 0.55)},${n(y - r * 0.1)} Q ${n(x - r * 0.5)},${n(y - r * 0.5)} ${n(x - r * 0.1)},${n(y - r * 0.58)}`);
}

/** The seabed and one short column of bubbles on each side, wherever they clear the picture. */
function sea(a: Art, rand: Rand, box: Box) {
  floor(a, 'seabed');
  let k = 0;
  for (const x0 of [90, 934]) {
    let x = x0;
    let y = 600 - rand() * 60;
    let r = 26;
    for (let i = 0; i < 3; i++) {
      const pad = r + 16;
      if (x + pad < box.minX || x - pad > box.maxX || y + pad < box.minY || y - pad > box.maxY) bubble(a, `bubble-${++k}`, x, y, r);
      y -= r * 2.8 + 14;
      x += (rand() - 0.5) * 30;
      r *= 0.75;
    }
  }
}

// --- The pictures. `n` is the source file's number.

type Pic = { id: string; title: string; subtitle: string; n: number; scene: Scene };

// The three coral pictures (sources 054, 076, 079) are not used: the owner removed them, 2026-11-02.
const PICS: Pic[] = [
  { n: 1, id: 'dolphin-02', title: 'Dolphin', subtitle: 'The dolphin jumps and plays!', scene: 'sea' },
  { n: 2, id: 'dolphin-03', title: 'Dolphin', subtitle: 'A dolphin with a pretty flower!', scene: 'sea' },
  { n: 3, id: 'mermaid-seahorse', title: 'Mermaid and Seahorse', subtitle: 'Best friends under the sea!', scene: 'sea' },
  { n: 4, id: 'whale-01', title: 'Whale', subtitle: 'Splash! The whale blows water!', scene: 'sea' },
  { n: 5, id: 'whale-02', title: 'Whale', subtitle: 'A big, happy whale!', scene: 'sea' },
  { n: 6, id: 'starfish-01', title: 'Starfish', subtitle: 'A starfish shaped like a star!', scene: 'sea' },
  { n: 7, id: 'crab-01', title: 'Crab', subtitle: 'Snip snap! The crab walks sideways!', scene: 'sea' },
  { n: 8, id: 'narwhal-01', title: 'Narwhal', subtitle: 'The narwhal has a long horn!', scene: 'sea' },
  { n: 9, id: 'manta-ray', title: 'Manta Ray', subtitle: 'The ray glides like a kite!', scene: 'sea' },
  { n: 10, id: 'squid', title: 'Squid', subtitle: 'A squid with wiggly arms!', scene: 'sea' },
  { n: 11, id: 'crab-02', title: 'Crab', subtitle: 'A crab on the sandy rock!', scene: 'none' },
  { n: 12, id: 'seahorse-01', title: 'Seahorse', subtitle: 'The seahorse curls its tail!', scene: 'sea' },
  { n: 13, id: 'seahorse-02', title: 'Seahorse', subtitle: 'A spiky little seahorse!', scene: 'sea' },
  { n: 14, id: 'shrimp', title: 'Shrimp', subtitle: 'A shrimp with big claws!', scene: 'sea' },
  { n: 15, id: 'lobster', title: 'Lobster', subtitle: 'The lobster waves hello!', scene: 'sea' },
  { n: 16, id: 'submarine', title: 'Submarine', subtitle: 'Deep down in the submarine!', scene: 'sea' },
  { n: 17, id: 'seal-01', title: 'Seal', subtitle: 'The seal rests on the beach!', scene: 'shore' },
  { n: 18, id: 'jellyfish-01', title: 'Jellyfish', subtitle: 'A jellyfish with a flower!', scene: 'sea' },
  { n: 19, id: 'seahorse-03', title: 'Seahorse', subtitle: 'Bubbles all around the seahorse!', scene: 'none' },
  { n: 20, id: 'otter-01', title: 'Sea Otter', subtitle: 'The otter swims on its back!', scene: 'none' },
  { n: 21, id: 'narwhal-02', title: 'Narwhal', subtitle: 'A spotty narwhal!', scene: 'sea' },
  { n: 22, id: 'narwhal-03', title: 'Narwhal', subtitle: 'A round, happy narwhal!', scene: 'sea' },
  { n: 23, id: 'otter-02', title: 'Otter', subtitle: 'The otter says hello!', scene: 'shore' },
  { n: 24, id: 'seagull-01', title: 'Seagull', subtitle: 'A seagull by the sea!', scene: 'shore' },
  { n: 25, id: 'otter-03', title: 'Otter', subtitle: 'The otter floats in the water!', scene: 'none' },
  { n: 26, id: 'otter-04', title: 'Otter', subtitle: 'A cuddly little otter!', scene: 'shore' },
  { n: 27, id: 'otter-05', title: 'Otter', subtitle: 'The otter holds its toes!', scene: 'shore' },
  { n: 28, id: 'turtle-01', title: 'Sea Turtle', subtitle: 'The turtle swims slowly!', scene: 'sea' },
  { n: 29, id: 'stingray', title: 'Stingray', subtitle: 'The stingray swishes its tail!', scene: 'sea' },
  { n: 30, id: 'turtle-02', title: 'Sea Turtle', subtitle: 'A turtle on the waves!', scene: 'none' },
  { n: 31, id: 'eel', title: 'Eel', subtitle: 'A long, wiggly eel!', scene: 'sea' },
  { n: 32, id: 'shipwreck', title: 'Shipwreck', subtitle: 'An old ship on the sea floor!', scene: 'none' },
  { n: 33, id: 'swordfish', title: 'Swordfish', subtitle: 'The swordfish has a pointy nose!', scene: 'sea' },
  { n: 34, id: 'penguin-01', title: 'Penguin', subtitle: 'The penguin swims with bubbles!', scene: 'none' },
  { n: 35, id: 'hermit-crab', title: 'Hermit Crab', subtitle: 'The crab lives in a shell!', scene: 'sea' },
  { n: 36, id: 'clownfish-01', title: 'Clownfish', subtitle: 'A stripy clownfish!', scene: 'sea' },
  { n: 38, id: 'orca', title: 'Orca', subtitle: 'An orca by the seaweed!', scene: 'none' },
  { n: 39, id: 'starfish-02', title: 'Starfish', subtitle: 'A starfish with a flower!', scene: 'sea' },
  { n: 40, id: 'angelfish', title: 'Angelfish', subtitle: 'A stripy angelfish!', scene: 'sea' },
  { n: 41, id: 'seashell-01', title: 'Seashell', subtitle: 'A smiling seashell!', scene: 'none' },
  { n: 42, id: 'mermaid-01', title: 'Mermaid', subtitle: 'The mermaid waves hello!', scene: 'sea' },
  { n: 43, id: 'mermaid-02', title: 'Mermaid', subtitle: 'A mermaid with her sea friends!', scene: 'none' },
  { n: 44, id: 'seaweed-01', title: 'Seaweed', subtitle: 'Seaweed sways in the water!', scene: 'none' },
  { n: 45, id: 'seal-02', title: 'Seal', subtitle: 'A smiley seal!', scene: 'shore' },
  { n: 46, id: 'sea-castle', title: 'Sea Castle', subtitle: 'A castle under the sea!', scene: 'none' },
  { n: 47, id: 'walrus', title: 'Walrus', subtitle: 'The walrus has long tusks!', scene: 'shore' },
  { n: 48, id: 'pelican', title: 'Pelican', subtitle: 'A pelican with a big beak!', scene: 'shore' },
  { n: 49, id: 'seagull-02', title: 'Seagull', subtitle: 'The seagull stands on the sand!', scene: 'shore' },
  { n: 50, id: 'pufferfish', title: 'Pufferfish', subtitle: 'Puff! The fish gets round!', scene: 'sea' },
  { n: 51, id: 'mermaid-03', title: 'Mermaid', subtitle: 'A happy little mermaid!', scene: 'sea' },
  { n: 52, id: 'seaweed-02', title: 'Seaweed', subtitle: 'Wavy seaweed on a rock!', scene: 'none' },
  { n: 53, id: 'seaweed-03', title: 'Seaweed', subtitle: 'Seaweed grows tall!', scene: 'none' },
  { n: 55, id: 'anglerfish', title: 'Anglerfish', subtitle: 'The anglerfish has a little light!', scene: 'sea' },
  { n: 56, id: 'pearl-shell', title: 'Pearl Shell', subtitle: 'A shiny pearl in a shell!', scene: 'sea' },
  { n: 57, id: 'treasure-chest', title: 'Treasure Chest', subtitle: 'Treasure under the sea!', scene: 'sea' },
  { n: 58, id: 'sailboat', title: 'Sailboat', subtitle: 'A sailboat on the waves!', scene: 'none' },
  { n: 59, id: 'fish-01', title: 'Fish', subtitle: 'A fish with shiny scales!', scene: 'sea' },
  { n: 60, id: 'fish-02', title: 'Fish', subtitle: 'A spotty fish!', scene: 'sea' },
  { n: 61, id: 'whales', title: 'Whales', subtitle: 'Mummy and baby whale!', scene: 'none' },
  { n: 62, id: 'sea-urchin', title: 'Sea Urchin', subtitle: 'A spiky sea urchin!', scene: 'sea' },
  { n: 63, id: 'octopus-01', title: 'Octopus', subtitle: 'The octopus has a magic wand!', scene: 'sea' },
  { n: 64, id: 'seaweed-04', title: 'Seaweed', subtitle: 'Seaweed in the sea!', scene: 'none' },
  { n: 65, id: 'jellyfish-02', title: 'Jellyfish', subtitle: 'A jellyfish and its bubbles!', scene: 'none' },
  { n: 66, id: 'clam-01', title: 'Clam', subtitle: 'A pearl with little stars!', scene: 'sea' },
  { n: 67, id: 'clam-02', title: 'Clam', subtitle: 'The clam opens up!', scene: 'sea' },
  { n: 68, id: 'clam-03', title: 'Clam', subtitle: 'A clam on the sea floor!', scene: 'sea' },
  { n: 69, id: 'mermaid-04', title: 'Mermaid', subtitle: 'A mermaid with flowers!', scene: 'none' },
  { n: 70, id: 'fish-03', title: 'Fish', subtitle: 'A stripy fish!', scene: 'sea' },
  { n: 71, id: 'mermaid-05', title: 'Mermaid', subtitle: 'The mermaid holds a starfish!', scene: 'none' },
  { n: 72, id: 'shark-01', title: 'Shark', subtitle: 'A friendly shark!', scene: 'sea' },
  { n: 73, id: 'shark-02', title: 'Shark', subtitle: 'The shark swims fast!', scene: 'sea' },
  { n: 74, id: 'whale-shark', title: 'Whale Shark', subtitle: 'The biggest fish in the sea!', scene: 'sea' },
  { n: 75, id: 'seagull-03', title: 'Seagull', subtitle: 'The seagull flies over the sea!', scene: 'none' },
  { n: 77, id: 'sea-sponge', title: 'Sea Sponge', subtitle: 'Tube sponges on the sea floor!', scene: 'none' },
  { n: 78, id: 'hammerhead', title: 'Hammerhead Shark', subtitle: 'A shark with a hammer head!', scene: 'sea' },
  { n: 80, id: 'seaweed-05', title: 'Kelp', subtitle: 'Leafy kelp on a rock!', scene: 'none' },
  { n: 81, id: 'seashell-02', title: 'Seashell', subtitle: 'A shell with stars!', scene: 'sea' },
  { n: 82, id: 'conch-shell', title: 'Conch Shell', subtitle: 'Listen to the sea in the shell!', scene: 'sea' },
  { n: 83, id: 'octopus-02', title: 'Octopus', subtitle: 'An octopus has eight arms!', scene: 'sea' },
  { n: 84, id: 'boat', title: 'Boat', subtitle: 'Toot toot! A little boat!', scene: 'none' },
  { n: 85, id: 'ship', title: 'Ship', subtitle: 'A big ship on the sea!', scene: 'none' },
  { n: 86, id: 'penguin-02', title: 'Penguin', subtitle: 'The penguin stands tall!', scene: 'shore' },
  { n: 87, id: 'penguin-03', title: 'Penguin', subtitle: 'Waddle waddle, little penguin!', scene: 'shore' },
  { n: 88, id: 'penguin-04', title: 'Penguin', subtitle: 'The penguin sits down!', scene: 'shore' },
  { n: 89, id: 'penguin-05', title: 'Penguin', subtitle: 'The penguin waves its wing!', scene: 'shore' },
  { n: 90, id: 'mermaid-06', title: 'Mermaid', subtitle: 'A mermaid with a magic wand!', scene: 'sea' },
  { n: 91, id: 'octopus-03', title: 'Octopus', subtitle: 'The octopus loves bubbles!', scene: 'none' },
  { n: 92, id: 'sea-cave', title: 'Sea Cave', subtitle: 'A cave with coral around it!', scene: 'none' },
  { n: 93, id: 'starfish-03', title: 'Starfish', subtitle: 'A spotty starfish!', scene: 'sea' },
  { n: 94, id: 'starfish-04', title: 'Starfish', subtitle: 'A wavy starfish!', scene: 'sea' },
  { n: 95, id: 'turtle-03', title: 'Sea Turtle', subtitle: 'A spotty sea turtle!', scene: 'sea' },
  { n: 96, id: 'dolphin-04', title: 'Dolphin', subtitle: 'A dolphin with a flower!', scene: 'sea' },
  { n: 97, id: 'reef', title: 'Reef', subtitle: 'A shell and a starfish on the reef!', scene: 'none' },
  { n: 98, id: 'jellyfish-03', title: 'Jellyfish', subtitle: 'A sleepy jellyfish!', scene: 'sea' },
  { n: 99, id: 'fish-04', title: 'Fish', subtitle: 'A round, stripy fish!', scene: 'sea' },
  { n: 100, id: 'clownfish-02', title: 'Clownfish', subtitle: 'Two clownfish friends!', scene: 'none' },
  { n: 101, id: 'jellyfish-04', title: 'Jellyfish', subtitle: 'A jellyfish with curly arms!', scene: 'sea' },
];

/** Where each scene puts its picture: above the floor with a background, centred on the page without one. */
const FITS: Record<Scene, { footY: number; height: number; maxWidth: number }> = {
  sea: { footY: FLOOR_Y - 14, height: 580, maxWidth: 760 },
  shore: { footY: FLOOR_Y - 6, height: 580, maxWidth: 760 },
  none: { footY: 734, height: 700, maxWidth: 940 },
};

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `sea-${x.id}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/sea-animals/source/${String(p.n).padStart(3, '0')}.svg`), FITS[p.scene]);
    if (p.scene === 'sea') sea(a, seeded(p.id), clip.bounds);
    else if (p.scene === 'shore') floor(a, 'sand');
    // This clipart's brush lines swell where they join; those blobs stay as drawn instead of becoming tiny beads.
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: MIN_CORE, maxRegions: 80 });
    pages.push({ id: `sea-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/sea-animals'), 'sea-animals', { theme: 'Sea Animals', generator: 'tools/sea-animals/generate.ts' });
}

if (require.main === module) void main();
