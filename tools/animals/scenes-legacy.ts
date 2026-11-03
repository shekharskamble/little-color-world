// LEGACY (2026-11-02): replaced by tools/animals/generate.ts (the MeadMor cute animal pack, no background). Kept for
// reference; its pages (animal-<name>-01) were removed.
// Generates the Animals pages from the owner's kawaii animal clipart (art/svg/animals/source/), each placed in its
// own little scene.
//   npx tsx tools/animals/generate.ts            writes art/svg/animals/animal-<name>-01.svg
//   npx tsx tools/animals/generate.ts --import   also imports each page (npm run lcw -- page import)
// The clipart draws its lines as filled black shapes with holes. Each hole becomes a part children can fill (tiny ones
// stay white), and the black artwork becomes one locked detail drawn on top, so the lines stay exactly as drawn.
// Scenery (sun, cloud, birds, flowers) changes from page to page and keeps clear of the animal.
// Re-running overwrites the generated SVGs; the sources are never changed.
import { join } from "node:path";

import { addClipart, Art, hits, loadClipart, seeded, type Box } from "../art/clipart";
import { ROOT, writePages, type GeneratedPage } from "../art/layered";
import { circle, cloud, n, type Pt } from "../art/primitives";

// --- Scenery

/** A flower in the grass: five round petals (one region), a yellow middle and a stem. */
const flower = (a: Art, name: string, x: number, y: number) => {
  a.l(`M ${n(x)},${n(y + 30)} Q ${n(x - 6)},${n(y + 60)} ${n(x)},${n(y + 92)}`);
  for (let i = 0; i < 5; i++) {
    const t = ((-90 + 72 * i) * Math.PI) / 180;
    a.r(name, circle(x + 25 * Math.cos(t), y + 25 * Math.sin(t), 22));
  }
  a.d("flower-middle", circle(x, y, 14), "#ffd43b");
};
/** A pair of birds drawn like the app background's: two curved wings each, the second one smaller. */
const birdLines = (x: number, y: number, s: number) => {
  const bird = (bx: number, by: number, k: number) =>
    `M ${n(bx - 2 * k)},${n(by)} Q ${n(bx - k)},${n(by - 1.3 * k)} ${n(bx)},${n(by)} Q ${n(bx + k)},${n(by - 1.3 * k)} ${n(bx + 2 * k)},${n(by)}`;
  return [bird(x, y, s), bird(x + 2.6 * s, y + 2.2 * s, s * 0.7)];
};
const grassTuft = (x: number, y: number) =>
  `M ${n(x - 14)},${n(y)} L ${n(x - 7)},${n(y - 20)} L ${n(x)},${n(y)} L ${n(x + 7)},${n(y - 24)} L ${n(x + 14)},${n(y)}`;

const HILLS = [
  "M -20,636 C 220,606 400,620 520,640 C 660,660 860,612 1044,630 V 790 H -20 Z",
  "M -20,612 C 200,650 380,646 512,642 C 660,638 840,600 1044,622 V 790 H -20 Z",
  "M -20,650 C 240,620 420,636 512,642 C 640,650 820,664 1044,638 V 790 H -20 Z",
];

type SceneOpts = {
  /** Where the animal is: birds and the cloud keep out of these boxes. */
  avoid: Box[];
  /** The animal's width at ground level: flowers grow only outside it. */
  span: [number, number];
};

/**
 * A different little scene on every page, picked from `seed`: the sun on one side and a cloud on the other, a pair
 * or two of birds, a gently different hill, and flowers or grass tufts in the grass.
 */
