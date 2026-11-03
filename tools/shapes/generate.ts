// Generates the Shapes theme: 30 pages that build from one big shape to pictures made of many shapes.
//   npx tsx tools/shapes/generate.ts            writes art/svg/shapes/<page-id>.svg
//   npx tsx tools/shapes/generate.ts --import   also imports each page (npm run lcw -- page import)
// The SVGs follow the Inkscape layer convention (docs/ARTWORK_PIPELINE.md), so they can be hand-edited later;
// re-running this script overwrites them.
import { join } from 'node:path';

import { INK, ROOT, writePages, type Region } from '../art/layered';
import { circle, diamond, ellipse, crescent, halfCircle, heart, n, poly, rect, regular, star, trapezoid, triangle, type Pt } from '../art/primitives';

type Shape = Region;
type Page = {
  slug: string;
  title: string;
  subtitle?: string;
  age: '2-3' | '4-5';
  /** Paint order: later shapes sit on top. A full-page background region is added underneath. */
  regions: Shape[];
  /** Locked, pre-colored bits (eyes). */
  details?: string[];
  /** Extra lines (smiles, stripes). */
  lines?: string[];
};

const shape = (name: string, el: string): Shape => ({ name, el });

// --- Faces for the shape friends: eyes are locked details, the smile is a line.
function face(cx: number, cy: number, k: number, page: { details: string[]; lines: string[] }) {
  for (const side of [-1, 1]) {
    const ex = cx + side * 40 * k;
    const ey = cy - 22 * k;
    page.details.push(`<circle inkscape:label="eye" cx="${n(ex)}" cy="${n(ey)}" r="${n(17 * k)}" style="fill:${INK}" />`);
    page.details.push(`<circle inkscape:label="eye-shine" cx="${n(ex + 6 * k)}" cy="${n(ey - 6 * k)}" r="${n(6 * k)}" style="fill:#ffffff" />`);
  }
  page.lines.push(`M ${n(cx - 38 * k)},${n(cy + 26 * k)} Q ${n(cx)},${n(cy + 66 * k)} ${n(cx + 38 * k)},${n(cy + 26 * k)}`);
}

/** One shape friend: the shape plus a face, as used on the single and pair pages. */
type Friend = { name: string; el: string; face: [number, number, number] };

const SINGLE: Array<Friend & { title: string; subtitle: string }> = [
  { name: 'circle', title: 'Circle', subtitle: 'Round all the way around', el: circle(512, 384, 290), face: [512, 384, 1.5] },
  { name: 'square', title: 'Square', subtitle: '4 sides, all the same', el: rect(237, 109, 550, 550), face: [512, 384, 1.5] },
  { name: 'triangle', title: 'Triangle', subtitle: '3 sides, 3 corners', el: triangle(512, 450, 350), face: [512, 480, 1.2] },
  { name: 'rectangle', title: 'Rectangle', subtitle: '2 long sides, 2 short sides', el: rect(162, 184, 700, 400), face: [512, 384, 1.5] },
  { name: 'oval', title: 'Oval', subtitle: 'A stretched-out circle', el: ellipse(512, 384, 360, 250), face: [512, 384, 1.5] },
  { name: 'star', title: 'Star', subtitle: '5 points', el: star(512, 410, 340), face: [512, 430, 1.1] },
  { name: 'heart', title: 'Heart', subtitle: '2 bumps and a point', el: heart(512, 384, 600), face: [512, 340, 1.3] },
  { name: 'diamond', title: 'Diamond', subtitle: '4 sides, standing on a corner', el: diamond(512, 384, 260, 320), face: [512, 384, 1.3] },
  { name: 'half-circle', title: 'Half Circle', subtitle: 'A circle cut in half', el: halfCircle(512, 570, 350), face: [512, 440, 1.4] },
  { name: 'crescent', title: 'Crescent', subtitle: 'Like the moon at night', el: crescent(512, 384, 320), face: [355, 384, 0.95] },
  { name: 'pentagon', title: 'Pentagon', subtitle: '5 sides', el: regular(5, 512, 405, 330, -90), face: [512, 410, 1.4] },
  { name: 'hexagon', title: 'Hexagon', subtitle: '6 sides', el: regular(6, 512, 384, 330, 0), face: [512, 384, 1.4] },
  { name: 'octagon', title: 'Octagon', subtitle: '8 sides', el: regular(8, 512, 384, 330, 22.5), face: [512, 384, 1.4] },
  { name: 'trapezoid', title: 'Trapezoid', subtitle: '4 sides, short on top, long on the bottom', el: trapezoid(512, 384, 380, 700, 420), face: [512, 390, 1.4] },
];

