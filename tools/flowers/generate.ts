// Generates the Flowers pages from the owner's "Simple Flowers" pack (art/svg/flowers/simple/<NN>.svg, from
// ~/Desktop/Little Color World/Flowers/Selected/SIMPLE FLOWERS-1-<NN>.svg; 02–70, sources 26–70 added 2026-11-25). It replaced the "Bold Flowers" pack on
// 2026-11-25 (owner: "remove flowers and add these, I have got the permission to use them"); the old flower-<nn> page
// ids are not reused.
//   npx tsx tools/flowers/generate.ts              writes art/svg/flowers/bloom-<id>.svg
//   npx tsx tools/flowers/generate.ts --import     also imports each page (npm run lcw -- page import)
// Each source's lines are first trimmed to the other packs' thickness (tools/flowers/thin_all.sh, tools/art/uniform_lines.py
// --cap, into art/svg/flowers/simple-thin/; it also closes petals left open at the stamen): lines wider than 10.5 are
// trimmed, thinner lines and dots stay as drawn. Then every line is kept as trimmed and the white areas become
// colourable (tools/art/clipart.ts addClipart with smallParts), like the Sea Animals pages. No background; big and
// centred. (addClipartRegions left some outer petals uncoloured on these drawings.)
import { join } from 'node:path';

import { addClipart, Art, loadClipart } from '../art/clipart';
import { ROOT, writePages, type GeneratedPage } from '../art/layered';

/** Big and centred: a little margin inside the 1024×768 page. */
const FIT = { footY: 0, centerY: 384, height: 690, maxWidth: 930 };

/** `src` is the source file number; the page id is `bloom-<id>`. Left out: 01 (Yarrow; hundreds of tiny florets, far over
 * the region limit) and 46, 64, 66 (Wildflowers, Sweet Pea, Chamomile: sketchy drawings with dozens of broken lines,
 * so most leaves and petals would leak into the background). */
type Pic = { id: string; src: string; title: string; subtitle: string };