function scene(a: Art, seed: string, o: SceneOpts) {
  const rand = seeded(seed);
  const pick = (lo: number, hi: number) => lo + (hi - lo) * rand();
  const sunLeft = rand() < 0.5;
  const sunX = sunLeft ? pick(108, 160) : pick(864, 916);
  const sunY = pick(100, 136);
  a.r("sun", circle(sunX, sunY, 54));
  for (let i = 0; i < 8; i++) {
    const t = (i * Math.PI) / 4;
    a.l(
      `M ${n(sunX + 72 * Math.cos(t))},${n(sunY + 72 * Math.sin(t))} L ${n(sunX + 92 * Math.cos(t))},${n(sunY + 92 * Math.sin(t))}`,
    );
  }
  const spots: Pt[] = [
    [sunX + (sunLeft ? 30 : -100), sunY + pick(150, 190)],
    [sunX + (sunLeft ? 150 : -230), sunY + pick(-20, 30)],
  ];
  // The cloud goes on the other side, pushed out past the animal (about 110 wide each side of its centre).
  const reachL = Math.min(...o.avoid.map((b) => b[0]));
  const reachR = Math.max(...o.avoid.map((b) => b[2]));
  const cx = sunLeft
    ? Math.max(pick(810, 860), reachR + 112)
    : Math.min(pick(164, 214), reachL - 112);
  if (cx > 110 && cx < 914) {
    const cy = pick(120, 196);
    a.r("cloud", cloud(cx, cy, pick(0.62, 0.8)));
    spots.push(cy > 160 ? [cx - 50, cy - 92] : [cx - 40, cy + 92]);
  }
  const free = spots.filter(
    ([x, y]) =>
      x > 40 &&
      x < 940 &&
      y > 40 &&
      !hits([x - 40, y - 26, x + 70, y + 44], o.avoid),
  );
  const pairs = Math.min(free.length, rand() < 0.5 ? 1 : 2);
  for (const [x, y] of free.sort(() => rand() - 0.5).slice(0, pairs))
    a.l(...birdLines(x, y, pick(13, 17)));

  a.r("ground", `<path d="${HILLS[Math.floor(rand() * HILLS.length)]}"`);
  let flowers = 0;
  for (const [lo, hi] of [
    [60, o.span[0] - 56],
    [o.span[1] + 56, 970],
  ] as const) {
    const width = hi - lo;
    if (width < 40) continue;
    // Two flowers only where there is room for both.
    const count = width < 230 ? Math.floor(rand() * 2) : Math.floor(rand() * 3);
    if (count === 0) {
      a.l(grassTuft(lo + width * pick(0.2, 0.5), 690));
      continue;
    }
    const xs =
      count === 1 ? [lo + width / 2] : [lo + width * 0.22, hi - width * 0.22];
    for (const x of xs) flower(a, `flower-${++flowers}`, x, pick(590, 610));
  }
}

// --- The animal clipart

/** The animal stands on the ground here and is scaled to this height (narrower if it would be too wide). */
const FIT = { footY: 656, height: 540, maxWidth: 660 };

function drawClipart(a: Art, seed: string, file: string) {
  const clip = loadClipart(file, FIT);
  const b = clip.bounds;
  scene(a, seed, {
    avoid: [[b.minX - 20, b.minY - 20, b.maxX + 20, b.maxY]],
    span: [b.minX, b.maxX],
  });
  addClipart(a, clip);
}

// --- The animals (source file numbers are the bundle's: 1-01 … 1-15)

type Animal = { slug: string; title: string; subtitle: string; source: string };

const ANIMALS: Animal[] = [
  {
    slug: "penguin",
    title: "Penguin",
    subtitle: "Penguin says hello!",
    source: "01-penguin",
  },
  {
    slug: "dog",
    title: "Dog",
    subtitle: "Puppy has a shiny collar!",
    source: "02-dog",
  },
  { slug: "cat", title: "Cat", subtitle: "Kitty says meow!", source: "03-cat" },
  {
    slug: "cow",
    title: "Cow",
    subtitle: "Moo! Cow says hello!",
    source: "04-cow",
  },
  {
    slug: "owl",
    title: "Owl",
    subtitle: "Hoot hoot! Owl is wide awake!",
    source: "05-owl",
  },
  {
    slug: "koala",
    title: "Koala",
    subtitle: "Koala has fluffy ears!",
    source: "06-koala",
  },
  {
    slug: "frog",
    title: "Frog",
    subtitle: "Ribbit! Frog says hi!",
    source: "07-frog",
  },
  {
    slug: "bunny",
    title: "Bunny",
    subtitle: "Bunny has long ears!",
    source: "08-bunny",
  },
  {
    slug: "squirrel",
    title: "Squirrel",
    subtitle: "Squirrel has a bushy tail!",
    source: "09-squirrel",
  },
  {
    slug: "walrus",
    title: "Walrus",
    subtitle: "Walrus has two big tusks!",
    source: "10-walrus",
  },
  {
    slug: "bear",
    title: "Bear",
    subtitle: "Teddy says hello!",
    source: "11-bear",
  },
  {
    slug: "deer",
    title: "Deer",
    subtitle: "Little deer has antlers!",
    source: "12-deer",
  },
  {
    slug: "panda",
    title: "Panda",
    subtitle: "Panda sits and smiles!",
    source: "13-panda",
  },
  {
    slug: "tiger",
    title: "Tiger",
    subtitle: "Roar! Little tiger!",
    source: "14-tiger",
  },
  {
    slug: "lion",
    title: "Lion",
    subtitle: "Little lion has a fluffy mane!",
    source: "15-lion",
  },
];

const SOURCE_DIR = join(ROOT, "art/svg/animals/source");
const pages: GeneratedPage[] = ANIMALS.map((animal) => {
  const a = new Art();
  drawClipart(a, animal.slug, join(SOURCE_DIR, `${animal.source}.svg`));
  return {
    id: `animal-${animal.slug}-01`,
    title: animal.title,
    subtitle: animal.subtitle,
    age: "2-3",
    regions: a.regions,
    details: a.details,
    lines: a.lines,
  };
});
writePages(pages, join(ROOT, "art/svg/animals"), "animals", {
  theme: "Animals",
  generator: "tools/animals/generate.ts",
});
