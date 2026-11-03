// Generates the Vehicles pages from the owner's vehicle clipart (art/svg/vehicles/source/), each in a scene that fits
// where it goes: the road, the sea, the sky, the rails or the snow.
//   npx tsx tools/vehicles/generate.ts                 writes art/svg/vehicles/vehicle-<name>-01.svg
//   npx tsx tools/vehicles/generate.ts --import        also imports each page (npm run lcw -- page import)
//   npx tsx tools/vehicles/generate.ts --road town     one road scene for every road vehicle (happy, town or country)
// The clipart is converted like the Dinosaurs (tools/art/clipart.ts): lines thinned to the Animals thickness, every
// closed shape a region. Re-running overwrites the generated SVGs; the sources are never changed.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart, seeded } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';
import { circle, cloud, n, rect } from '../art/primitives';

type Rand = () => number;
type Box = { minX: number; minY: number; maxX: number; maxY: number };
type RoadStyle = 'happy' | 'town' | 'country';
type Setting = 'road' | 'sea' | 'underwater' | 'sky' | 'rails' | 'track' | 'snow' | 'farm' | 'playground';

const W = 1024;

function sun(a: Art, x: number, y: number, r = 50) {
  a.r('sun', circle(x, y, r));
  for (let i = 0; i < 8; i++) {
    const t = (i * Math.PI) / 4;
    a.l(`M ${n(x + (r + 18) * Math.cos(t))},${n(y + (r + 18) * Math.sin(t))} L ${n(x + (r + 36) * Math.cos(t))},${n(y + (r + 36) * Math.sin(t))}`);
  }
}

const bird = (x: number, y: number, k: number) =>
  `M ${n(x - 2 * k)},${n(y)} Q ${n(x - k)},${n(y - 1.3 * k)} ${n(x)},${n(y)} Q ${n(x + k)},${n(y - 1.3 * k)} ${n(x + 2 * k)},${n(y)}`;

/** The Happy Car's sky: the sun at the top left, a cloud at the top right. */
const clear = (x0: number, y0: number, x1: number, y1: number, b: Box) => x1 < b.minX - 16 || x0 > b.maxX + 16 || y1 < b.minY - 16 || y0 > b.maxY + 16;

/**
 * The Happy Car's sky: the sun at the top left, a cloud at the top right, then a small cloud and a pair or two of
 * birds wherever they keep clear of the vehicle.
 */
function happySky(a: Art, rand: Rand, box: Box) {
  sun(a, 140, 120);
  a.r('cloud', cloud(796, 128, 0.85));
  const smallClouds: [number, number][] = [
    [470, 90],
    [610, 230],
    [330, 250],
  ];
  // One small cloud: two clouds in all.
  const spot = smallClouds.find(([x, y]) => clear(x - 70, y - 40, x + 70, y + 30, box));
  if (spot) a.r('cloud-small', cloud(spot[0], spot[1], 0.45));
  const flocks: [number, number][] = [
    [320, 150],
    [580, 56],
    [900, 260],
    [180, 300],
  ];
  let pairs = 0;
  for (const [x, y] of flocks) {
    if (pairs === 2) break;
    if (!clear(x - 34, y - 24, x + 72, y + 40, box)) continue;
    const k = 13 + rand() * 4;
    a.l(bird(x, y, k), bird(x + 2.6 * k, y + 2.2 * k, k * 0.7));
    pairs++;
  }
}

// --- On the road. The road's top edge is at ROAD_Y; vehicles stand on WHEELS_Y.

const ROAD_Y = 640;
const WHEELS_Y = 700;

function road(a: Art) {
  a.r('road', `<path d="M -20,${ROAD_Y} H ${W + 20} V 790 H -20 Z"`);
  for (const x of [40, 240, 440, 640, 840]) a.l(`M ${x},740 H ${x + 90}`);
}

function happyRoad(a: Art, rand: Rand, box: Box) {
  happySky(a, rand, box);
  a.r('hill', '<path d="M -20,560 C 200,490 420,480 560,500 C 720,520 900,480 1044,540 V 660 H -20 Z"');
  road(a);
}

