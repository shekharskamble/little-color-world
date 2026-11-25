// Generates the Space pages from the owner's space pack (art/svg/space/pack/<NN>.svg, from
// ~/Desktop/Little Color World/Space/<NN>_<name>.svg, 01–74). It replaced the earlier space clipart on 2026-11-25
// (owner: "replace space svgs with these I have got the permission to use these"); that pack's generator is kept as
// tools/space/generate-retired.ts and its space-<nn> page ids are not reused.
//   npx tsx tools/space/generate.ts              writes art/svg/space/orbit-<id>.svg
//   npx tsx tools/space/generate.ts --import     also imports each page (npm run lcw -- page import)
// Each source's lines are first trimmed to the other packs' thickness (tools/space/thin_all.sh, tools/art/uniform_lines.py
// --cap, into art/svg/space/pack-thin/): lines wider than 10.5 are trimmed, thinner lines, eyes and dots stay as drawn.
// Then every line is kept as trimmed and the white areas become colourable (tools/art/clipart.ts addClipart with
// smallParts), like the Flowers and Sea Animals pages. No background; big and centred.
import { join } from 'node:path';

import { addClipart, Art, loadClipart, type Merge } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file number; the page id is `orbit-<id>`. */
type Pic = { id: string; src: string; title: string; subtitle: string; merge?: Merge[] };

/**
 * Space Docking's solar panels are grids of little squares (120 regions, over the 80 allowed for age 4-5). Each panel
 * is coloured as one region instead; its grid lines are still drawn (owner, 2026-11-25). The left panel runs on under
 * the hose, whose pieces stay separate.
 */
const DOCKING_PANELS: Merge[] = [
  {
    name: 'left-panel',
    within: [
      [[555, 290], [640, 305], [575, 392], [485, 390]],
      [[470, 400], [500, 405], [540, 448], [530, 462], [460, 440]],
      [[605, 330], [630, 330], [630, 355], [605, 355]],
      [[575, 368], [598, 368], [598, 392], [575, 392]],
    ],
  },
  { name: 'right-panel', within: [[[855, 330], [990, 355], [910, 530], [760, 500]]] },
];

