/**
 * seeds/importProducts.js
 * Run from ltc-backend directory:  node seeds/importProducts.js
 *
 * Reads seeds/products.json and bulk-inserts products.
 * Categories must be seeded first: node seeds/seedCategories.js
 *
 * Existing products with the same name+categorySlug are SKIPPED (no duplicates).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path   = require('path');
const fs     = require('fs');
const prisma = require('../lib/prisma');

function makeSlug(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function run() {
  const jsonPath = path.join(__dirname, 'products.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌  products.json not found in seeds/ folder');
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Found ${items.length} products in products.json`);

  // Build slug → id map for all categories
  const allCats = await prisma.category.findMany();
  const catMap  = {};
  allCats.forEach(c => { catMap[c.slug] = c.id; });

  let added = 0, skipped = 0, errors = 0;

  for (const item of items) {
    try {
      const catId = catMap[item.categorySlug];
      if (!catId) {
        console.warn(`  ⚠️  Unknown categorySlug "${item.categorySlug}" — skipping "${item.name}"`);
        errors++;
        continue;
      }

      // Skip if already exists
      const exists = await prisma.product.findFirst({ where: { name: item.name, categoryId: catId } });
      if (exists) {
        console.log(`  ↷  Skipped (already exists): ${item.name}`);
        skipped++;
        continue;
      }

      await prisma.product.create({
        data: {
          name:        item.name,
          brand:       item.brand       || '',
          brandSlug:   makeSlug(item.brand || ''),
          categoryId:  catId,
          specs:       item.specs       || {},
          features:    item.features    || [],
          price:       item.price       || '',
          variants:    item.variants    || [],
          description: item.description || '',
          isActive:    true,
          sortOrder:   item.sortOrder   || 0,
        },
      });

      console.log(`  ✅  Added: ${item.name}`);
      added++;
    } catch (err) {
      console.error(`  ❌  Error on "${item.name}": ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone — Added: ${added}  Skipped: ${skipped}  Errors: ${errors}`);
}

run()
  .catch(err => { console.error(err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