function townRoad(a: Art, _rand: Rand, _box: Box) {
  sun(a, 900, 96, 44);
  a.r('cloud', cloud(170, 96, 0.6));
  // A row of buildings with windows behind the road.
  const buildings: [number, number, number][] = [
    [10, 150, 400],
    [170, 140, 300],
    [320, 160, 360],
    [490, 140, 280],
    [640, 160, 380],
    [810, 200, 320],
  ];
  buildings.forEach(([x, w, top], i) => {
    a.r(`building-${i + 1}`, rect(x, top, w, ROAD_Y + 10 - top, 14));
    const cols = Math.floor((w - 30) / 50);
    for (let r = 0; top + 40 + r * 70 < ROAD_Y - 80; r++)
      for (let c = 0; c < cols; c++) a.r(`window-${i + 1}`, rect(x + 22 + c * 50 + (w - 30 - cols * 50) / 2, top + 36 + r * 70, 34, 40, 6));
  });
  road(a);
}

function tree(a: Art, name: string, x: number, groundY: number, s = 1) {
  a.r(`${name}-trunk`, rect(x - 14 * s, groundY - 120 * s, 28 * s, 124 * s, 6));
  a.r(`${name}-top`, circle(x, groundY - 150 * s, 62 * s));
}

function countryRoad(a: Art, rand: Rand, _box: Box) {
  sun(a, 870, 110);
  a.r('cloud', cloud(200, 100, 0.7));
  a.l(bird(470, 90, 15), bird(510, 112, 11));
  a.r('hill', '<path d="M -20,600 C 140,470 330,470 470,560 C 600,470 820,450 1044,580 V 660 H -20 Z"');
  tree(a, 'tree-1', 96, 600, 0.9 + rand() * 0.1);
  tree(a, 'tree-2', 930, 610, 0.85);
  road(a);
}

const ROADS: Record<RoadStyle, (a: Art, rand: Rand, box: Box) => void> = { happy: happyRoad, town: townRoad, country: countryRoad };

// --- Other places.

/** Boats float on the sea: the water line crosses them at SEA_Y. */
const SEA_Y = 560;
function sea(a: Art, rand: Rand, box: Box) {
  happySky(a, rand, box);
  const waves = Array.from({ length: 8 }, (_, i) => `Q ${-20 + 133 * i + 66},${SEA_Y + (i % 2 ? 16 : -16)} ${-20 + 133 * (i + 1)},${SEA_Y}`).join(' ');
  a.r('sea', `<path d="M -20,${SEA_Y} ${waves} V 790 H -20 Z"`);
  for (const [x, y] of [
    [80, 640],
    [880, 700],
    [200, 730],
  ])
    a.l(`M ${x},${y} q 16,-8 32,0 q 16,8 32,0`);
}

function underwater(a: Art, rand: Rand, box: Box) {
  sun(a, 120, 64, 44);
  a.r('cloud', cloud(830, 70, 0.55));
  const waves = Array.from({ length: 8 }, (_, i) => `Q ${-20 + 133 * i + 66},${i % 2 ? 196 : 164} ${-20 + 133 * (i + 1)},180`).join(' ');
  a.r('sea', `<path d="M -20,180 ${waves} V 790 H -20 Z"`);
  let k = 0;
  for (const x0 of [70, 180, 840, 950]) {
    let x = x0;
    let y = 690 - rand() * 40;
    let r = 24;
    while (y > 220 && r > 10) {
      if (x + r + 14 < box.minX || x - r - 14 > box.maxX || y + r + 14 < box.minY || y - r - 14 > box.maxY)
        a.r(r < 20 ? `small-bubble-${++k}` : `bubble-${++k}`, circle(x, y, r));
      y -= r * 2.6 + 10;
      x += (rand() - 0.5) * 24;
      r *= 0.8;
    }
  }
}

function sky(a: Art) {
  sun(a, 120, 110);
  a.r('cloud-1', cloud(860, 120, 0.8));
  a.r('cloud-2', cloud(170, 640, 0.75));
  a.l(bird(470, 70, 15), bird(510, 92, 11));
}

