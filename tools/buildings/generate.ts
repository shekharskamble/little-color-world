// Generates the Buildings pages from the owner's building clipart (traced with potrace)
// (art/svg/buildings/source/<source>.svg, from ~/Desktop/Little Color World/Building SVG/<Source_name>.svg).
//   npx tsx tools/buildings/generate.ts              writes art/svg/buildings/building-<id>.svg
//   npx tsx tools/buildings/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Flowers pages (tools/art/clipart.ts): no background, each building drawn big and centred.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `id` makes the page id `building-<id>`; `src` is the source file name. `minCore` lowers the size at which solid
 * black is opened up. `target` is the line thickness lines are thinned to. */
type Pic = { id: string; src: string; title: string; subtitle: string; minCore?: number; target?: number };

const PICS: Pic[] = [
  { id: 'house', src: 'single-family-house', title: 'House', subtitle: 'Home, sweet home!' },
  { id: 'castle', src: 'castle', title: 'Castle', subtitle: 'A castle with tall towers!' },
  { id: 'barn', src: 'barn', title: 'Barn', subtitle: 'Where the farm animals sleep!' },
  { id: 'fire-station', src: 'fire-station', title: 'Fire Station', subtitle: 'Home of the fire engine!' },
  { id: 'police-station', src: 'police-station', title: 'Police Station', subtitle: 'The police are here to help!' },
  { id: 'hospital', src: 'hospital', title: 'Hospital', subtitle: 'Doctors make us better!' },
  { id: 'school', src: 'school', title: 'School', subtitle: 'Time to learn and play!' },
  { id: 'library', src: 'library', title: 'Library', subtitle: 'So many books to read!' },
  { id: 'lighthouse', src: 'lighthouse', title: 'Lighthouse', subtitle: 'A light for the boats!' },
  { id: 'log-cabin', src: 'log-cabin', title: 'Log Cabin', subtitle: 'A cosy cabin in the woods!' },
  { id: 'skyscraper', src: 'skyscraper', title: 'Skyscraper', subtitle: 'Up, up to the sky!' },
  { id: 'apartments', src: 'apartment-building', title: 'Apartments', subtitle: 'Lots of homes in one!' },
  { id: 'office', src: 'mid-rise-office-building', title: 'Office', subtitle: 'So many windows!' },
  { id: 'hotel', src: 'hotel', title: 'Hotel', subtitle: 'A place to stay on holiday!' },
  { id: 'shop', src: 'retail-storefront-with-awning', title: 'Shop', subtitle: 'Let’s go shopping!' },
  { id: 'shopping-mall', src: 'shopping-mall', title: 'Shopping Mall', subtitle: 'Lots of shops inside!' },
  { id: 'post-office', src: 'post-office', title: 'Post Office', subtitle: 'Send a letter!' },
  { id: 'museum', src: 'museum', title: 'Museum', subtitle: 'Come and see!' },
  { id: 'theater', src: 'theater-marquee-facade', title: 'Theatre', subtitle: 'The show is starting!' },
  { id: 'stadium', src: 'stadium', title: 'Stadium', subtitle: 'Hooray, a big game!' },
  { id: 'train-station', src: 'train-station', title: 'Train Station', subtitle: 'All aboard!' },
  { id: 'airport', src: 'airport-terminal-with-control-tower', title: 'Airport', subtitle: 'Planes fly from here!' },
  { id: 'gas-station', src: 'gas-station-fuel-canopy', title: 'Gas Station', subtitle: 'Fill up the car!' },
  { id: 'parking-garage', src: 'parking-garage-multi-level', title: 'Car Park', subtitle: 'A home for cars!' },
  { id: 'city-hall', src: 'city-hall-domed', title: 'City Hall', subtitle: 'A building with a big dome!' },
  { id: 'courthouse', src: 'courthouse', title: 'Courthouse', subtitle: 'Big tall columns!' },
  { id: 'clock-tower', src: 'clock-tower', title: 'Clock Tower', subtitle: 'Tick tock!' },
  { id: 'observatory', src: 'observatory-domed', title: 'Observatory', subtitle: 'Look at the stars!' },
  { id: 'greenhouse', src: 'greenhouse', title: 'Greenhouse', subtitle: 'Plants grow inside!' },
  { id: 'stable', src: 'stable', title: 'Stable', subtitle: 'A home for horses!' },
  { id: 'water-tower', src: 'water-tower', title: 'Water Tower', subtitle: 'Full of water!' },
  { id: 'watchtower', src: 'watchtower', title: 'Watchtower', subtitle: 'See far, far away!' },
  { id: 'factory', src: 'factory-with-chimneys', title: 'Factory', subtitle: 'Things are made here!' },
  { id: 'warehouse', src: 'warehouse', title: 'Warehouse', subtitle: 'Full of boxes!' },
  { id: 'power-plant', src: 'power-plant-cooling-tower', title: 'Power Plant', subtitle: 'Puff, puff, steam!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `building-${x.id}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/buildings/source/${p.src}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, target: p.target });
    pages.push({ id: `building-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/buildings'), 'buildings', { theme: 'Buildings', generator: 'tools/buildings/generate.ts' });
}

if (require.main === module) void main();
