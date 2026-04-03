const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// GET /api/search?q=QUERY&limit=20
// Full-text product search across name, brand, description, specs, category
router.get('/', async (req, res) => {
  try {
    const q     = (req.query.q || '').toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (!q || q.length < 2) {
      return res.json({ results: [], query: q, count: 0 });
    }

    const results = await prisma.$queryRaw`
      SELECT p.id, p.name, p.brand, p.price, p.images, p.stock, p."isActive",
             p.specs, p.variants, p."categoryId",
             c.name as "categoryName", c.slug as "categorySlug",
             cp.slug as "parentSlug"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "Category" cp ON c."parentId" = cp.id
      WHERE p."isActive" = true
        AND (
          LOWER(p.name) LIKE ${`%${q}%`}
          OR LOWER(p.brand) LIKE ${`%${q}%`}
          OR LOWER(p.description) LIKE ${`%${q}%`}
          OR LOWER(c.name) LIKE ${`%${q}%`}
          OR LOWER(p.specs::text) LIKE ${`%${q}%`}
        )
      ORDER BY
        CASE WHEN LOWER(p.name) LIKE ${`%${q}%`} THEN 0 ELSE 1 END,
        p.name
      LIMIT ${limit}
    `;

    const mapped = results.map(r => ({ ...r, _id: r.id }));

    res.json({ results: mapped, query: q, count: mapped.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
