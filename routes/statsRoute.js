const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// GET /api/stats
// Returns dashboard stats for admin panel
router.get('/', async (req, res) => {
  try {
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalBills,
      revenueAgg,
      billsThisMonthAgg,
      uniquePhones,
      recentBills,
      lowStockItems,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { stock: { gt: 0, lt: 5 } } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.bill.count(),
      prisma.bill.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.bill.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.bill.groupBy({ by: ['customerPhone'] }),
      prisma.bill.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { billNumber: true, customerName: true, total: true, createdAt: true },
      }),
      prisma.product.findMany({
        where: { stock: { lt: 5 } },
        orderBy: { stock: 'asc' },
        take: 8,
        select: { id: true, name: true, brand: true, stock: true },
      }),
    ]);

    res.json({
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalBills,
      revenueThisMonth: revenueAgg._sum.total || 0,
      billsThisMonth:   billsThisMonthAgg,
      totalCustomers:   uniquePhones.length,
      recentBills,
      lowStockItems,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
