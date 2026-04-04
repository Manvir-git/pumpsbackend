/**
 * seedSanitary.js — upserts sanitary subcategories + adds test products
 * Run: node seedSanitary.js
 */
require('dotenv').config();
const prisma = require('./lib/prisma');

function makeSlug(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const SUBCATEGORIES = [
  { slug: 'pillar-taps',       name: 'Pillar Taps',            sortOrder: 1 },
  { slug: 'bib-cocks',         name: 'Bib Cocks',              sortOrder: 2 },
  { slug: 'wall-mixers',       name: 'Wall Mixers',            sortOrder: 3 },
  { slug: 'shower-sets',       name: 'Shower Sets & Heads',    sortOrder: 4 },
  { slug: 'ball-valves',       name: 'Ball Valves',            sortOrder: 5 },
  { slug: 'gate-valves',       name: 'Gate Valves',            sortOrder: 6 },
  { slug: 'foot-valves',       name: 'Foot Valves',            sortOrder: 7 },
  { slug: 'non-return-valves', name: 'Non-Return Valves',      sortOrder: 8 },
  { slug: 'cp-fittings',       name: 'CP Fittings',            sortOrder: 9 },
  { slug: 'pvc-fittings',      name: 'PVC Fittings',           sortOrder: 10 },
  { slug: 'flush-tanks',       name: 'Flush Tanks & Cisterns', sortOrder: 11 },
  { slug: 'toilet-seats',      name: 'Toilet Seats & Covers',  sortOrder: 12 },
  { slug: 'wash-basins',       name: 'Wash Basins',            sortOrder: 13 },
  { slug: 'water-tanks',       name: 'Water Tanks',            sortOrder: 14 },
];

const PRODUCTS = {
  'pillar-taps': [
    { name: 'Jaquar Pillar Tap 15mm Chrome',       brand: 'Jaquar',    price: '850',  specs: { size_inch: '0.5"', finish: 'Chrome' },       description: 'Chrome-plated brass pillar tap for wash basins and kitchen sinks.' },
    { name: 'Parryware Pillar Tap 15mm',            brand: 'Parryware', price: '620',  specs: { size_inch: '0.5"', finish: 'Chrome' },       description: 'Durable pillar tap suitable for all standard wash basins.' },
    { name: 'Cera Pillar Tap Quarter Turn 15mm',    brand: 'Cera',      price: '740',  specs: { size_inch: '0.5"', type: 'Quarter Turn' },   description: 'Quarter-turn ceramic disc pillar tap, drip-free.' },
  ],
  'bib-cocks': [
    { name: 'Jaquar Bib Cock 15mm Chrome',          brand: 'Jaquar',    price: '680',  specs: { size_inch: '0.5"' },     description: 'Wall-mounted bib cock for outdoor or utility use.' },
    { name: 'Parryware Bib Cock 20mm',              brand: 'Parryware', price: '720',  specs: { size_inch: '0.75"' },   description: 'Heavy-duty bib cock for garden and utility connections.' },
    { name: 'Marc Bib Cock with Wall Flange 15mm',  brand: 'Marc',      price: '490',  specs: { size_inch: '0.5"' },     description: 'Bib cock with wall flange for neat wall-mounted installation.' },
  ],
  'wall-mixers': [
    { name: 'Jaquar Single Lever Wall Mixer',        brand: 'Jaquar',    price: '3200', specs: { type: 'Single Lever', finish: 'Chrome' },  description: 'Single lever concealed wall mixer for shower or basin.' },
    { name: 'Cera 2-in-1 Wall Mixer with Overhead',  brand: 'Cera',      price: '2800', specs: { type: '2-in-1', finish: 'Chrome' },       description: '2-in-1 wall mixer with diverter, compatible with overhead shower.' },
    { name: 'Parryware Wall Mixer with Crutch',      brand: 'Parryware', price: '1950', specs: { type: 'Two Knob' },                       description: 'Two-knob hot & cold wall mixer with crutch handle.' },
  ],
  'shower-sets': [
    { name: 'Jaquar Overhead Rain Shower 6"',       brand: 'Jaquar',    price: '1800', specs: { diameter_mm: '150', type: 'Overhead' },    description: '6-inch round rain shower head with arm, chrome finish.' },
    { name: 'Parryware Hand Shower Set',             brand: 'Parryware', price: '950',  specs: { type: 'Hand Shower' },                     description: 'Hand shower set with 1.5m flexible hose and wall bracket.' },
    { name: 'Cera Complete Shower Kit 4-in-1',       brand: 'Cera',      price: '4200', specs: { type: '4-in-1 Kit' },                     description: 'Complete shower kit with overhead, hand shower, and diverter.' },
    { name: 'Marc Economy Shower Rose 4"',           brand: 'Marc',      price: '320',  specs: { diameter_mm: '100', type: 'Overhead' },    description: 'Basic 4-inch shower rose with fixed arm.' },
  ],
  'ball-valves': [
    { name: 'Zoloto Ball Valve 15mm Brass',          brand: 'Zoloto',    price: '180',  specs: { size_inch: '0.5"',  material: 'Brass' },   description: 'Full bore brass ball valve, 10 bar rated.' },
    { name: 'Zoloto Ball Valve 25mm Brass',          brand: 'Zoloto',    price: '320',  specs: { size_inch: '1"',    material: 'Brass' },   description: 'Full bore ball valve for main supply lines.' },
    { name: 'Zoloto Ball Valve 32mm Brass',          brand: 'Zoloto',    price: '480',  specs: { size_inch: '1.25"', material: 'Brass' },   description: 'Heavy-duty brass ball valve for commercial applications.' },
    { name: 'Sant Ball Valve 15mm UPVC',             brand: 'Sant',      price: '95',   specs: { size_inch: '0.5"',  material: 'UPVC' },   description: 'Lightweight UPVC ball valve, corrosion-resistant.' },
    { name: 'Sant Ball Valve 20mm UPVC',             brand: 'Sant',      price: '130',  specs: { size_inch: '0.75"', material: 'UPVC' },   description: 'UPVC ball valve suitable for cold water lines.' },
  ],
  'gate-valves': [
    { name: 'Zoloto Gate Valve 15mm Brass',          brand: 'Zoloto',    price: '210',  specs: { size_inch: '0.5"',  material: 'Brass' },   description: 'Screwdown gate valve for shut-off applications.' },
    { name: 'Zoloto Gate Valve 25mm Brass',          brand: 'Zoloto',    price: '380',  specs: { size_inch: '1"',    material: 'Brass' },   description: 'Brass gate valve with wheel handle.' },
    { name: 'Sant Gate Valve 32mm',                  brand: 'Sant',      price: '520',  specs: { size_inch: '1.25"', material: 'Brass' },   description: 'Heavy-duty gate valve for pump discharge lines.' },
  ],
  'foot-valves': [
    { name: 'Zoloto Foot Valve 25mm Brass',          brand: 'Zoloto',    price: '280',  specs: { size_inch: '1"',    material: 'Brass' },   description: 'Brass foot valve with strainer for pump suction line.' },
    { name: 'Zoloto Foot Valve 40mm Brass',          brand: 'Zoloto',    price: '420',  specs: { size_inch: '1.5"',  material: 'Brass' },   description: 'Heavy-duty foot valve for deep well pump installations.' },
    { name: 'Sant Foot Valve 25mm UPVC',             brand: 'Sant',      price: '160',  specs: { size_inch: '1"',    material: 'UPVC' },   description: 'UPVC foot valve with nylon strainer, lightweight.' },
    { name: 'Sant Foot Valve 50mm UPVC',             brand: 'Sant',      price: '290',  specs: { size_inch: '2"',    material: 'UPVC' },   description: 'Large bore UPVC foot valve for high-flow pumps.' },
  ],
  'non-return-valves': [
    { name: 'Zoloto NRV 15mm Brass',                 brand: 'Zoloto',    price: '195',  specs: { size_inch: '0.5"',  type: 'Spring Check' }, description: 'Spring-loaded check valve prevents backflow.' },
    { name: 'Zoloto NRV 25mm Brass',                 brand: 'Zoloto',    price: '350',  specs: { size_inch: '1"',    type: 'Spring Check' }, description: 'Brass non-return valve for pump discharge.' },
    { name: 'Sant NRV 20mm UPVC',                    brand: 'Sant',      price: '120',  specs: { size_inch: '0.75"', type: 'Swing Check' },  description: 'UPVC swing check valve for water lines.' },
  ],
  'cp-fittings': [
    { name: 'Jaquar CP Angle Cock 15mm',             brand: 'Jaquar',    price: '420',  specs: { size_inch: '0.5"', finish: 'Chrome' },     description: 'Chrome-plated angle cock for WC and basin connections.' },
    { name: 'Jaquar CP Bottle Trap',                 brand: 'Jaquar',    price: '680',  specs: { type: 'Bottle Trap', finish: 'Chrome' },   description: 'Chrome bottle trap for wash basin waste outlet.' },
    { name: 'Parryware CP Health Faucet',            brand: 'Parryware', price: '380',  specs: { type: 'Health Faucet', finish: 'Chrome' }, description: 'Chrome health faucet with 1m flexible hose and wall hook.' },
    { name: 'Cera CP Towel Ring',                    brand: 'Cera',      price: '520',  specs: { finish: 'Chrome' },                       description: 'Wall-mounted chrome towel ring, brass body.' },
    { name: 'Jaquar CP Soap Dish',                   brand: 'Jaquar',    price: '350',  specs: { finish: 'Chrome' },                       description: 'Wall-mounted chrome soap dish with brass bracket.' },
  ],
  'pvc-fittings': [
    { name: 'Astral UPVC Elbow 90° 25mm',            brand: 'Astral',    price: '28',   specs: { size_inch: '1"',    angle: '90°' },        description: 'UPVC 90-degree elbow for potable water lines.' },
    { name: 'Astral UPVC Tee 25mm',                  brand: 'Astral',    price: '35',   specs: { size_inch: '1"' },                         description: 'Equal tee for branching UPVC pipe runs.' },
    { name: 'Finolex CPVC Elbow 90° 20mm',           brand: 'Finolex',   price: '22',   specs: { size_inch: '0.75"', angle: '90°' },        description: 'CPVC 90-degree elbow rated for hot water up to 93°C.' },
    { name: 'Finolex CPVC Tee 20mm',                 brand: 'Finolex',   price: '30',   specs: { size_inch: '0.75"' },                      description: 'CPVC equal tee for hot & cold water distribution.' },
    { name: 'Astral UPVC Coupling 32mm',             brand: 'Astral',    price: '24',   specs: { size_inch: '1.25"' },                      description: 'Straight coupling for joining UPVC pipes.' },
    { name: 'Finolex PVC Union 25mm',                brand: 'Finolex',   price: '65',   specs: { size_inch: '1"' },                         description: 'PVC union for easy disconnection of pipe sections.' },
  ],
  'flush-tanks': [
    { name: 'Parryware Flush Tank Single Piece 6L',  brand: 'Parryware', price: '1200', specs: { capacity_ltrs: '6',  type: 'Single Flush' }, description: '6-litre single-flush concealed tank with PVC fittings.' },
    { name: 'Cera Dual Flush Tank 3/6L',             brand: 'Cera',      price: '1650', specs: { capacity_ltrs: '6',  type: 'Dual Flush' },   description: 'Dual flush cistern with 3L/6L options for water saving.' },
    { name: 'Hindware Flush Valve Bottom Entry',     brand: 'Hindware',  price: '880',  specs: { type: 'Flush Valve' },                       description: 'Bottom-entry flush valve compatible with most cisterns.' },
  ],
  'toilet-seats': [
    { name: 'Parryware Toilet Seat with Lid',        brand: 'Parryware', price: '680',  specs: { type: 'Soft Close', material: 'PP' },       description: 'Soft-close polypropylene toilet seat, universal fit.' },
    { name: 'Cera Toilet Seat Heavy Duty',           brand: 'Cera',      price: '850',  specs: { type: 'Standard',   material: 'PP' },       description: 'Durable heavy-duty toilet seat and lid set.' },
    { name: 'Hindware Slim Seat Soft Close',         brand: 'Hindware',  price: '950',  specs: { type: 'Slim Soft Close' },                  description: 'Slim-profile soft-close seat with stainless steel hinges.' },
  ],
  'wash-basins': [
    { name: 'Parryware Flair Table Top Basin',       brand: 'Parryware', price: '2200', specs: { type: 'Table Top', size_inch: '18x14"' },   description: '18x14 inch counter-top wash basin, white ceramic.' },
    { name: 'Cera Wall Hung Basin 18x12"',           brand: 'Cera',      price: '1800', specs: { type: 'Wall Hung', size_inch: '18x12"' },   description: 'Wall-hung basin with tap hole, white vitreous china.' },
    { name: 'Hindware Art Basin Pedestal',           brand: 'Hindware',  price: '3200', specs: { type: 'Pedestal' },                         description: 'Full pedestal basin set with matching pedestal.' },
    { name: 'Jaquar Under Counter Basin 16"',        brand: 'Jaquar',    price: '2800', specs: { type: 'Under Counter', size_inch: '16"' },  description: 'Under-counter basin for vanity unit installation.' },
  ],
  'water-tanks': [
    { name: 'Sintex Titus 500L Water Tank',          brand: 'Sintex',    price: '3200', specs: { capacity_ltrs: '500',  layers: '3 Layer' }, description: 'Triple-layer insulated water storage tank.' },
    { name: 'Sintex Titus 1000L Water Tank',         brand: 'Sintex',    price: '5800', specs: { capacity_ltrs: '1000', layers: '3 Layer' }, description: '1000-litre triple-layer overhead water storage tank.' },
    { name: 'Sintex Titus 2000L Water Tank',         brand: 'Sintex',    price: '9500', specs: { capacity_ltrs: '2000', layers: '3 Layer' }, description: '2000-litre black triple-layer tank, UV-stabilised.' },
    { name: 'Penguin Water Tank 500L',               brand: 'Penguin',   price: '2800', specs: { capacity_ltrs: '500',  layers: '4 Layer' }, description: '4-layer food-grade LLDPE water tank.' },
    { name: 'Penguin Water Tank 1000L',              brand: 'Penguin',   price: '5200', specs: { capacity_ltrs: '1000', layers: '4 Layer' }, description: '1000L 4-layer food-safe overhead tank with lid lock.' },
  ],
};

async function main() {
  // Step 1: find or create the sanitary parent
  const sanitary = await prisma.category.findUnique({ where: { slug: 'sanitary' } });
  if (!sanitary) {
    console.error('Sanitary root category not found. Run seed-categories from admin first.');
    process.exit(1);
  }

  // Step 2: upsert each subcategory
  console.log('Upserting sanitary subcategories...');
  for (const sub of SUBCATEGORIES) {
    await prisma.category.upsert({
      where:  { slug: sub.slug },
      update: { name: sub.name, sortOrder: sub.sortOrder },
      create: { slug: sub.slug, name: sub.name, parentId: sanitary.id, icon: '', sortOrder: sub.sortOrder, isActive: true },
    });
  }
  console.log(`  ✓  ${SUBCATEGORIES.length} subcategories upserted`);

  // Step 3: fetch all subcats from DB
  const cats = await prisma.category.findMany({
    where: { slug: { in: Object.keys(PRODUCTS) } },
  });
  const catMap = {};
  cats.forEach(c => { catMap[c.slug] = c; });

  // Step 4: seed products (skip if already exist)
  let added = 0, skipped = 0;
  for (const [catSlug, products] of Object.entries(PRODUCTS)) {
    const cat = catMap[catSlug];
    if (!cat) { console.warn(`  ⚠  Missing: ${catSlug}`); continue; }

    for (const p of products) {
      const exists = await prisma.product.findFirst({
        where: { name: p.name, categoryId: cat.id },
      });
      if (exists) { skipped++; continue; }

      await prisma.product.create({
        data: {
          name:        p.name,
          brand:       p.brand,
          brandSlug:   makeSlug(p.brand),
          categoryId:  cat.id,
          price:       p.price,
          specs:       p.specs || {},
          features:    [],
          variants:    [],
          images:      [],
          description: p.description || '',
          isActive:    true,
          sortOrder:   0,
          stock:       Math.floor(Math.random() * 30) + 5,
        },
      });
      added++;
    }
    console.log(`  ✓  ${cat.name} — ${products.length} products`);
  }

  console.log(`\nDone. ${added} products added, ${skipped} already existed.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
