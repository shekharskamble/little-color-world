// LEGACY (owner, 2026-11-02): the Dinosaurs pages were replaced by the Cute Dino pack (tools/dinosaurs/generate.ts).
// Kept for reference only; it writes the old dino-<name>-NN ids, which are no longer bundled. Do not re-import.
// Generates the Dinosaurs pages from the owner's dinosaur clipart (art/svg/dinosaurs/source/), each in a prehistoric
// scene.
//   npx tsx tools/dinosaurs/generate.ts                 writes art/svg/dinosaurs/dino-<name>-NN.svg
//   npx tsx tools/dinosaurs/generate.ts --import        also imports each page (npm run lcw -- page import)
//   npx tsx tools/dinosaurs/generate.ts --style lake    one scene style for every page (volcano, jungle or lake)
// The clipart is converted like the Animals pages (tools/art/clipart.ts), and its heavier lines are thinned to the
// Animals line thickness. Re-running overwrites the generated SVGs; the sources are never changed.
import { join } from 'node:path';

import { addClipartRegions, Art, hits, loadClipart, seeded, type Box, type Clipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';
import { circle, cloud, ellipse, n } from '../art/primitives';

type Style = 'volcano' | 'jungle' | 'lake' | 'sea';
type Rand = () => number;

/** What a scene needs to know about the dinosaur: its box (scenery keeps out) and its width on the ground. */
type Place = { box: Box; span: [number, number]; /** The side kept free for the scene's big feature (the palm). */ free: 'left' | 'right' };

const birdLines = (x: number, y: number, s: number) => {
  const bird = (bx: number, by: number, k: number) =>
    `M ${n(bx - 2 * k)},${n(by)} Q ${n(bx - k)},${n(by - 1.3 * k)} ${n(bx)},${n(by)} Q ${n(bx + k)},${n(by - 1.3 * k)} ${n(bx + 2 * k)},${n(by)}`;
  return [bird(x, y, s), bird(x + 2.6 * s, y + 2.2 * s, s * 0.7)];
};
const grassTuft = (x: number, y: number) =>
  `M ${n(x - 14)},${n(y)} L ${n(x - 7)},${n(y - 20)} L ${n(x)},${n(y)} L ${n(x + 7)},${n(y - 24)} L ${n(x + 14)},${n(y)}`;

const HILLS = [
  'M -20,636 C 220,606 400,620 520,640 C 660,660 860,612 1044,630 V 790 H -20 Z',
  'M -20,612 C 200,650 380,646 512,642 C 660,638 840,600 1044,622 V 790 H -20 Z',
  'M -20,650 C 240,620 420,636 512,642 C 640,650 820,664 1044,638 V 790 H -20 Z',
];

function sun(a: Art, x: number, y: number) {
  a.r('sun', circle(x, y, 54));
  for (let i = 0; i < 8; i++) {
    const t = (i * Math.PI) / 4;
    a.l(`M ${n(x + 72 * Math.cos(t))},${n(y + 72 * Math.sin(t))} L ${n(x + 92 * Math.cos(t))},${n(y + 92 * Math.sin(t))}`);
  }
}

/** Birds at the first free spots, if any. */
function birds(a: Art, rand: Rand, spots: [number, number][], avoid: Box[]) {
  const free = spots.filter(([x, y]) => x > 40 && x < 940 && y > 40 && !hits([x - 40, y - 26, x + 70, y + 44], avoid));
  for (const [x, y] of free.slice(0, rand() < 0.5 ? 1 : 2)) a.l(...birdLines(x, y, 13 + 4 * rand()));
}

/** The free ground on each side of the dinosaur: [left, right] as [from, to] ranges (empty when too narrow). */
const sides = (p: Place): [[number, number], [number, number]] => [
  [40, p.span[0] - 30],
  [p.span[1] + 30, 984],
];

// --- Volcano valley: a smoking volcano behind, the sun on the other side, rocks and grass in front.

function volcanoScene(a: Art, rand: Rand, p: Place) {
  const left = rand() < 0.5;
  const vx = left ? 150 : 874;
  const sx = left ? 880 : 144;
  sun(a, sx, 110);
  a.r('cloud', cloud(left ? 690 : 334, 120, 0.6));
  a.r(
    'volcano',
    `<path d="M ${vx - 200},680 C ${vx - 130},560 ${vx - 80},420 ${vx - 58},340 Q ${vx},326 ${vx + 58},340 C ${vx + 80},420 ${vx + 130},560 ${vx + 200},680 Z"`,
  );
  a.r(
    'lava',
    `<path d="M ${vx - 58},340 Q ${vx},326 ${vx + 58},340 L ${vx + 66},376 Q ${vx + 50},400 ${vx + 34},380 Q ${vx + 18},420 ${vx},388 Q ${vx - 20},410 ${vx - 36},384 Q ${vx - 52},402 ${vx - 66},378 Z"`,
  );
  const dir = left ? 1 : -1;
  a.r('smoke', cloud(vx + 20 * dir, 298, 0.5));
  a.r('smoke-puff', circle(vx + 44 * dir, 256, 34));
  birds(a, rand, [[left ? 470 : 470, 90], [left ? 600 : 360, 150]], [p.box]);
  a.r('ground', `<path d="${HILLS[Math.floor(rand() * HILLS.length)]}"`);
  for (const [lo, hi] of sides(p)) {
    if (hi - lo < 110) {
      if (hi - lo > 40) a.l(grassTuft((lo + hi) / 2, 700));
      continue;
    }
    const x = lo + (hi - lo) * (0.35 + 0.3 * rand());
    a.r(`rock-${lo < 512 ? 'left' : 'right'}`, `<path d="M ${x - 52},712 C ${x - 56},672 ${x - 24},650 ${x + 4},654 C ${x + 40},656 ${x + 58},684 ${x + 54},712 Z"`);
    a.l(grassTuft(x + (lo < 512 ? 74 : -74), 716));
  }
}

// --- Jungle: palm trees at the sides, ferns at their feet.

/** A pointed leaf from `base`, `len` long at `deg`, bending down at the tip by `droop`. */
function leaf(base: [number, number], deg: number, len: number, wide: number, droop: number) {
  const t = (deg * Math.PI) / 180;
  const [bx, by] = base;
  const tip = [bx + len * Math.cos(t), by + len * Math.sin(t) + droop];
  const mx = bx + 0.5 * len * Math.cos(t);
  const my = by + 0.5 * len * Math.sin(t) + droop * 0.2;
  const [px, py] = [-Math.sin(t) * wide, Math.cos(t) * wide];
  return `<path d="M ${n(bx)},${n(by)} Q ${n(mx + px)},${n(my + py)} ${n(tip[0]!)},${n(tip[1]!)} Q ${n(mx - px)},${n(my - py)} ${n(bx)},${n(by)} Z"`;
}

function palm(a: Art, name: string, x: number, lean: number) {
  const top: [number, number] = [x + lean, 300];
  a.r(`${name}-trunk`, `<path d="M ${x - 20},672 Q ${x - 26},470 ${top[0] - 14},${top[1] + 8} L ${top[0] + 14},${top[1] + 8} Q ${x + 6},470 ${x + 20},672 Z"`);
  for (const y of [600, 530, 460, 390]) a.l(`M ${n(x - 20 + (lean * (672 - y)) / 400)},${y} q 20,10 40,0`);
  a.r(
    `${name}-leaves`,
    ...([
      [-175, 60],
      [-140, 40],
      [-100, 10],
      [-75, 10],
      [-40, 40],
      [-5, 60],
    ] as const).map(([deg, droop]) => leaf(top, deg, 110, 30, droop)),
  );
}

function jungleScene(a: Art, rand: Rand, p: Place) {
  const [l, r] = sides(p);
  // One palm, on the roomier side (it may stand partly behind the dinosaur, never in front of it).
  const roomL = l[1] - l[0];
  const roomR = r[1] - r[0];
  const palmLeft = roomL === roomR ? p.free === 'left' : roomL > roomR;
  const at = (x: number) => (palmLeft ? x : 1024 - x);
  sun(a, at(300), 100);
  a.r('cloud', cloud(at(850), 124, 0.66));
  a.r('cloud-small', cloud(at(580), 72, 0.5));
  birds(a, rand, [[at(470) - 30, 150], [at(720) - 30, 210]], [p.box]);
  a.r('ground', `<path d="${HILLS[Math.floor(rand() * HILLS.length)]}"`);
  if (palmLeft) palm(a, 'palm', Math.min(110, l[1] - 150), 24);
  else palm(a, 'palm', Math.max(914, r[0] + 150), -24);
}

// --- Lake: mountains far away, a lake, and a nest of eggs on the shore.

function lakeScene(a: Art, rand: Rand, p: Place) {
  const sunLeft = rand() < 0.5;
  sun(a, sunLeft ? 130 : 894, 104);
  a.r('cloud', cloud(sunLeft ? 820 : 204, 150, 0.62));
  const peaks = [
    [190, 300],
    [480, 250],
    [790, 290],
  ] as const;
  a.r(
    'mountains',
    ...peaks.map(([x, y]) => `<path d="M ${x - 230},580 L ${x - 30},${y + 12} Q ${x},${y - 10} ${x + 30},${y + 12} L ${x + 230},580 Z"`),
  );
  a.r(
    'snow',
    ...peaks.map(
      ([x, y]) => `<path d="M ${x - 30},${y + 12} Q ${x},${y - 10} ${x + 30},${y + 12} L ${x + 62},${y + 56} L ${x + 30},${y + 44} L ${x},${y + 66} L ${x - 30},${y + 44} L ${x - 62},${y + 56} Z"`,
    ),
  );
  birds(a, rand, [[sunLeft ? 300 : 640, 80], [sunLeft ? 440 : 520, 150]], [p.box]);
  a.r('lake', '<path d="M -20,560 C 300,548 700,574 1044,556 V 680 H -20 Z"');
  a.r('ground', '<path d="M -20,650 C 240,628 420,640 512,646 C 640,654 820,664 1044,640 V 790 H -20 Z"');
  const [l, r] = sides(p);
  for (const [lo, hi] of [l, r]) {
    if (hi - lo < 60) continue;
    a.l(`M ${n(lo + (hi - lo) * 0.2)},592 q 16,-8 32,0 q 16,8 32,0`);
    if (hi - lo > 200) a.l(`M ${n(lo + (hi - lo) * 0.55)},620 q 14,-7 28,0 q 14,7 28,0`);
  }
  // The nest goes on the roomier side.
  const [lo, hi] = l[1] - l[0] >= r[1] - r[0] ? l : r;
  if (hi - lo >= 170) {
    const x = (lo + hi) / 2;
    const w = Math.min(100, (hi - lo) / 2);
    a.r('egg-1', ellipse(x - w * 0.36, 660, 36, 48, -12));
    a.r('egg-2', ellipse(x + w * 0.36, 660, 36, 48, 12));
    a.r('nest', `<path d="M ${n(x - w)},678 Q ${x},662 ${n(x + w)},678 Q ${n(x + w - 8)},738 ${x},740 Q ${n(x - w + 8)},738 ${n(x - w)},678 Z"`);
    a.l(`M ${n(x - w * 0.7)},698 L ${n(x + w * 0.5)},716`, `M ${n(x - w * 0.4)},726 L ${n(x + w * 0.72)},694`);
  } else a.l(grassTuft((lo + hi) / 2, 712));
}

// --- Sea: for swimmers. A strip of sky, the wavy sea surface and bubbles rising.

/** A bubble (the big ones with a little shine). Small ones are `small-` parts (allowed below the area minimum). */
function bubble(a: Art, name: string, x: number, y: number, r: number) {
  a.r(r < 20 ? `small-${name}` : name, circle(x, y, r));
  if (r >= 24) a.l(`M ${n(x - r * 0.55)},${n(y - r * 0.1)} Q ${n(x - r * 0.5)},${n(y - r * 0.5)} ${n(x - r * 0.1)},${n(y - r * 0.58)}`);
}

function seaScene(a: Art, rand: Rand, p: Place) {
  const sunLeft = rand() < 0.5;
  sun(a, sunLeft ? 120 : 904, 64);
  a.r('cloud', cloud(sunLeft ? 820 : 204, 76, 0.55));
  // The wavy surface: gentle bumps across the page, then down to below the page.
  const waves = Array.from({ length: 8 }, (_, i) => `Q ${-20 + 133 * i + 66},${i % 2 ? 196 : 164} ${-20 + 133 * (i + 1)},180`).join(' ');
  a.r('sea', `<path d="M -20,180 ${waves} V 790 H -20 Z"`);
  // Columns of bubbles rising, smaller towards the top, wherever they clear the swimmer.
  const [bx0, by0, bx1, by1] = p.box;
  let k = 0;
  for (const x0 of [70, 170, 290, 420, 560, 700, 830, 950]) {
    let x = x0 + (rand() - 0.5) * 30;
    let y = 600 - rand() * 60;
    let r = 22 + rand() * 6;
    while (y > 200 && r > 9) {
      const clear = x + r + 14 < bx0 || x - r - 14 > bx1 || y + r + 14 < by0 || y - r - 14 > by1;
      if (clear) bubble(a, `bubble-${++k}`, x, y, r);
      y -= r * 2.6 + 10;
      x += (rand() - 0.5) * 24;
      r *= 0.78;
    }
  }
}

const SCENES: Record<Style, (a: Art, rand: Rand, p: Place) => void> = { volcano: volcanoScene, jungle: jungleScene, lake: lakeScene, sea: seaScene };

// --- The dinosaurs

/** Where a dinosaur stands; ones that fly or swim are lifted off the ground. */
const FIT = { footY: 664, height: 460, maxWidth: 700 };
/** Room kept clear at one side for the palm (page units from the edge). */
const FREE_SIDE = 300;

/** `id` becomes the page id `dino-<id>`; `source` is the file number in art/svg/dinosaurs/source/. */
export type Dino = {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  style?: Style;
  footY?: number;
  /** Lines that close shapes the artist left open, in the source file's coordinates (see addClipartRegions). */
  close?: string[];
  /** Points inside solid spots that have a white highlight (so are not eyes), in source coordinates. */
  spots?: [number, number][];
};

/**
 * The smallest area children can colour: the 4-5 minimum (0.15% of the page, about 34 units square), so a dinosaur's
 * far legs and arms can be coloured too. The pages are marked 4-5 for the validator.
 */
const MIN_AREA = 0.0015 * 1024 * 768;

export const DINOS: Dino[] = [
  {
    id: 'brachiosaurus-01',
    title: 'Brachiosaurus',
    subtitle: 'Brachiosaurus has a long, long neck!',
    source: '01',
    close: ['M4934 3284 Q5940 3318 6946 2916 Q7784 3184 8656 2782 Q9930 3318 11204 3217', 'M4498 2178 L5001 2111'],
  },
  {
    id: 'triceratops-01',
    title: 'Triceratops',
    subtitle: 'Triceratops has three horns!',
    source: '02',
    close: ['M7267 3156 Q8441 3403 9646 3094', 'M11747 3681 Q13045 4114 14374 4114', 'M7514 5659 Q7576 5226 7359 4886'],
  },
  {
    id: 't-rex-01',
    title: 'T. rex',
    subtitle: 'Little T. rex says hi!',
    source: '03',
    close: ['M6275 7303 Q6637 7073 6802 6546', 'M7098 4869 Q8775 5099 10453 4112'],
  },
  {
    id: 'stegosaurus-01',
    title: 'Stegosaurus',
    subtitle: 'Stegosaurus has plates on its back!',
    source: '04',
    close: ['M6008 2720 Q7162 2908 8315 2559', 'M10621 3069 Q11962 3337 13330 3096'],
  },
  {
    id: 'pteranodon-01',
    title: 'Pteranodon',
    subtitle: 'Pteranodon flies up high!',
    source: '05',
    footY: 560,
    close: ['M11275 9313 L10915 7486 L11579 3111', 'M10527 1450 Q10804 1671 11136 1837', 'M9336 2336 Q10195 2613 11081 2364'],
  },
  {
    id: 'spiky-01',
    title: 'Spiky Dino',
    subtitle: 'Spiky dino wants to play!',
    source: '06',
    close: ['M6078 5839 Q5421 5526 4889 5244', 'M6266 3491 Q7237 3271 7957 2395', 'M9835 3365 Q10806 3522 11776 3052'],
  },
  {
    id: 'parasaurolophus-01',
    title: 'Parasaurolophus',
    subtitle: 'Parasaurolophus has a crest on its head!',
    source: '07',
    close: ['M5912 4740 Q5976 4323 5720 3842', 'M6939 5446 Q7774 5607 8608 5222 Q10149 5671 11689 4644'],
  },
  {
    id: 'raptor-01',
    title: 'Raptor',
    subtitle: 'Raptor can run fast!',
    source: '08',
    // The near arm's shoulder and the near leg's hip.
    close: ['M 5398,6231 Q 5902,6320 6406,5638', 'M 7680,4868 Q 9161,5668 10672,4424'],
  },
  {
    id: 'spinosaurus-01',
    title: 'Spinosaurus',
    subtitle: 'Spinosaurus has a big sail!',
    source: '09',
    close: ['M7637 3215 Q8838 3473 10039 3101', 'M12441 3673 Q13786 3987 15130 3702'],
  },
  {
    id: 'plesiosaurus-01',
    title: 'Plesiosaurus',
    subtitle: 'Plesiosaurus loves to swim!',
    source: '10',
    style: 'sea',
    footY: 664,
    close: ['M6575 3357 Q7239 3538 7902 3237', 'M10826 3056 Q11338 3508 11971 3417'],
  },
  {
    id: 't-rex-02',
    title: 'T. rex',
    subtitle: 'Roar! T. rex is happy!',
    source: '12',
    close: ['M6191 6417 Q6624 6169 6841 5457', 'M8079 5209 Q9688 5457 11298 4838'],
  },
  {
    id: 'spiky-02',
    title: 'Spiky Dino',
    subtitle: 'Spiky dino has spikes on its back!',
    source: '13',
    close: ['M5429 6089 Q5845 5851 6084 5315', 'M6292 2607 Q7810 2934 9328 2577'],
    spots: [[6917,  8619],  [8167,  6446]],
  },
  {
    id: 'triceratops-02',
    title: 'Triceratops',
    subtitle: 'Triceratops says hello!',
    source: '14',
    close: ['M7149 2985 Q8357 3186 9590 2985', 'M11704 3740 Q13089 4092 14498 4042', 'M6620 4797 Q6595 4394 6343 4067'],
  },
  {
    id: 'stegosaurus-02',
    title: 'Stegosaurus',
    subtitle: 'Stegosaurus goes for a walk!',
    source: '15',
    close: ['M6238 2756 Q7386 2974 8561 2646', 'M11049 3084 Q12470 3466 13892 3412'],
  },
  {
    id: 'spinosaurus-02',
    title: 'Spinosaurus',
    subtitle: 'Little Spinosaurus has a sail!',
    source: '16',
    close: ['M5896 6520 Q6421 6396 6730 5716', 'M9203 5005 Q10593 5345 12015 4295'],
  },
  {
    id: 'diplodocus-01',
    title: 'Diplodocus',
    subtitle: 'Diplodocus has a long tail!',
    source: '17',
    close: ['M5753 3062 Q6732 3184 7742 2725 Q8721 3123 9731 2756 Q10771 2572 11811 1899'],
  },
  {
    id: 'triceratops-03',
    title: 'Triceratops',
    subtitle: 'Triceratops has a frilly collar!',
    source: '18',
    close: ['M8181 3288 Q9485 3520 10790 3317', 'M13109 4042 Q14500 4448 15921 4303', 'M7195 5433 Q7224 5607 7340 5781'],
  },
  {
    id: 'raptor-02',
    title: 'Raptor',
    subtitle: 'Raptor has stripes!',
    source: '19',
    close: ['M6181 6459 Q6607 6338 6941 5639', 'M8248 4788 Q9920 5365 11622 4757'],
  },
  {
    id: 'ankylosaurus-01',
    title: 'Ankylosaurus',
    subtitle: 'Ankylosaurus has a spiky back!',
    source: '20',
    close: ['M6351 3230 Q7604 3584 8857 3475 Q10028 3774 11062 4156 Q12370 4482 13650 4401'],
  },
  {
    id: 'spinosaurus-03',
    title: 'Spinosaurus',
    subtitle: 'Spinosaurus is smiling!',
    source: '21',
    close: ['M5916 5798 Q6392 5574 6673 4760', 'M9168 4648 Q10794 4845 12420 3975'],
  },
  {
    id: 'baby-02',
    title: 'Baby Dino',
    subtitle: 'Baby dino stands up tall!',
    source: '22',
    close: ['M5230 6133 Q5792 5945 5948 5102', 'M5917 3416 Q7197 3634 8509 2729'],
  },
  {
    id: 'ankylosaurus-02',
    title: 'Ankylosaurus',
    subtitle: 'Ankylosaurus has bumpy armor!',
    source: '23',
    close: ['M5977 3290 Q7393 3516 8808 3261 Q10224 3573 11639 3714 Q13252 4025 14894 3856', 'M5411 4875 Q5270 4422 4987 3969'],
  },
  {
    id: 'spinosaurus-04',
    title: 'Spinosaurus',
    subtitle: 'Spinosaurus waves hello!',
    source: '24',
    close: ['M5812 6207 Q6317 5891 6412 5197', 'M8716 4282 Q10231 4503 11714 3714'],
  },
  {
    id: 'ankylosaurus-03',
    title: 'Ankylosaurus',
    subtitle: 'Ankylosaurus has a club on its tail!',
    source: '25',
    close: ['M7262 3137 Q8564 3397 9866 3021 Q11081 3629 12267 3947 Q13598 4323 14957 4178', 'M4572 4902 Q5150 5654 5931 6204'],
  },
];

const style = (() => {
  const i = process.argv.indexOf('--style');
  return i >= 0 ? (process.argv[i + 1] as Style) : undefined;
})();

/** Where a dinosaur goes on its page: it steps aside to leave its free side to the palm, which never stands behind it. */
export function place(dino: Dino): { clip: Clipart; free: 'left' | 'right' } {
  const file = join(ROOT, `art/svg/dinosaurs/source/${dino.source}.svg`);
  const fit = { ...FIT, footY: dino.footY ?? FIT.footY };
  const free = seeded(`${dino.id}-side`)() < 0.5 ? 'left' : 'right';
  const w = loadClipart(file, fit).bounds;
  const half = (w.maxX - w.minX) / 2;
  const centerX = Math.min(1004 - half, Math.max(512, FREE_SIDE + half));
  return { clip: loadClipart(file, { ...fit, centerX: free === 'left' ? centerX : 1024 - centerX }), free };
}

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const dino of DINOS.filter((d) => !only || only.some((w) => `dino-${d.id}`.includes(w)))) {
    const a = new Art();
    const { clip, free } = place(dino);
    const b = clip.bounds;
    const rand = seeded(dino.id);
    SCENES[style ?? dino.style ?? 'jungle'](a, rand, { box: [b.minX - 20, b.minY - 20, b.maxX + 20, b.maxY], span: [b.minX, b.maxX], free });
    await addClipartRegions(a, clip, { close: dino.close, spots: dino.spots, minArea: MIN_AREA });
    pages.push({ id: `dino-${dino.id}`, title: dino.title, subtitle: dino.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/dinosaurs'), 'dinosaurs', { theme: 'Dinosaurs', generator: 'tools/dinosaurs/generate.ts' });
}

if (require.main === module) void main();