const RAIL_Y = 690;
function rails(a: Art, rand: Rand, box: Box) {
  happySky(a, rand, box);
  a.r('hill', '<path d="M -20,600 C 200,520 420,520 560,540 C 720,560 900,520 1044,570 V 700 H -20 Z"');
  a.r('ground', `<path d="M -20,${RAIL_Y - 30} H ${W + 20} V 790 H -20 Z"`);
  // Shapes, not lines, so the train's wheels cover them (lines are always drawn on top).
  for (let x = 10; x < W; x += 80) a.r('sleepers', rect(x, RAIL_Y + 14, 44, 44, 6));
  a.r('rail', rect(-20, RAIL_Y, W + 40, 16, 4));
}

/** A track running away towards the horizon, for a train seen from the front. */
const HORIZON = 540;
function track(a: Art, rand: Rand, box: Box) {
  happySky(a, rand, box);
  a.r('hill', `<path d="M -20,${HORIZON - 40} C 200,${HORIZON - 110} 420,${HORIZON - 110} 512,${HORIZON - 70} C 640,${HORIZON - 120} 860,${HORIZON - 100} 1044,${HORIZON - 50} V ${HORIZON + 20} H -20 Z"`);
  a.r('ground', `<path d="M -20,${HORIZON} H ${W + 20} V 790 H -20 Z"`);
  // Each rail narrows from the bottom of the page to the horizon; x(edge, y) follows its edge.
  const BOTTOM = 790;
  const edges = { leftOut: [492, 300], leftIn: [500, 344], rightIn: [524, 680], rightOut: [532, 724] } as const;
  const x = (e: readonly [number, number], y: number) => e[0] + ((e[1] - e[0]) * (y - HORIZON)) / (BOTTOM - HORIZON);
  // Sleepers, further apart and thicker nearer the front.
  for (const [y, h] of [
    [556, 6],
    [580, 9],
    [614, 13],
    [662, 18],
    [728, 26],
  ] as const) {
    const pad = (h * 1.6) | 0;
    a.r('sleepers', `<path d="M ${n(x(edges.leftOut, y) - pad)},${y} L ${n(x(edges.rightOut, y) + pad)},${y} L ${n(x(edges.rightOut, y + h) + pad)},${y + h} L ${n(x(edges.leftOut, y + h) - pad)},${y + h} Z"`);
  }
  a.r('rail-left', `<path d="M ${edges.leftOut[0]},${HORIZON} L ${edges.leftIn[0]},${HORIZON} L ${edges.leftIn[1]},${BOTTOM} L ${edges.leftOut[1]},${BOTTOM} Z"`);
  a.r('rail-right', `<path d="M ${edges.rightIn[0]},${HORIZON} L ${edges.rightOut[0]},${HORIZON} L ${edges.rightOut[1]},${BOTTOM} L ${edges.rightIn[1]},${BOTTOM} Z"`);
}

/** A playground: a swing set on one side, a slide on the other, on the grass. */
function playground(a: Art, rand: Rand, box: Box) {
  happySky(a, rand, box);
  a.r('hill', '<path d="M -20,560 C 200,490 420,480 560,500 C 720,520 900,480 1044,540 V 660 H -20 Z"');
  a.r('grass', `<path d="M -20,${ROAD_Y} H ${W + 20} V 790 H -20 Z"`);
  // Swing set: an A-frame at each end, a top bar, and a seat on two ropes.
  for (const cx of [60, 250]) a.r('swing-frame', `<path d="M ${cx - 6},400 L ${cx + 6},400 L ${cx + 40},${ROAD_Y + 20} L ${cx + 22},${ROAD_Y + 20} Z"`, `<path d="M ${cx - 6},400 L ${cx + 6},400 L ${cx - 22},${ROAD_Y + 20} L ${cx - 40},${ROAD_Y + 20} Z"`);
  a.r('swing-bar', rect(30, 384, 250, 22, 10));
  a.l('M 130,406 V 566', 'M 186,406 V 566');
  a.r('swing-seat', rect(112, 566, 92, 22, 8));
  // Slide: a ladder up to a little platform, and the slide sweeping down to the grass.
  a.r('slide-ladder', rect(930, 440, 16, ROAD_Y + 20 - 440, 6), rect(990, 440, 16, ROAD_Y + 20 - 440, 6));
  for (let y = 490; y < ROAD_Y; y += 46) a.l(`M 946,${y} H 990`);
  a.r('slide-platform', rect(890, 420, 130, 24, 8));
  a.r('slide', '<path d="M 896,444 C 860,520 820,600 760,640 L 744,${ROAD_Y + 16} L 800,${ROAD_Y + 16} C 850,600 900,520 940,444 Z"'.replace('${ROAD_Y + 16}', String(ROAD_Y + 16)).replace('${ROAD_Y + 16}', String(ROAD_Y + 16)));
}

