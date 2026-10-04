import { Colorway, Hotspot, Product, Review, Size } from '../models/product';
import { COLORWAYS } from './colorways';

const ALL_SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/** Deterministic stock so the prototype is stable between reloads. */
function seededStock(seed: number, colorways: Colorway[], sizes: Size[]): Product['stock'] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const stock: Product['stock'] = {};
  for (const c of colorways) {
    stock[c.id] = {};
    for (const size of sizes) {
      const r = rand();
      stock[c.id][size] = r < 0.12 ? 0 : r < 0.3 ? Math.ceil(r * 10) : 12 + Math.floor(r * 40);
    }
  }
  return stock;
}

const TEE_HOTSPOTS: Hotspot[] = [
  { id: 'collar', label: 'Rib collar', detail: '1×1 rib, 2.2 cm. Bound with a taped back neck so it holds its shape after 100 washes.', x: 0.09, y: 0.49, side: 'front' },
  { id: 'shoulder', label: 'Dropped shoulder', detail: 'Seam sits 6 cm off the shoulder for a relaxed drape without extra length.', x: 0.37, y: 0.44, side: 'front' },
  { id: 'hem', label: 'Double-needle hem', detail: 'Twin 3 mm stitch lines. No curl, no wave.', x: -0.25, y: -0.585, side: 'front' },
  { id: 'print', label: 'Cracked-ink print', detail: 'Water-based discharge ink. It fades with the garment instead of peeling off.', x: 0, y: 0.05, side: 'back' },
];

const FLEECE_HOTSPOTS: Hotspot[] = [
  { id: 'rib', label: '2×2 rib hem', detail: '8 cm band with elastane core. It gathers at the waist and doesn\'t bag out.', x: -0.2, y: -0.6, side: 'front' },
  { id: 'fleece', label: 'Loopback fleece', detail: 'Unbrushed inside. It breathes better and softens with every wash.', x: 0.18, y: 0.12, side: 'front' },
  { id: 'cuff', label: 'Long cuff', detail: '10 cm cuffs you can push up without them sliding down.', x: 0.74, y: -0.36, side: 'front' },
  { id: 'back', label: 'Back print', detail: 'Discharge print across the shoulder blades, 30 cm wide.', x: 0, y: 0.18, side: 'back' },
];

const HOODIE_HOTSPOTS: Hotspot[] = [
  { id: 'hood', label: 'Double-layer hood', detail: 'Self-lined, 38 cm tall. It stands up on its own, no drawcord pulling.', x: 0.14, y: 0.72, side: 'front' },
  { id: 'pocket', label: 'Kangaroo pocket', detail: 'Bartacked at the openings. The pocket is cut on the bias so it lies flat.', x: 0.16, y: -0.3, side: 'front' },
  { id: 'cord', label: 'Waxed flat cord', detail: 'Cotton cord with brushed-steel aglets.', x: -0.06, y: 0.24, side: 'front' },
  { id: 'rib', label: '2×2 rib hem', detail: '8 cm band with elastane core.', x: 0.26, y: -0.62, side: 'front' },
];

const REVIEWS: Review[] = [
  { author: 'Mara K.', location: 'Berlin', rating: 5, size: 'M', fit: 'True to size', title: 'Finally a heavy tee that drapes', body: 'Heavy tees are usually stiff as cardboard. This one hangs like it\'s worn in already, and after ten washes it hasn\'t shrunk at all.', date: '2026-08-14' },
  { author: 'Dev R.', location: 'London', rating: 5, size: 'L', fit: 'Runs large', title: 'Boxy in the right way', body: 'Wide through the body and cropped just enough. I\'m usually an L and sized down to an M for a closer fit.', date: '2026-07-30' },
  { author: 'Sol A.', location: 'Mexico City', rating: 4, size: 'S', fit: 'True to size', title: 'The colour is unreal', body: 'Clay looks like fired terracotta in daylight. Knocked one star off because the collar was a little tight the first day. It relaxed.', date: '2026-07-02' },
  { author: 'Jun P.', location: 'Seoul', rating: 5, size: 'M', fit: 'True to size', title: 'Worth the price', body: 'It\'s €30 more than the fast-fashion version and three times the garment. The print has aged better than anything else I own.', date: '2026-06-11' },
];

