// Generates the Space pages from the owner's space clipart (art/svg/space/source/space-<nn>.svg).
//   npx tsx tools/space/generate.ts              writes art/svg/space/space-<nn>.svg
//   npx tsx tools/space/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Unicorns (tools/art/clipart.ts): no background, each picture big and centred on the page.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };
const THIN_SPOTS = 5;

/** `n` is the source number; the page id is `space-<n>`. 01-31 are the files the owner attached; the rest are a
 * chosen subset of 32-120 (owner, 2026-11-02): new subjects only, skipping repeats, very busy scenes, text and big
 * solid-black areas. `maxRegions` works around addClipartRegions counting its parts twice in the small-part budget
 * (budget = max - 2 × parts): the rover's 40 parts need 117 to stay within the validator's 80, which also counts
 * the background and locked layers. */
type Pic = { n: string; title: string; subtitle: string; minCore?: number; maxRegions?: number };

const PICS: Pic[] = [
  { n: '01', title: 'Rocket Ride', subtitle: 'The astronaut rides a happy rocket!' },
  { n: '02', title: 'Astronaut and Moon', subtitle: 'Peek-a-boo behind the moon!' },
  { n: '03', title: 'Little Astronaut', subtitle: 'A cookie for the trip to space!' },
  { n: '04', title: 'Moon Jump', subtitle: 'Boing! Jumping on the moon!' },
  { n: '05', title: 'Moon Flag', subtitle: 'A flag on the moon!' },
  { n: '06', title: 'Moon Swing', subtitle: 'Sitting on the crescent moon!' },
  { n: '07', title: 'Astronaut Girl', subtitle: 'Hello from space!' },
  { n: '08', title: 'Star Balloon', subtitle: 'Floating with a star balloon!' },
  { n: '09', title: 'Waving Astronaut', subtitle: 'Wave hello to the astronaut!' },
  { n: '10', title: 'Sleepy Astronaut', subtitle: 'Floating off to sleep!' },
  { n: '11', title: 'Planet Hug', subtitle: 'The astronaut hugs a planet!' },
  { n: '12', title: 'Heart Rocket', subtitle: 'A rocket full of love!' },
  { n: '13', title: 'Blast Off', subtitle: 'Three, two, one, blast off!' },
  { n: '14', title: 'Little Rocket', subtitle: 'A rocket with a happy window!' },
  { n: '15', title: 'Zooming Rocket', subtitle: 'Zoom past the planets!' },
  { n: '16', title: 'Comet', subtitle: 'A happy comet zips by!' },
  { n: '17', title: 'Star Friends', subtitle: 'Three twinkly star friends!' },
  { n: '18', title: 'Big Star', subtitle: 'A big, smiling star!' },
  { n: '19', title: 'Shooting Star', subtitle: 'Make a wish on a shooting star!' },
  { n: '20', title: 'Sun', subtitle: 'The sun shines bright!' },
  { n: '21', title: 'Full Moon', subtitle: 'A round, happy moon!' },
  { n: '22', title: 'Fiery Comet', subtitle: 'Whoosh! A blazing comet!' },
  { n: '23', title: 'Sleepy Moon', subtitle: 'The moon wears a sleepy hat!' },
  { n: '24', title: 'Ringed Planet', subtitle: 'A planet with pretty rings!' },
  { n: '25', title: 'Earth', subtitle: 'Our happy home, Earth!' },
  { n: '26', title: 'Rocket Rider', subtitle: 'Hold on tight, little astronaut!' },
  { n: '27', title: 'Star Party', subtitle: 'Floating with star friends!' },
  { n: '28', title: 'Moon Buddy', subtitle: 'An astronaut and a star on the moon!' },
  { n: '29', title: 'Sitting Astronaut', subtitle: 'Time for a little rest!' },
  { n: '30', title: 'Fluffy Monster', subtitle: 'A fluffy space monster!' },
  { n: '31', title: 'Silly Alien', subtitle: 'A three-eyed alien says hi!' },
  { n: '33', title: 'Round Alien', subtitle: 'A chubby little alien!' },
  { n: '34', title: 'Star Alien', subtitle: 'An alien shaped like a star!' },
  { n: '38', title: 'Three-Eyed Alien', subtitle: 'One, two, three eyes!' },
  { n: '43', title: 'Hatching Alien', subtitle: 'Surprise! A baby alien hatches!' },
  { n: '44', title: 'Alien Pilot', subtitle: 'The alien flies a flying saucer!' },
  { n: '46', title: 'Flying Saucer', subtitle: 'The saucer beams up a star!' },
  { n: '49', title: 'Kitty Astronaut', subtitle: 'A kitty floats in space!' },
  { n: '50', title: 'Kitty Rocket', subtitle: 'A kitty rides in a rocket!' },
  { n: '51', title: 'Puppy Astronaut', subtitle: 'A puppy waves from the moon!' },
  { n: '53', title: 'Panda on the Moon', subtitle: 'A panda sits on the moon!' },
  { n: '54', title: 'Fox Astronaut', subtitle: 'A fox holds a little star!' },
  { n: '56', title: 'Penguin Astronaut', subtitle: 'A penguin ready for space!' },
  { n: '57', title: 'Frog Astronaut', subtitle: 'A frog sits on a planet!' },
  { n: '65', title: 'Planet Friends', subtitle: 'Earth and a planet hold hands!' },
  { n: '66', title: 'Princess Planet', subtitle: 'A planet wears a crown!' },
  { n: '68', title: 'Planet and Star', subtitle: 'The planet hugs a star!' },
  { n: '70', title: 'Solar System', subtitle: 'The sun and its planets!' },
  { n: '72', title: 'Galaxy', subtitle: 'A swirly, sparkly galaxy!' },
  { n: '79', title: 'Moon Rainbow', subtitle: 'A rainbow from the moon to a star!' },
  { n: '81', title: 'Moon Hug', subtitle: 'The moon hugs a little star!' },
  { n: '82', title: 'Telescope', subtitle: 'Look at the stars!' },
  { n: '84', title: 'Satellite', subtitle: 'A satellite beeps hello!' },
  { n: '85', title: 'Space Station', subtitle: 'A home in space!' },
  { n: '86', title: 'Space Rover', subtitle: 'The rover drives on Mars!', maxRegions: 117 },
  { n: '95', title: 'Robot', subtitle: 'A happy robot rolls along!' },
  { n: '98', title: 'Moon Camping', subtitle: 'Camping on the moon!' },
  { n: '103', title: 'High Five', subtitle: 'An alien and an astronaut high-five!' },
  { n: '112', title: 'Alien Rocket', subtitle: 'An alien rides a rocket!' },
  { n: '113', title: 'Star Ship', subtitle: 'A spaceship shaped like a star!' },
  { n: '116', title: 'Astronaut Friends', subtitle: 'Two friends float together!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `space-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/space/source/space-${p.n}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: p.maxRegions ?? 80, thinSpots: THIN_SPOTS });
    pages.push({ id: `space-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/space'), 'space', { theme: 'Space', generator: 'tools/space/generate.ts' });
}

if (require.main === module) void main();