function snow(a: Art) {
  sun(a, 880, 100);
  a.r('cloud', cloud(190, 110, 0.7));
  a.r('snow', '<path d="M -20,660 C 300,630 700,640 1044,650 V 790 H -20 Z"');
}

function farm(a: Art, rand: Rand, box: Box) {
  happySky(a, rand, box);
  a.r('hill', '<path d="M -20,560 C 200,490 420,480 560,500 C 720,520 900,480 1044,540 V 700 H -20 Z"');
  for (let x = 20; x < W; x += 120) a.r('fence', rect(x, 520, 20, 120, 6));
  a.r('fence', rect(-20, 550, W + 40, 18, 6), rect(-20, 600, W + 40, 18, 6));
  // Furrows as stripes of their own, under the tractor.
  [650, 694, 738].forEach((y, i) => a.r(`field-${i + 1}`, `<path d="M -20,${y} H ${W + 20} V ${y + 44} H -20 Z"`));
}

// --- The vehicles

type Vehicle = { id: string; title: string; subtitle: string; source: string; setting: Setting; fit?: { height?: number; maxWidth?: number; footY?: number } };

const VEHICLES: Vehicle[] = [
  { id: 'bicycle', title: 'Bicycle', subtitle: 'Ring ring! Ride the bicycle!', source: 'Bicycle', setting: 'road' },
  { id: 'bulldozer', title: 'Bulldozer', subtitle: 'The bulldozer pushes the dirt!', source: 'Bulldozer', setting: 'road' },
  { id: 'camper-van', title: 'Camper Van', subtitle: 'Off on a camping trip!', source: 'Camper_van_RV', setting: 'road' },
  { id: 'city-bus', title: 'City Bus', subtitle: 'The bus takes us to town!', source: 'City_bus', setting: 'road' },
  { id: 'compact-car', title: 'Car', subtitle: 'Beep beep! Little car!', source: 'Compact_car', setting: 'road' },
  { id: 'convertible', title: 'Convertible', subtitle: 'Feel the wind in the open car!', source: 'Convertible_car', setting: 'road' },
  { id: 'delivery-van', title: 'Delivery Van', subtitle: 'A parcel is on its way!', source: 'Delivery_van', setting: 'road' },
  { id: 'ferry', title: 'Ferry', subtitle: 'The ferry carries people across the water!', source: 'Ferry', setting: 'sea' },
  { id: 'food-truck', title: 'Food Truck', subtitle: 'Yummy snacks from the food truck!', source: 'Food_truck', setting: 'road' },
  { id: 'forklift', title: 'Forklift', subtitle: 'The forklift lifts heavy boxes!', source: 'Forklift', setting: 'road' },
  { id: 'freight-car', title: 'Freight Car', subtitle: 'The train carries big boxes!', source: 'Freight_boxcar', setting: 'rails' },
  { id: 'helicopter', title: 'Helicopter', subtitle: 'Whirr! Up, up it goes!', source: 'Helicopter', setting: 'sky' },
  { id: 'hot-air-balloon', title: 'Hot Air Balloon', subtitle: 'Floating high in the sky!', source: 'Hot_air_balloon', setting: 'sky', fit: { height: 480, footY: 640 } },
  { id: 'airplane', title: 'Airplane', subtitle: 'Zoom! The plane flies high!', source: 'Jet_airliner', setting: 'sky' },
  { id: 'scooter', title: 'Scooter', subtitle: 'Buzz around town on the scooter!', source: 'Motor_scooter', setting: 'road' },
  { id: 'speedboat', title: 'Speedboat', subtitle: 'Splash! The speedboat goes fast!', source: 'Motorboat_speedboat', setting: 'sea' },
  { id: 'motorcycle', title: 'Motorcycle', subtitle: 'Vroom vroom! Motorcycle!', source: 'Motorcycle', setting: 'road' },
  { id: 'train', title: 'Train', subtitle: 'Choo choo! Here comes the train!', source: 'Passenger_train_car', setting: 'rails' },
  { id: 'pickup-truck', title: 'Pickup Truck', subtitle: 'The truck carries things in the back!', source: 'Pickup_truck', setting: 'road' },
  { id: 'sailboat', title: 'Sailboat', subtitle: 'The wind pushes the sail!', source: 'Sailboat', setting: 'sea' },
  { id: 'school-bus', title: 'School Bus', subtitle: 'All aboard the school bus!', source: 'School_bus', setting: 'road' },
  { id: 'seaplane', title: 'Seaplane', subtitle: 'This plane lands on water!', source: 'Seaplane', setting: 'sea' },
  { id: 'snowmobile', title: 'Snowmobile', subtitle: 'Zoom across the snow!', source: 'Snowmobile', setting: 'snow' },
  { id: 'steam-train', title: 'Steam Train', subtitle: 'Choo choo! Puff puff!', source: 'Steam_locomotive_front_view', setting: 'track' },
  { id: 'submarine', title: 'Submarine', subtitle: 'Deep under the sea!', source: 'Submarine', setting: 'underwater' },
  { id: 'tow-truck', title: 'Tow Truck', subtitle: 'The tow truck helps other cars!', source: 'Tow_truck', setting: 'road' },
  { id: 'tractor', title: 'Tractor', subtitle: 'The tractor works on the farm!', source: 'Tractor', setting: 'farm' },
  { id: 'caravan', title: 'Caravan', subtitle: 'A little house on wheels!', source: 'Travel_trailer_caravan', setting: 'road' },
  { id: 'tricycle', title: 'Tricycle', subtitle: 'Pedal pedal on the tricycle!', source: 'Tricycle_child', setting: 'playground' },
  { id: 'yacht', title: 'Yacht', subtitle: 'Sailing on the sunny sea!', source: 'Yacht', setting: 'sea' },
];

