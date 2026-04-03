/**
 * seeds/seedCategories.js
 * Run: node seeds/seedCategories.js
 * Wipes products + categories and recreates the full tree.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../lib/prisma');

const ROOTS = [
  { name: 'Agricultural Pumps',   slug: 'agricultural', icon: '🌾', sortOrder: 1 },
  { name: 'Domestic / Household', slug: 'domestic',     icon: '🏠', sortOrder: 2 },
  { name: 'Pipes & Fittings',     slug: 'pipes',        icon: '🔧', sortOrder: 3 },
  { name: 'Sanitary',             slug: 'sanitary',     icon: '🚿', sortOrder: 4 },
  { name: 'Accessories',          slug: 'accessories',  icon: '⚡', sortOrder: 5 },
];

async function seed() {
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('Cleared existing data');

  const saved = await Promise.all(ROOTS.map(r => prisma.category.create({ data: r })));
  const bySlug = {};
  saved.forEach(c => { bySlug[c.slug] = c.id; });

  const children = [
    { name: '7.5 HP',  slug: '7.5-hp',  parentId: bySlug.agricultural, icon: '🌾', sortOrder: 1 },
    { name: '10 HP',   slug: '10-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 2 },
    { name: '12 HP',   slug: '12-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 3 },
    { name: '15 HP',   slug: '15-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 4 },
    { name: '20 HP',   slug: '20-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 5 },
    { name: '1 HP',    slug: '1-hp',    parentId: bySlug.domestic,     icon: '🏠', sortOrder: 1 },
    { name: '1.5 HP',  slug: '1.5-hp',  parentId: bySlug.domestic,     icon: '🏠', sortOrder: 2 },
    { name: '2 HP',    slug: '2-hp',    parentId: bySlug.domestic,     icon: '🏠', sortOrder: 3 },
    { name: '3 HP',    slug: '3-hp',    parentId: bySlug.domestic,     icon: '🏠', sortOrder: 4 },
    { name: 'UPVC Pipes',    slug: 'upvc-pipes',   parentId: bySlug.pipes,        icon: '🔵', sortOrder: 1 },
    { name: 'CPVC Pipes',    slug: 'cpvc-pipes',   parentId: bySlug.pipes,        icon: '🟡', sortOrder: 2 },
    { name: 'GI Pipes',      slug: 'gi-pipes',     parentId: bySlug.pipes,        icon: '🔩', sortOrder: 3 },
    { name: 'Column Pipes',  slug: 'column-pipes', parentId: bySlug.pipes,        icon: '📏', sortOrder: 4 },
    { name: 'Valves & Cocks', slug: 'valves',       parentId: bySlug.sanitary,    icon: '⚙️',  sortOrder: 1 },
    { name: 'Taps & Faucets', slug: 'taps-faucets', parentId: bySlug.sanitary,    icon: '🚿', sortOrder: 2 },
    { name: 'GI Fittings',    slug: 'gi-fittings',  parentId: bySlug.sanitary,    icon: '🔩', sortOrder: 3 },
    { name: 'PVC Fittings',   slug: 'pvc-fittings', parentId: bySlug.sanitary,    icon: '🔵', sortOrder: 4 },
    { name: 'Water Tanks',    slug: 'water-tanks',  parentId: bySlug.sanitary,    icon: '🪣', sortOrder: 5 },
    { name: 'Pump Wire',         slug: 'pump-wire',       parentId: bySlug.accessories, icon: '🔌', sortOrder: 1 },
    { name: 'Starters & Panels', slug: 'starters-panels', parentId: bySlug.accessories, icon: '⚡', sortOrder: 2 },
  ];

  await prisma.category.createMany({ data: children });
  const total = await prisma.category.count();
  console.log(`✅ Seeded ${total} categories (${ROOTS.length} roots + ${children.length} subcategories)`);
}

seed()
  .catch(err => { console.error('Seed failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
