const express  = require('express');
const router   = express.Router();
const prisma   = require('../lib/prisma');

// Map Prisma id → _id for frontend compatibility
function fmt(c) {
  if (!c) return c;
  const { id, children, ...rest } = c;
  return {
    ...rest,
    _id: id,
    ...(children ? { children: children.map(fmt) } : {}),
  };
}

// GET /api/categories — nested tree
router.get('/', async (req, res) => {
  try {
    const roots = await prisma.category.findMany({
      where:   { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json(roots.map(fmt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/flat — all categories flat
router.get('/flat', async (req, res) => {
  try {
    const cats = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json(cats.map(fmt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { name, slug, parentId, icon, sortOrder } = req.body;
    const cat = await prisma.category.create({
      data: { name, slug, parentId: parentId || null, icon: icon || '', sortOrder: sortOrder || 0 },
    });
    res.status(201).json(fmt(cat));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, slug, parentId, icon, sortOrder, isActive } = req.body;
    const data = {};
    if (name      != null) data.name      = name;
    if (slug      != null) data.slug      = slug;
    if (icon      != null) data.icon      = icon;
    if (sortOrder != null) data.sortOrder = Number(sortOrder);
    if (isActive  != null) data.isActive  = isActive === 'true' || isActive === true;
    data.parentId = parentId || null;

    const cat = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(fmt(cat));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