const PAIRS: Array<{ slug: string; title: string; friends: [Friend, Friend] }> = [
  {
    slug: 'circle-and-square',
    title: 'Circle and Square',
    friends: [
      { name: 'circle', el: circle(285, 384, 205), face: [285, 384, 1.1] },
      { name: 'square', el: rect(560, 204, 360, 360), face: [740, 384, 1.1] },
    ],
  },
  {
    slug: 'triangle-and-rectangle',
    title: 'Triangle and Rectangle',
    friends: [
      { name: 'triangle', el: triangle(280, 440, 250), face: [280, 470, 0.9] },
      { name: 'rectangle', el: rect(540, 254, 410, 260), face: [745, 384, 1.1] },
    ],
  },
  {
    slug: 'star-and-heart',
    title: 'Star and Heart',
    friends: [
      { name: 'star', el: star(280, 400, 250), face: [280, 418, 0.8] },
      { name: 'heart', el: heart(745, 384, 420), face: [745, 352, 0.95] },
    ],
  },
  {
    slug: 'oval-and-diamond',
    title: 'Oval and Diamond',
    friends: [
      { name: 'oval', el: ellipse(285, 384, 225, 160), face: [285, 384, 1.1] },
      { name: 'diamond', el: diamond(745, 384, 190, 270), face: [745, 384, 1] },
    ],
  },
];

function friendsPage(slug: string, title: string, subtitle: string | undefined, friends: Friend[]): Page {
  const details: string[] = [];
  const lines: string[] = [];
  for (const f of friends) face(...f.face, { details, lines });
  return { slug, title, subtitle, age: '2-3', regions: friends.map((f) => shape(f.name, f.el)), details, lines };
}

const eye = (cx: number, cy: number, r: number) => [
  `<circle inkscape:label="pupil" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" style="fill:${INK}" />`,
  `<circle inkscape:label="pupil-shine" cx="${n(cx + r * 0.35)}" cy="${n(cy - r * 0.35)}" r="${n(r * 0.35)}" style="fill:#ffffff" />`,
];