const PICS: Pic[] = [
  { id: 'rocket', src: '14', title: 'Rocket', subtitle: 'Whoosh! A happy rocket!' },
  { id: 'mercury', src: '01', title: 'Mercury', subtitle: 'The planet closest to the sun!' },
  { id: 'venus', src: '02', title: 'Venus', subtitle: 'A swirly, cloudy planet!' },
  { id: 'earth', src: '03', title: 'Earth', subtitle: 'Our home planet!' },
  { id: 'mars', src: '04', title: 'Mars', subtitle: 'The red planet says hi!' },
  { id: 'jupiter', src: '05', title: 'Jupiter', subtitle: 'The biggest planet of all!' },
  { id: 'saturn', src: '06', title: 'Saturn', subtitle: 'A planet with a ring!' },
  { id: 'uranus', src: '07', title: 'Uranus', subtitle: 'A tipped-over planet!' },
  { id: 'neptune', src: '08', title: 'Neptune', subtitle: 'A cold, windy planet!' },
  { id: 'pluto', src: '09', title: 'Pluto', subtitle: 'Little Pluto with a heart!' },
  { id: 'astronaut-girl', src: '10', title: 'Astronaut Girl', subtitle: 'Hello from space!' },
  { id: 'astronaut-boy', src: '11', title: 'Astronaut Boy', subtitle: 'Ready for take-off!' },
  { id: 'little-astronaut', src: '12', title: 'Little Astronaut', subtitle: 'A little astronaut sits down!' },
  { id: 'space-walk', src: '13', title: 'Space Walk', subtitle: 'Floating and waving!' },
  { id: 'big-rocket', src: '15', title: 'Big Rocket', subtitle: 'A rocket with a round window!' },
  { id: 'lift-off', src: '16', title: 'Lift Off', subtitle: '3, 2, 1, lift off!' },
  { id: 'moon', src: '17', title: 'Moon', subtitle: 'A smiley moon with craters!' },
  { id: 'ufo', src: '18', title: 'Flying Saucer', subtitle: 'A flying saucer zooms by!' },
  { id: 'ufo-lights', src: '19', title: 'UFO', subtitle: 'A UFO with little lights!' },
  { id: 'satellite', src: '20', title: 'Satellite', subtitle: 'A satellite with solar panels!' },
  { id: 'sun', src: '21', title: 'Sun', subtitle: 'A big, sunny smile!' },
  { id: 'space-shuttle', src: '22', title: 'Space Shuttle', subtitle: 'The shuttle blasts off!' },
  { id: 'moon-rover', src: '23', title: 'Moon Rover', subtitle: 'Driving on the moon!' },
  { id: 'smiley-satellite', src: '24', title: 'Smiley Satellite', subtitle: 'A satellite says beep beep!' },
  { id: 'comet', src: '25', title: 'Comet', subtitle: 'A comet with a long tail!' },
  // Added 2026-11-25 (owner: "lets add these svgs for coloring"). 31 and 43 were not in the set; 58 is the same file
  // as 56 and 61 draws the same as 59, so they are left out. 46 (black hole) was removed at the owner's request. Some file names do not match the drawing (37_galaxy is a
  // planet with a rocket), so the titles follow the drawings.
  { id: 'happy-comet', src: '26', title: 'Happy Comet', subtitle: 'A little comet zooms by!' },
  { id: 'zooming-comet', src: '27', title: 'Zooming Comet', subtitle: 'A smiley comet with a long tail!' },
  { id: 'asteroid', src: '28', title: 'Asteroid', subtitle: 'A bumpy space rock!' },
  { id: 'happy-asteroid', src: '29', title: 'Happy Asteroid', subtitle: 'A smiley space rock!' },
  { id: 'little-alien', src: '30', title: 'Little Alien', subtitle: 'A little alien says hi!' },
  { id: 'shooting-star', src: '32', title: 'Shooting Star', subtitle: 'Make a wish!' },
  { id: 'alien-buddy', src: '33', title: 'Alien Buddy', subtitle: 'An alien with two antennas!' },
  { id: 'one-eyed-alien', src: '34', title: 'One-Eyed Alien', subtitle: 'An alien with one big eye!' },
  { id: 'three-eyed-alien', src: '35', title: 'Three-Eyed Alien', subtitle: 'One, two, three eyes!' },
  { id: 'teddy-ufo', src: '36', title: 'Teddy UFO', subtitle: 'A teddy bear flies a UFO!' },
  { id: 'planet-and-rocket', src: '37', title: 'Planet and Rocket', subtitle: 'A rocket flies past a planet!' },
  { id: 'rocket-ring-planet', src: '38', title: 'Ringed Planet', subtitle: 'A rocket zooms around the rings!' },
  { id: 'heart-planet', src: '39', title: 'Heart Ring Planet', subtitle: 'A planet with a ring of hearts!' },
  { id: 'rocket-ride', src: '40', title: 'Rocket Ride', subtitle: 'An astronaut rides a rocket!' },
  { id: 'solar-system', src: '41', title: 'Solar System', subtitle: 'The sun and its planet friends!' },
  { id: 'moon-flag', src: '42', title: 'Moon Flag', subtitle: 'An astronaut on the moon!' },
  { id: 'meteor-shower', src: '44', title: 'Meteor Shower', subtitle: 'Three little meteors!' },
  { id: 'solar-eclipse', src: '45', title: 'Solar Eclipse', subtitle: 'The moon covers the sun!' },
  { id: 'galaxy', src: '47', title: 'Galaxy', subtitle: 'A big swirly galaxy!' },
  { id: 'star-rocket', src: '48', title: 'Star Rocket', subtitle: 'A rocket flies to a star!' },
  { id: 'planet-hug', src: '49', title: 'Planet Hug', subtitle: 'A planet hugs a heart!' },
  { id: 'lovely-planet', src: '50', title: 'Lovely Planet', subtitle: 'A happy planet with a heart!' },
  { id: 'telescope', src: '51', title: 'Telescope', subtitle: 'Look up at the stars!' },
  { id: 'rocky-comet', src: '52', title: 'Rocky Comet', subtitle: 'A rocky comet with a tail!' },
  { id: 'rocky-mercury', src: '53', title: 'Rocky Mercury', subtitle: 'A little rocky planet!' },
  { id: 'bumpy-mercury', src: '54', title: 'Bumpy Mercury', subtitle: 'A planet full of craters!' },
  { id: 'dusty-mars', src: '55', title: 'Dusty Mars', subtitle: 'The dusty red planet!' },
  { id: 'earth-map', src: '56', title: 'Earth Map', subtitle: 'Find the land and the sea!' },
  { id: 'planet-earth', src: '57', title: 'Planet Earth', subtitle: 'Our big blue home!' },
  { id: 'striped-jupiter', src: '59', title: 'Striped Jupiter', subtitle: 'Jupiter has lots of stripes!' },
  { id: 'stormy-jupiter', src: '60', title: 'Stormy Jupiter', subtitle: 'Jupiter and its big storm!' },
  { id: 'ringed-saturn', src: '62', title: 'Ringed Saturn', subtitle: 'Saturn and its rings!' },
  { id: 'wavy-venus', src: '63', title: 'Wavy Venus', subtitle: 'A wavy, cloudy planet!' },
  { id: 'swirly-venus', src: '64', title: 'Swirly Venus', subtitle: 'A swirly, windy planet!' },
  { id: 'ringed-uranus', src: '65', title: 'Ringed Uranus', subtitle: 'Uranus has rings too!' },
  { id: 'pluto-heart', src: '66', title: 'Pluto Heart', subtitle: 'Pluto has a big heart!' },
  { id: 'space-rover', src: '67', title: 'Space Rover', subtitle: 'A rover explores the moon!' },
  { id: 'happy-rocket', src: '68', title: 'Happy Rocket', subtitle: 'A rocket with a smiley face!' },
  { id: 'alien-ufo', src: '69', title: 'Alien UFO', subtitle: 'An alien peeks out!' },
  { id: 'star-ship', src: '70', title: 'Star Ship', subtitle: 'A starry spaceship!' },
  { id: 'space-docking', src: '71', title: 'Space Docking', subtitle: 'A UFO visits a space station!', merge: DOCKING_PANELS },
  { id: 'windy-neptune', src: '72', title: 'Windy Neptune', subtitle: 'Neptune with a thin ring!' },
  { id: 'full-moon', src: '73', title: 'Full Moon', subtitle: 'A moon full of craters!' },
  { id: 'fiery-sun', src: '74', title: 'Fiery Sun', subtitle: 'The hot, bright sun!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.includes(`orbit-${x.id}`))) {
    const a = new Art();
    addClipart(a, loadClipart(join(ROOT, `art/svg/space/pack-thin/${p.src}.svg`), FIT, { dedupe: true }), 1, { smallParts: true, merge: p.merge });
    pages.push({ id: `orbit-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/space'), 'space', { theme: 'Space', generator: 'tools/space/generate.ts' });
}

if (require.main === module) void main();
