const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// GET /api/inventory — all products with current stock
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true, name: true, brand: true, price: true, stock: true, isActive: true,
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
    res.json(products.map(p => ({ ...p, _id: p.id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjust — add or subtract stock
// Body: { productId, type: "IN"|"OUT", quantity, note }
router.post('/adjust', async (req, res) => {
  try {
    const { productId, type, quantity, note } = req.body;
    if (!productId || !type || !quantity)
      return res.status(400).json({ error: 'productId, type and quantity are required' });

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0)
      return res.status(400).json({ error: 'quantity must be a positive integer' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (type === 'OUT' && product.stock < qty)
      return res.status(400).json({ error: `Not enough stock. Current stock: ${product.stock}` });

    const newStock = type === 'IN' ? product.stock + qty : product.stock - qty;

    const [updated] = await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
      prisma.inventoryLog.create({ data: { productId, type, quantity: qty, note: note || '' } }),
    ]);

    res.json({ success: true, stock: newStock, product: { ...updated, _id: updated.id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/log — recent 200 transactions across all products
router.get('/log', async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: { select: { id: true, name: true, brand: true } } },
    });
    res.json(logs.map(l => ({ ...l, _id: l.id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/log/:productId — log for one product
router.get('/log/:productId', async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs.map(l => ({ ...l, _id: l.id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
