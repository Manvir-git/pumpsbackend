const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// GET /api/customers
// Returns unique customers derived from bills, sorted by most recent bill
router.get('/', async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        customerName:    true,
        customerPhone:   true,
        customerAddress: true,
        total:           true,
        createdAt:       true,
        billNumber:      true,
      },
    });

    // Group by customerPhone; treat empty phone as its own entry per bill
    const map = new Map();

    for (const bill of bills) {
      // Use phone as key; if empty, use the billNumber to keep entries separate
      const key = bill.customerPhone ? bill.customerPhone : `__no_phone__${bill.billNumber}`;

      if (!map.has(key)) {
        map.set(key, {
          phone:        bill.customerPhone || '',
          name:         bill.customerName  || '',
          address:      bill.customerAddress || '',
          totalSpent:   0,
          billCount:    0,
          lastPurchase: bill.createdAt,
          bills:        [],
        });
      }

      const customer = map.get(key);
      customer.totalSpent   += parseFloat(bill.total) || 0;
      customer.billCount    += 1;
      customer.bills.push(bill.billNumber);

      // Bills are already ordered desc, so first seen = most recent
      if (new Date(bill.createdAt) > new Date(customer.lastPurchase)) {
        customer.lastPurchase = bill.createdAt;
      }
    }

    const customers = Array.from(map.values())
      .sort((a, b) => new Date(b.lastPurchase) - new Date(a.lastPurchase));

    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
