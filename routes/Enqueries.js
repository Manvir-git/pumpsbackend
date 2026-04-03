const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// POST /api/enqueries
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, product, message } = req.body;
    const enq = await prisma.enquiry.create({
      data: {
        name:    name    || '',
        phone:   phone   || '',
        email:   email   || '',
        product: product || '',
        message: message || '',
      },
    });
    res.status(201).json({ success: true, ...enq, _id: enq.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/enqueries
router.get('/', async (req, res) => {
  try {
    const enqs = await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(enqs.map(e => ({ ...e, _id: e.id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/enqueries/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.enquiry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
