// Generates the Construction pages from the owner's "Construction Vehicle" clipart by FunnyStrokeCo
// (art/svg/construction/source/<name>.svg, from ~/Desktop/Little Color World/02_CONSTRUCTION_VEHICLE/SVG).
//   npx tsx tools/construction/generate.ts              writes art/svg/construction/construction-<name>.svg
//   npx tsx tools/construction/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the other no-background packs (tools/art/clipart.ts): each vehicle drawn big and centred. The vehicles
// have no faces, so no eyes are kept black (round windows and lights are coloured).
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file name (without .svg); the page id is `construction-<id>`. */
type Pic = { id: string; src: string; title: string; subtitle: string; minCore?: number };

const PICS: Pic[] = [
  { id: 'cement-mixer', src: 'concrete_mixer_truck', title: 'Cement Mixer', subtitle: 'Round and round it goes!' },
  { id: 'backhoe-loader', src: 'backhoe_loader', title: 'Backhoe Loader', subtitle: 'Dig and scoop!' },
  { id: 'bulldozer', src: 'bulldozer', title: 'Bulldozer', subtitle: 'Push, push, push!' },
  { id: 'cherry-picker', src: 'cherry_picker', title: 'Cherry Picker', subtitle: 'Up, up we go!' },
  { id: 'compactor', src: 'compactor', title: 'Compactor', subtitle: 'Squash it flat!' },
  { id: 'crane-truck', src: 'crane_truck', title: 'Crane Truck', subtitle: 'Lift it up high!' },
  { id: 'dump-truck', src: 'dump_truck', title: 'Dump Truck', subtitle: 'Tip the load out!' },
  { id: 'excavator', src: 'excavator', title: 'Excavator', subtitle: 'A big digging arm!' },
  { id: 'flatbed-truck', src: 'flatbed_truck', title: 'Flatbed Truck', subtitle: 'Room for a big load!' },
  { id: 'forklift', src: 'forklift', title: 'Forklift', subtitle: 'Lift the boxes!' },
  { id: 'motor-grader', src: 'motor_grader', title: 'Motor Grader', subtitle: 'Make the road smooth!' },
  { id: 'pickup-truck', src: 'pickup_truck', title: 'Pickup Truck', subtitle: "Hop in, let's go!" },
  { id: 'road-roller', src: 'road_roller', title: 'Road Roller', subtitle: 'Roll the road flat!' },
  { id: 'scissor-lift', src: 'scissor_lift', title: 'Scissor Lift', subtitle: 'Up, up, up!' },
  { id: 'skid-steer', src: 'skid_steer_loader', title: 'Skid Steer', subtitle: 'A small, strong loader!' },
  { id: 'little-dump-truck', src: 'small_dump_truck', title: 'Little Dump Truck', subtitle: 'Little truck, big load!' },
  { id: 'tower-crane', src: 'tower_crane', title: 'Tower Crane', subtitle: 'So tall!' },
  { id: 'tractor', src: 'tractor', title: 'Tractor', subtitle: 'Chug, chug, tractor!' },
  { id: 'wheel-loader', src: 'wheel_loader', title: 'Wheel Loader', subtitle: 'Scoop up the dirt!' },
  { id: 'wrecking-ball', src: 'wrecking_ball_crane', title: 'Wrecking Ball', subtitle: 'Swing the big ball!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.includes(`construction-${x.id}`))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/construction/source/${p.src}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, eyes: false });
    pages.push({ id: `construction-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/construction'), 'construction', { theme: 'Construction', generator: 'tools/construction/generate.ts' });
}

if (require.main === module) void main();