/** Where each setting puts its vehicle. */
const FITS: Record<Setting, { footY: number; height: number; maxWidth: number }> = {
  road: { footY: WHEELS_Y, height: 300, maxWidth: 600 },
  sea: { footY: SEA_Y + 70, height: 400, maxWidth: 720 },
  underwater: { footY: 620, height: 380, maxWidth: 680 },
  sky: { footY: 560, height: 380, maxWidth: 660 },
  rails: { footY: RAIL_Y + 6, height: 340, maxWidth: 820 },
  track: { footY: 610, height: 380, maxWidth: 360 },
  playground: { footY: WHEELS_Y, height: 300, maxWidth: 440 },
  snow: { footY: 700, height: 360, maxWidth: 740 },
  farm: { footY: 712, height: 440, maxWidth: 640 },
};

const arg = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

async function main() {
  const roadStyle = (arg('--road') ?? 'happy') as RoadStyle;
  const only = arg('--only')?.split(',');
  const pages: GeneratedPage[] = [];
  for (const v of VEHICLES.filter((x) => !only || only.some((w) => `vehicle-${x.id}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/vehicles/source/${v.source}.svg`), { ...FITS[v.setting], ...v.fit });
    const rand = seeded(v.id);
    const box = clip.bounds;
    if (v.setting === 'road') ROADS[roadStyle](a, rand, box);
    else if (v.setting === 'sea') sea(a, rand, box);
    else if (v.setting === 'underwater') underwater(a, rand, clip.bounds);
    else if (v.setting === 'sky') sky(a);
    else if (v.setting === 'rails') rails(a, rand, box);
    else if (v.setting === 'track') track(a, rand, box);
    else if (v.setting === 'playground') playground(a, rand, box);
    else if (v.setting === 'snow') snow(a);
    else farm(a, rand, box);
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, eyes: false });
    pages.push({ id: `vehicle-${v.id}-01`, title: v.title, subtitle: v.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/vehicles'), 'vehicles', { theme: 'Vehicles', generator: 'tools/vehicles/generate.ts' });
}

if (require.main === module) void main();