const PICS: Pic[] = [
  { id: 'sunflower', src: '15', title: 'Sunflower', subtitle: 'A big, sunny sunflower!' },
  { id: 'coneflower', src: '02', title: 'Coneflower', subtitle: 'A flower with a spiky middle!' },
  { id: 'wild-rose', src: '03', title: 'Wild Rose', subtitle: 'Five round petals!' },
  { id: 'babys-breath', src: '04', title: "Baby's Breath", subtitle: 'Tiny little flowers!' },
  { id: 'hibiscus', src: '05', title: 'Hibiscus', subtitle: 'A big, bright hibiscus!' },
  { id: 'magnolia', src: '06', title: 'Magnolia', subtitle: 'A magnolia with a little bud!' },
  { id: 'orchid', src: '07', title: 'Orchid', subtitle: 'A pretty orchid!' },
  { id: 'black-eyed-susan', src: '08', title: 'Black-Eyed Susan', subtitle: 'A flower with a dark middle!' },
  { id: 'phlox', src: '09', title: 'Phlox', subtitle: 'Little flowers up the stem!' },
  { id: 'tulip-bud', src: '10', title: 'Tulip', subtitle: 'A tall tulip!' },
  { id: 'carnation', src: '11', title: 'Carnation', subtitle: 'A frilly carnation!' },
  { id: 'little-sunflower', src: '12', title: 'Little Sunflower', subtitle: 'A sunflower with two leaves!' },
  { id: 'lavender', src: '13', title: 'Lavender', subtitle: 'Sweet-smelling lavender!' },
  { id: 'buttercups', src: '14', title: 'Buttercups', subtitle: 'Three happy flowers!' },
  { id: 'tulip', src: '16', title: 'Big Tulip', subtitle: 'A round, cosy tulip!' },
  { id: 'hollyhock', src: '17', title: 'Hollyhock', subtitle: 'Flowers all the way up!' },
  { id: 'big-hibiscus', src: '18', title: 'Big Hibiscus', subtitle: 'A hibiscus with a bud!' },
  { id: 'poppy', src: '19', title: 'Poppy', subtitle: 'A poppy with a bud!' },
  { id: 'zinnia', src: '20', title: 'Zinnia', subtitle: 'Round and round the petals go!' },
  { id: 'daisy', src: '21', title: 'Daisy', subtitle: 'A happy daisy!' },
  { id: 'rosebud', src: '22', title: 'Rosebud', subtitle: 'A rose just opening!' },
  { id: 'rose', src: '23', title: 'Rose', subtitle: 'A lovely rose!' },
  { id: 'pink-carnation', src: '24', title: 'Pink Carnation', subtitle: 'Frilly, frilly petals!' },
  { id: 'lupine', src: '25', title: 'Lupine', subtitle: 'A tall, pointy lupine!' },
  { id: 'big-daisy', src: '26', title: 'Big Daisy', subtitle: 'Lots of long petals!' },
  { id: 'cosmos', src: '27', title: 'Cosmos', subtitle: 'A cosmos with feathery leaves!' },
  { id: 'lotus-bud', src: '28', title: 'Lotus Bud', subtitle: 'A lotus about to open!' },
  { id: 'tall-tulip', src: '29', title: 'Tall Tulip', subtitle: 'A tulip with big leaves!' },
  { id: 'happy-flower', src: '30', title: 'Happy Flower', subtitle: 'A round, happy flower!' },
  { id: 'folk-flowers', src: '31', title: 'Folk Flowers', subtitle: 'Fancy flowers in a row!' },
  { id: 'morning-glory', src: '32', title: 'Morning Glory', subtitle: 'A trumpet-shaped flower!' },
  { id: 'little-daisy', src: '33', title: 'Little Daisy', subtitle: 'A little daisy with two leaves!' },
  { id: 'foxglove', src: '34', title: 'Foxglove', subtitle: 'Bells all the way down!' },
  { id: 'sunshine-flower', src: '35', title: 'Sunshine Flower', subtitle: 'Pointy petals like sunshine!' },
  { id: 'field-poppy', src: '36', title: 'Field Poppy', subtitle: 'A poppy from the field!' },
  { id: 'bellflower', src: '37', title: 'Bellflower', subtitle: 'Ding dong, bellflower!' },
  { id: 'pointy-sunflower', src: '38', title: 'Pointy Sunflower', subtitle: 'Two rows of petals!' },
  { id: 'garden-rose', src: '39', title: 'Garden Rose', subtitle: 'A rose from the garden!' },
  { id: 'forget-me-not', src: '40', title: 'Forget-Me-Not', subtitle: 'Tiny flowers in a bunch!' },
  { id: 'open-magnolia', src: '41', title: 'Open Magnolia', subtitle: 'A magnolia opening wide!' },
  { id: 'pinwheel-flower', src: '42', title: 'Pinwheel Flower', subtitle: 'Petals that spin around!' },
  { id: 'daffodil', src: '43', title: 'Daffodil', subtitle: 'A daffodil says hello spring!' },
  { id: 'flower-bud', src: '44', title: 'Flower Bud', subtitle: 'A bud with a big leaf!' },
  { id: 'peony', src: '45', title: 'Peony', subtitle: 'A big, fluffy peony!' },
  { id: 'anemone', src: '47', title: 'Anemone', subtitle: 'Round petals and a dotty middle!' },
  { id: 'fancy-flowers', src: '48', title: 'Fancy Flowers', subtitle: 'Swirly, fancy flowers!' },
  { id: 'hibiscus-bloom', src: '49', title: 'Hibiscus Bloom', subtitle: 'A wide, wavy hibiscus!' },
  { id: 'camellia', src: '50', title: 'Camellia', subtitle: 'Petals round and round!' },
  { id: 'fuchsia', src: '51', title: 'Fuchsia', subtitle: 'A flower like a dancer!' },
  { id: 'dotty-sunflower', src: '52', title: 'Dotty Sunflower', subtitle: 'A sunflower full of seeds!' },
  { id: 'carnation-bud', src: '53', title: 'Carnation Bud', subtitle: 'A carnation just opening!' },
  { id: 'folk-bouquet', src: '54', title: 'Folk Bouquet', subtitle: 'A pretty pattern of flowers!' },
  { id: 'peony-bud', src: '55', title: 'Peony and Bud', subtitle: 'A peony with a little bud!' },
  { id: 'round-daisy', src: '56', title: 'Round Daisy', subtitle: 'Big, round petals!' },
  { id: 'harebell', src: '57', title: 'Harebell', subtitle: 'Little bells that nod!' },
  { id: 'three-daisies', src: '58', title: 'Three Daisies', subtitle: 'One, two, three daisies!' },
  { id: 'dog-rose', src: '59', title: 'Dog Rose', subtitle: 'A wild rose with buds!' },
  { id: 'gerbera', src: '60', title: 'Gerbera', subtitle: 'A gerbera looking up!' },
  { id: 'star-lily', src: '61', title: 'Star Lily', subtitle: 'A lily shaped like a star!' },
  { id: 'simple-tulip', src: '62', title: 'Simple Tulip', subtitle: 'A tulip with two leaves!' },
  { id: 'plumeria', src: '63', title: 'Plumeria', subtitle: 'Five-petal flowers in a bunch!' },
  { id: 'sunny-sunflower', src: '65', title: 'Sunny Sunflower', subtitle: 'A sunflower with pointy petals!' },
  { id: 'crocus', src: '67', title: 'Crocus', subtitle: 'A crocus pops up in spring!' },
  { id: 'dandelion', src: '68', title: 'Dandelion', subtitle: 'A fluffy dandelion flower!' },
  { id: 'lily-of-the-valley', src: '69', title: 'Lily of the Valley', subtitle: 'Tiny white bells!' },
  { id: 'heart-flowers', src: '70', title: 'Heart Flowers', subtitle: 'Flowers shaped like hearts!' },
];

async function main() {
  const pages: GeneratedPage[] = [];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]!.split(',') : null;
  for (const p of PICS.filter((x) => !only || only.includes(`bloom-${x.id}`))) {
    const a = new Art();
    addClipart(a, loadClipart(join(ROOT, `art/svg/flowers/simple-thin/${p.src}.svg`), FIT, { dedupe: true }), 1, { smallParts: true });
    pages.push({ id: `bloom-${p.id}`, title: p.title, subtitle: p.subtitle, age: '4-5', regions: a.regions, details: a.details, lines: a.lines });
  }
  writePages(pages, join(ROOT, 'art/svg/flowers'), 'flowers', { theme: 'Flowers', generator: 'tools/flowers/generate.ts' });
}

if (require.main === module) void main();