const tee = [COLORWAYS.soot, COLORWAYS.bone, COLORWAYS.clay, COLORWAYS.celadon];
const hoodie = [COLORWAYS.soot, COLORWAYS.ash, COLORWAYS.oxide, COLORWAYS.bone];
const longsleeve = [COLORWAYS.bone, COLORWAYS.soot, COLORWAYS.ash];
const crew = [COLORWAYS.ash, COLORWAYS.celadon, COLORWAYS.bone, COLORWAYS.clay];
const glazeTee = [COLORWAYS.oxide, COLORWAYS.bone, COLORWAYS.ash];
const hoodieClay = [COLORWAYS.clay, COLORWAYS.celadon, COLORWAYS.soot];

export const CATALOG: Product[] = [
  {
    id: 'p-firing-tee',
    slug: 'firing-tee',
    name: 'Firing Tee',
    kind: 'tee',
    firing: 'Firing 04',
    cone: 'Cone 06',
    price: 68,
    gsm: 300,
    fit: 'Boxy, dropped shoulder, cropped 3 cm',
    tagline: 'The tee the collection is built around.',
    description:
      '300gsm combed-cotton jersey, knitted on vintage loop machines, then garment-dyed and tumbled at heat so it arrives fully shrunk. The body is boxy and the shoulder dropped. It drapes rather than clings.',
    details: ['Boxy fit, cropped 3 cm', 'Dropped shoulder', '1×1 rib collar with taped back neck', 'Double-needle hems', 'Garment-dyed, pre-shrunk'],
    materials: ['100% combed organic cotton', '300gsm single jersey', 'Knitted in Portugal'],
    care: ['Wash cold, inside out', 'Line dry', 'Do not tumble — it has been fired once already'],
    colorways: tee,
    sizes: ALL_SIZES,
    stock: seededStock(11, tee, ALL_SIZES),
    frontPrints: ['wordmark', 'cone', 'none'],
    backPrints: ['firing', 'seal', 'none'],
    defaultFront: 'wordmark',
    defaultBack: 'firing',
    hotspots: TEE_HOTSPOTS,
    reviews: REVIEWS,
    isNew: true,
  },
  {
    id: 'p-kiln-hoodie',
    slug: 'kiln-hoodie',
    name: 'Kiln Hoodie',
    kind: 'hoodie',
    firing: 'Firing 04',
    cone: 'Cone 10',
    price: 165,
    gsm: 480,
    fit: 'Relaxed body, long 2×2 rib, standing hood',
    tagline: '480gsm of loopback. It doesn\'t move unless you do.',
    description:
      'Our heaviest piece. It\'s 480gsm unbrushed loopback fleece, cut wide through the body and gathered by a long rib hem. The double-layer hood stands on its own, and the kangaroo pocket is bias-cut so it lies flat instead of sagging.',
    details: ['Relaxed body, long rib hem', 'Double-layer standing hood', 'Bias-cut kangaroo pocket', 'Waxed flat cord, steel aglets', 'Flatlock side panels'],
    materials: ['100% organic cotton', '480gsm loopback fleece', 'Knitted & sewn in Portugal'],
    care: ['Wash cold, inside out', 'Dry flat', 'Expect it to soften for a year'],
    colorways: hoodie,
    sizes: ALL_SIZES,
    stock: seededStock(29, hoodie, ALL_SIZES),
    frontPrints: ['none', 'wordmark', 'seal'],
    backPrints: ['glaze', 'firing', 'none'],
    defaultFront: 'none',
    defaultBack: 'glaze',
    hotspots: HOODIE_HOTSPOTS,
    reviews: REVIEWS.slice(0, 3),
    isNew: true,
    limited: 400,
  },
  {
    id: 'p-cone-longsleeve',
    slug: 'cone-10-longsleeve',
    name: 'Cone 10 Longsleeve',
    kind: 'longsleeve',
    firing: 'Firing 04',
    cone: 'Cone 10',
    price: 85,
    gsm: 260,
    fit: 'Regular body, extended sleeve',
    tagline: 'Named for the hottest standard firing.',
    description:
      'A lighter jersey cut with an extended sleeve that stacks at the wrist. The small cone print at the chest refers to the pyrometric cones potters use to judge heat by eye.',
    details: ['Regular fit', 'Extended sleeve with rib cuff', 'Chest cone print', 'Side-seamed for structure'],
    materials: ['100% combed organic cotton', '260gsm single jersey'],
    care: ['Wash cold', 'Line dry'],
    colorways: longsleeve,
    sizes: ALL_SIZES,
    stock: seededStock(47, longsleeve, ALL_SIZES),
    frontPrints: ['cone', 'wordmark', 'none'],
    backPrints: ['none', 'seal'],
    defaultFront: 'cone',
    defaultBack: 'none',
    hotspots: FLEECE_HOTSPOTS.filter((h) => h.id !== 'rib'),
    reviews: REVIEWS.slice(1),
  },
  {
    id: 'p-ash-crew',
    slug: 'ash-crew',
    name: 'Ash Crew',
    kind: 'crew',
    firing: 'Firing 04',
    cone: 'Cone 08',
    price: 135,
    gsm: 420,
    fit: 'Relaxed, rib-gathered hem',
    tagline: 'A sweatshirt with the weight of a jacket.',
    description:
      '420gsm heathered loopback. It sits wide at the chest and gathers at a long rib hem. The seal is printed small at the chest.',
    details: ['Relaxed fit', 'Long 2×2 rib at hem and cuff', 'Chest seal print', 'Flatlock raglan detail'],
    materials: ['80% organic cotton, 20% recycled cotton', '420gsm loopback'],
    care: ['Wash cold, inside out', 'Dry flat'],
    colorways: crew,
    sizes: ALL_SIZES,
    stock: seededStock(61, crew, ALL_SIZES),
    frontPrints: ['seal', 'wordmark', 'none'],
    backPrints: ['none', 'glaze'],
    defaultFront: 'seal',
    defaultBack: 'none',
    hotspots: FLEECE_HOTSPOTS,
    reviews: REVIEWS.slice(0, 2),
  },
  {
    id: 'p-glaze-tee',
    slug: 'glaze-tee',
    name: 'Glaze Tee',
    kind: 'tee',
    firing: 'Firing 04',
    cone: 'Cone 06',
    price: 62,
    compareAt: 72,
    gsm: 240,
    fit: 'Regular, lighter drape',
    tagline: 'The summer weight, with the glaze rings on its back.',
    description:
      'A 240gsm version of the Firing Tee, cut slightly closer. The glaze-ring print on the back comes from the test tiles in our studio kiln.',
    details: ['Regular fit', 'Glaze-ring back print', 'Taped back neck'],
    materials: ['100% organic cotton', '240gsm jersey'],
    care: ['Wash cold', 'Line dry'],
    colorways: glazeTee,
    sizes: ALL_SIZES,
    stock: seededStock(83, glazeTee, ALL_SIZES),
    frontPrints: ['none', 'cone'],
    backPrints: ['glaze', 'none'],
    defaultFront: 'none',
    defaultBack: 'glaze',
    hotspots: TEE_HOTSPOTS,
    reviews: REVIEWS.slice(2),
  },
  {
    id: 'p-kiln-hoodie-clay',
    slug: 'kiln-hoodie-earthenware',
    name: 'Kiln Hoodie — Earthenware',
    kind: 'hoodie',
    firing: 'Firing 04',
    cone: 'Cone 06',
    price: 175,
    gsm: 480,
    fit: 'Relaxed body, long 2×2 rib, standing hood',
    tagline: 'The Kiln Hoodie, dyed in earthenware tones.',
    description:
      'The same 480gsm loopback as the Kiln Hoodie, dyed in three earthenware colours and printed with the seal on the front and the kiln chart on the back. 150 pieces per colour.',
    details: ['Limited to 150 per colour', 'Double-layer standing hood', 'Seal front, chart back'],
    materials: ['100% organic cotton', '480gsm loopback fleece'],
    care: ['Wash cold, inside out', 'Dry flat'],
    colorways: hoodieClay,
    sizes: ALL_SIZES.slice(1),
    stock: seededStock(97, hoodieClay, ALL_SIZES.slice(1)),
    frontPrints: ['seal', 'none'],
    backPrints: ['firing', 'glaze'],
    defaultFront: 'seal',
    defaultBack: 'firing',
    hotspots: HOODIE_HOTSPOTS,
    reviews: REVIEWS.slice(0, 1),
    limited: 150,
  },
];

export const FREE_SHIPPING_THRESHOLD = 150;
export const SHIPPING_FLAT = 8;