const PICTURES: Page[] = [
  {
    slug: 'house',
    title: 'House',
    subtitle: 'Square, triangle, rectangle, circle',
    age: '2-3',
    regions: [
      shape('sun-circle', circle(880, 130, 75)),
      shape('wall-square', rect(322, 330, 380, 380)),
      shape('roof-triangle', poly([[292, 345], [732, 345], [512, 95]])),
      shape('window-left-square', rect(357, 400, 110, 110)),
      shape('window-right-square', rect(557, 400, 110, 110)),
      shape('door-rectangle', rect(467, 560, 90, 150)),
    ],
  },
  {
    slug: 'ice-cream',
    title: 'Ice Cream',
    subtitle: 'Triangle and circles',
    age: '2-3',
    regions: [
      shape('cone-triangle', poly([[372, 400], [652, 400], [512, 735]])),
      shape('scoop-circle', circle(512, 285, 150)),
      shape('cherry-circle', circle(512, 105, 45)),
    ],
  },
  {
    slug: 'snowman',
    title: 'Snowman',
    subtitle: 'Circles, rectangles, triangle',
    age: '2-3',
    regions: [
      shape('body-circle', circle(512, 525, 200)),
      shape('head-circle', circle(512, 240, 125)),
      shape('hat-rectangle', rect(437, 28, 150, 100)),
      shape('brim-rectangle', rect(392, 118, 240, 32)),
      shape('nose-triangle', poly([[497, 236], [497, 296], [622, 266]])),
      shape('button-top-circle', circle(512, 440, 36)),
      shape('button-middle-circle', circle(512, 535, 36)),
      shape('button-bottom-circle', circle(512, 630, 36)),
    ],
    details: [
      `<circle inkscape:label="eye" cx="462" cy="205" r="15" style="fill:${INK}" />`,
      `<circle inkscape:label="eye" cx="555" cy="205" r="15" style="fill:${INK}" />`,
    ],
    lines: ['M 457,318 Q 507,345 557,318'],
  },
  {
    slug: 'fish',
    title: 'Fish',
    subtitle: 'Oval, triangles, circles',
    age: '2-3',
    regions: [
      shape('tail-triangle', poly([[690, 384], [900, 214], [900, 554]])),
      shape('fin-triangle', poly([[400, 250], [560, 250], [440, 140]])),
      shape('body-oval', ellipse(470, 384, 270, 175)),
      shape('eye-circle', circle(340, 345, 48)),
      shape('bubble-big-circle', circle(150, 200, 42)),
      shape('bubble-small-circle', circle(100, 95, 36)),
    ],
    details: eye(330, 350, 20),
    lines: ['M 240,420 Q 262,440 284,420'],
  },
  {
    slug: 'pine-tree',
    title: 'Pine Tree',
    subtitle: 'Triangles, rectangle, star',
    age: '2-3',
    regions: [
      shape('trunk-rectangle', rect(462, 600, 100, 130)),
      shape('bottom-triangle', poly([[252, 625], [772, 625], [512, 345]])),
      shape('middle-triangle', poly([[297, 485], [727, 485], [512, 215]])),
      shape('top-triangle', poly([[342, 345], [682, 345], [512, 105]])),
      shape('star', star(512, 85, 62)),
    ],
  },
  {
    slug: 'boat',
    title: 'Boat',
    subtitle: 'Trapezoid, triangles, rectangle, circle',
    age: '2-3',
    regions: [
      shape('sun-circle', circle(150, 140, 75)),
      shape('water-rectangle', rect(20, 610, 984, 140)),
      shape('mast-rectangle', rect(497, 130, 30, 400)),
      shape('big-sail-triangle', poly([[545, 140], [545, 490], [800, 490]])),
      shape('small-sail-triangle', poly([[480, 200], [480, 490], [285, 490]])),
      shape('hull-trapezoid', trapezoid(512, 580, 600, 380, 120)),
    ],
  },
  {
    slug: 'car',
    title: 'Car',
    subtitle: 'Rectangle, trapezoid, squares, circles',
    age: '4-5',
    regions: [
      shape('road-rectangle', rect(20, 640, 984, 110)),
      shape('top-trapezoid', trapezoid(512, 300, 300, 460, 170)),
      shape('window-left-square', rect(398, 252, 100, 100)),
      shape('window-right-square', rect(526, 252, 100, 100)),
      shape('body-rectangle', rect(162, 380, 700, 180)),
      shape('headlight-circle', circle(815, 430, 30)),
      shape('wheel-left-circle', circle(322, 565, 88)),
      shape('wheel-right-circle', circle(702, 565, 88)),
      shape('hubcap-left-circle', circle(322, 565, 34)),
      shape('hubcap-right-circle', circle(702, 565, 34)),
    ],
  },
  {
    slug: 'rocket',
    title: 'Rocket',
    subtitle: 'Rectangle, triangles, circle, half circle, stars, crescent',
    age: '4-5',
    regions: [
      shape('moon-crescent', crescent(170, 540, 95)),
      shape('star-top-left', star(170, 150, 60)),
      shape('star-top-right', star(860, 170, 55)),
      shape('star-bottom-right', star(840, 560, 65)),
      shape('flame-half-circle', halfCircle(512, 600, 70, true)),
      shape('fin-left-triangle', poly([[432, 450], [432, 600], [320, 650]])),
      shape('fin-right-triangle', poly([[592, 450], [592, 600], [704, 650]])),
      shape('body-rectangle', rect(422, 220, 180, 380)),
      shape('nose-triangle', poly([[422, 222], [602, 222], [512, 55]])),
      shape('window-circle', circle(512, 340, 58)),
    ],
  },
  {
    slug: 'night-sky',
    title: 'Night Sky',
    subtitle: 'Crescent, stars, circle, oval, half circles',
    age: '4-5',
    regions: [
      shape('hill-left-half-circle', halfCircle(230, 745, 210)),
      shape('hill-right-half-circle', halfCircle(740, 745, 265)),
      shape('moon-crescent', crescent(270, 260, 170)),
      shape('planet-circle', circle(820, 190, 85)),
      shape('ring-oval', ellipse(820, 190, 140, 32)),
      shape('star-1', star(560, 110, 55)),
      shape('star-2', star(620, 330, 45)),
      shape('star-3', star(470, 400, 40)),
      shape('star-4', star(930, 400, 48)),
      shape('star-5', star(80, 470, 42)),
    ],
  },
  {
    slug: 'honeycomb',
    title: 'Honeycomb',
    subtitle: 'Hexagons, ovals, circle',
    age: '4-5',
    regions: [
      ...[
        [0, 0],
        ...Array.from({ length: 6 }, (_, i) => {
          const a = ((30 + 60 * i) * Math.PI) / 180;
          return [Math.cos(a) * 95 * Math.sqrt(3), Math.sin(a) * 95 * Math.sqrt(3)];
        }),
      ].map(([dx, dy], i) => shape(`hexagon-${i + 1}`, regular(6, 360 + dx!, 420 + dy!, 95, 0))),
      shape('wing-back-oval', ellipse(790, 200, 55, 80)),
      shape('body-oval', ellipse(800, 300, 125, 80)),
      shape('wing-front-oval', ellipse(840, 195, 55, 80)),
      shape('head-circle', circle(925, 290, 55)),
    ],
    details: eye(940, 278, 12),
    lines: ['M 760,232 Q 748,300 760,368', 'M 815,274 Q 809,326 815,378', 'M 922,318 Q 940,334 958,318'],
  },
  {
    slug: 'robot',
    title: 'Robot',
    subtitle: 'Squares, rectangles, circles, heart, half circles',
    age: '4-5',
    regions: [
      shape('neck-rectangle', rect(482, 240, 60, 40)),
      shape('arm-left-rectangle', rect(242, 300, 125, 50)),
      shape('arm-right-rectangle', rect(657, 300, 125, 50)),
      shape('hand-left-circle', circle(232, 325, 42)),
      shape('hand-right-circle', circle(792, 325, 42)),
      shape('leg-left-rectangle', rect(407, 555, 70, 140)),
      shape('leg-right-rectangle', rect(547, 555, 70, 140)),
      shape('foot-left-half-circle', halfCircle(442, 725, 65)),
      shape('foot-right-half-circle', halfCircle(582, 725, 65)),
      shape('head-square', rect(417, 50, 190, 190)),
      shape('body-rectangle', rect(362, 275, 300, 285)),
      shape('eye-left-circle', circle(470, 125, 32)),
      shape('eye-right-circle', circle(554, 125, 32)),
      shape('mouth-rectangle', rect(457, 180, 110, 36)),
      shape('chest-heart', heart(512, 400, 140)),
    ],
    details: [...eye(470, 128, 13), ...eye(554, 128, 13)],
  },
];

