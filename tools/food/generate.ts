// Generates the Food pages from the owner's "Cute Food Doodles" clipart
// (art/svg/food/source/food-<pack number>.svg, from ~/Downloads/CuteFood/Selected).
//   npx tsx tools/food/generate.ts              writes art/svg/food/food-<nn>.svg
//   npx tsx tools/food/generate.ts --import     also imports each page (npm run lcw -- page import)
// Converted like the Christmas pages (tools/art/clipart.ts): no background, each food drawn big and centred.
// Pages 25 (Dumplings), 45 (Gingerbread Man), 46 (Chocolate Bar), 49 (Popcorn) and 50 (Spaghetti) were removed by
// the owner (2026-11-02); their numbers are not reused.
import { join } from 'node:path';

import { addClipartRegions, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

const MIN_CORE = Number(process.env.MIN_CORE ?? 1500);
/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `n` is the page number (id `food-<n>`), `src` the number in the clipart pack. `eyeAt` marks each eye (source
 * units) where the converter guesses wrong. `minCore` lowers the size at which solid black is opened up. `target` is
 * the line thickness lines are thinned to (higher keeps thin details on heavily outlined drawings). */
type Pic = { n: string; src: string; title: string; subtitle: string; minCore?: number; eyeAt?: [number, number][]; target?: number };

const PICS: Pic[] = [
  { n: '01', src: '001', title: 'Happy Cupcake', subtitle: 'A smiley little cupcake!', eyeAt: [[4100, 3560], [5850, 3600]] },
  { n: '02', src: '002', title: 'Sprinkle Cupcake', subtitle: 'Lots of sprinkles on top!' },
  { n: '03', src: '013', title: 'Big Donut', subtitle: 'A donut with sprinkles!' },
  { n: '04', src: '014', title: 'Iced Donut', subtitle: 'Yummy icing on top!' },
  { n: '05', src: '015', title: 'Berry Pancakes', subtitle: 'A stack of pancakes!' },
  { n: '06', src: '016', title: 'Butter Pancakes', subtitle: 'Pancakes with butter!' },
  { n: '07', src: '017', title: 'Syrup Pancakes', subtitle: 'Drip, drip, sweet syrup!' },
  { n: '08', src: '019', title: 'Fruit Tart', subtitle: 'A tart full of fruit!' },
  { n: '09', src: '020', title: 'Fruit Bowl Tart', subtitle: 'Kiwi, strawberry and apple!' },
  { n: '10', src: '023', title: 'Berry Cake', subtitle: 'A slice of berry cake!' },
  { n: '11', src: '024', title: 'Berry Pie', subtitle: 'A slice of yummy pie!' },
  { n: '12', src: '029', title: 'Ice Lolly', subtitle: 'Cold and sweet!' },
  { n: '13', src: '039', title: 'Happy Sundae', subtitle: 'A cherry on top!', eyeAt: [[4350, 4050], [5820, 4050]] },
  { n: '14', src: '040', title: 'Milkshake', subtitle: 'Slurp through the straw!' },
  { n: '15', src: '048', title: 'Happy Drink', subtitle: 'A smiley cup with a straw!', eyeAt: [[4310, 4220], [5900, 4220]] },
  { n: '16', src: '055', title: 'Milk Carton', subtitle: 'A cute carton of milk!' },
  { n: '17', src: '066', title: 'Watermelon', subtitle: 'Juicy watermelon slice!' },
  { n: '18', src: '069', title: 'Happy Sandwich', subtitle: 'A smiley sandwich!', eyeAt: [[4100, 5830], [6140, 5830]] },
  { n: '19', src: '089', title: 'Broccoli', subtitle: 'A happy little tree to eat!', eyeAt: [[4920, 3970], [5360, 3970]] },
  { n: '20', src: '090', title: 'Carrot', subtitle: 'Crunch, crunch, carrot!', eyeAt: [[4680, 5400], [5480, 5450]] },
  { n: '21', src: '094', title: 'Egg on Toast', subtitle: 'An egg on toast!' },
  { n: '22', src: '101', title: 'Happy Muffin', subtitle: 'A muffin full of chocolate chips!', eyeAt: [[4020, 5350], [6020, 5320]] },
  { n: '23', src: '108', title: 'Layer Cake', subtitle: 'A slice of layer cake!' },
  { n: '24', src: '111', title: 'Sprinkle Donut', subtitle: 'Round and sweet!' },
  { n: '26', src: '131', title: 'Burger', subtitle: 'A yummy burger!' },
  { n: '27', src: '132', title: 'Big Burger', subtitle: 'A burger with lettuce!' },
  { n: '28', src: '136', title: 'Hot Dog', subtitle: 'A hot dog in a bun!' },
  { n: '29', src: '137', title: 'Sandwich', subtitle: 'A tasty sandwich!' },
  { n: '30', src: '139', title: 'Toasty Sandwich', subtitle: 'A warm toasty sandwich!' },
  { n: '31', src: '142', title: 'Sesame Burger', subtitle: 'Seeds on the bun!' },
  { n: '32', src: '145', title: 'Milk Bottle', subtitle: 'A bottle of milk!' },
  { n: '33', src: '149', title: 'Crisps Bowl', subtitle: 'A bowl of crunchy snacks!' },
  { n: '34', src: '171', title: 'Double Burger', subtitle: 'Two burgers in one!' },
  { n: '35', src: '177', title: 'Cherry Pancakes', subtitle: 'A cherry on top!' },
  { n: '36', src: '179', title: 'Cake Slice', subtitle: 'A big slice of cake!' },
  { n: '37', src: '187', title: 'Fizzy Drink', subtitle: 'A cup with a straw!' },
  { n: '38', src: '204', title: 'Cookie Plate', subtitle: 'A plate of cookies!' },
  { n: '39', src: '217', title: 'Dumpling Bowl', subtitle: 'Dumplings in a bowl!' },
  { n: '40', src: '221', title: 'Sweet Skewer', subtitle: 'Three sweets on a stick!' },
  { n: '41', src: '225', title: 'Croissant', subtitle: 'A flaky croissant!' },
  { n: '42', src: '228', title: 'Bagel', subtitle: 'A sesame bagel!' },
  { n: '43', src: '232', title: 'Honey Pancakes', subtitle: 'Pancakes with honey!' },
  { n: '44', src: '248', title: 'Ice Cream Glass', subtitle: 'Ice cream in a tall glass!' },
  { n: '47', src: '288', title: 'Lollipop', subtitle: 'A swirly lollipop!' },
  { n: '48', src: '289', title: 'Pretzel', subtitle: 'A twisty pretzel!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.some((w) => `food-${x.n}`.includes(w)))) {
    const a = new Art();
    const clip = loadClipart(join(ROOT, `art/svg/food/source/food-${p.src}.svg`), FIT, { dedupe: true });
    await addClipartRegions(a, clip, { minArea: 0.0015 * 1024 * 768, minCore: p.minCore ?? MIN_CORE, maxRegions: 80, eyeAt: p.eyeAt, target: p.target });
    pages.push({ id: `food-${p.n}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/food'), 'food', { theme: 'Food', generator: 'tools/food/generate.ts' });
}

if (require.main === module) void main();
