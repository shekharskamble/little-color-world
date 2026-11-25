// Generates the Space pages from the owner's space pack (art/svg/space/pack/<NN>.svg, from
// ~/Desktop/Little Color World/Space/<NN>_<name>.svg, 01–25). It replaced the earlier space clipart on 2026-11-25
// (owner: "replace space svgs with these I have got the permission to use these"); that pack's generator is kept as
// tools/space/generate-retired.ts and its space-<nn> page ids are not reused.
//   npx tsx tools/space/generate.ts              writes art/svg/space/orbit-<id>.svg
//   npx tsx tools/space/generate.ts --import     also imports each page (npm run lcw -- page import)
// Each source's lines are first trimmed to the other packs' thickness (tools/space/thin_all.sh, tools/art/uniform_lines.py
// --cap, into art/svg/space/pack-thin/): lines wider than 10.5 are trimmed, thinner lines, eyes and dots stay as drawn.
// Then every line is kept as trimmed and the white areas become colourable (tools/art/clipart.ts addClipart with
// smallParts), like the Flowers and Sea Animals pages. No background; big and centred.
import { join } from 'node:path';

import { addClipart, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file number; the page id is `orbit-<id>`. */
type Pic = { id: string; src: string; title: string; subtitle: string };

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
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.includes(`orbit-${x.id}`))) {
    const a = new Art();
    addClipart(a, loadClipart(join(ROOT, `art/svg/space/pack-thin/${p.src}.svg`), FIT, { dedupe: true }), 1, { smallParts: true });
    pages.push({ id: `orbit-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/space'), 'space', { theme: 'Space', generator: 'tools/space/generate.ts' });
}

if (require.main === module) void main();