// Review page: every shape from the single pages, 5 + 4 + 5.
const PARADE_SLOTS: Pt[] = [
  ...[112, 312, 512, 712, 912].map((x) => [x, 135] as Pt),
  ...[212, 412, 612, 812].map((x) => [x, 384] as Pt),
  ...[112, 312, 512, 712, 912].map((x) => [x, 633] as Pt),
];
const paradeShape = (name: string, [x, y]: Pt): string => {
  switch (name) {
    case 'circle': return circle(x, y, 82);
    case 'square': return rect(x - 78, y - 78, 156, 156);
    case 'triangle': return triangle(x, y + 22, 100);
    case 'rectangle': return rect(x - 88, y - 55, 176, 110);
    case 'oval': return ellipse(x, y, 90, 62);
    case 'star': return star(x, y + 6, 95);
    case 'heart': return heart(x, y, 170);
    case 'diamond': return diamond(x, y, 70, 98);
    case 'half-circle': return halfCircle(x, y + 45, 92);
    case 'crescent': return crescent(x, y, 88);
    case 'pentagon': return regular(5, x, y + 6, 92, -90);
    case 'hexagon': return regular(6, x, y, 90, 0);
    case 'octagon': return regular(8, x, y, 90, 22.5);
    case 'trapezoid': return trapezoid(x, y, 100, 180, 120);
    default: throw new Error(`No parade shape for ${name}`);
  }
};
const PARADE: Page = {
  slug: 'shape-parade',
  title: 'Shape Parade',
  subtitle: 'All 14 shapes. Can you name them?',
  age: '4-5',
  regions: SINGLE.map((s, i) => shape(s.name, paradeShape(s.name, PARADE_SLOTS[i]!))),
};

const PAGES: Page[] = [
  ...SINGLE.map((s) => friendsPage(s.name, s.title, s.subtitle, [s])),
  ...PAIRS.map((p) => friendsPage(p.slug, p.title, undefined, p.friends)),
  ...PICTURES,
  PARADE,
];

if (PAGES.length !== 30) throw new Error(`Expected 30 pages, got ${PAGES.length}`);
writePages(
  PAGES.map((p, i) => ({
    ...p,
    id: `shapes-${String(i + 1).padStart(2, '0')}-${p.slug}`,
    details: p.details ?? [],
    lines: p.lines ?? [],
  })),
  join(ROOT, 'art/svg/shapes'),
  'shapes',
  { theme: 'Shapes', generator: 'tools/shapes/generate.ts' },
);
