const express = require('express');
const multer = require('multer');
const AgPump = require('../models/agpumps');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ─── GET all agpumps (with optional filters) ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.hp)       filter.hp       = Number(req.query.hp);
    if (req.query.stages)   filter.stages   = Number(req.query.stages);
    if (req.query.brand)    filter.brand    = req.query.brand;
    if (req.query.category) filter.category = req.query.category;

    const pumps = await AgPump.find(filter).sort({ hp: 1, stages: 1 });
    res.json(pumps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agricultural pumps' });
  }
});

// ─── GET filter options ───────────────────────────────────────────────────────
router.get('/filters', async (req, res) => {
  try {
    const hpValues   = await AgPump.distinct('hp',       { hp:     { $ne: null } });
    const brands     = await AgPump.distinct('brand',    { brand:  { $ne: null } });
    const stages     = await AgPump.distinct('stages',   { stages: { $ne: null } });
    const categories = await AgPump.distinct('category', { category: { $ne: null } });
    res.json({
      hpValues:   hpValues.sort((a, b) => a - b),
      brands,
      stages:     stages.sort((a, b) => a - b),
      categories,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// ─── GET single agpump by id ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = decodeURIComponent(req.params.id).trim();
  try {
    const pump = await AgPump.findOne({ id });
    if (!pump) return res.status(404).json({ message: 'Agricultural pump not found' });
    res.json(pump);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching agricultural pump', error: err.message });
  }
});

// ─── POST create agpump ───────────────────────────────────────────────────────
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const { id, name, price, features, description, brand, category, hp, stages, depth_ft, discharge_lph, head_m } = req.body;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'id and name are required' });
    }

    const image      = req.files?.['image']      ? req.files['image'][0].filename      : null;
    const rightImage = req.files?.['rightImage'] ? req.files['rightImage'][0].filename : null;

    let parsedFeatures = [];
    try { parsedFeatures = features ? JSON.parse(features) : []; } catch (_) {}

    const newPump = new AgPump({
      id, name,
      price:         price || '',
      features:      parsedFeatures,
      image:         image || '',
      rightImage:    rightImage || '',
      description:   description || '',
      brand:         brand || 'bs',
      category:      category || 'borewell',
      hp:            hp          ? Number(hp)           : null,
      stages:        stages      ? Number(stages)        : null,
      depth_ft:      depth_ft    ? Number(depth_ft)     : null,
      discharge_lph: discharge_lph ? Number(discharge_lph) : null,
      head_m:        head_m      ? Number(head_m)        : null,
    });

    const saved = await newPump.save();
    res.status(201).json({ success: true, pump: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT edit agpump ──────────────────────────────────────────────────────────
router.put('/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const lookupId = decodeURIComponent(req.params.id).trim();
    const { name, price, features, description, brand, category, hp, stages, depth_ft, discharge_lph, head_m } = req.body;

    let parsedFeatures;
    try { parsedFeatures = features ? JSON.parse(features) : undefined; } catch (_) {}

    const update = {};
    if (name          !== undefined) update.name          = name;
    if (price         !== undefined) update.price         = price;
    if (description   !== undefined) update.description   = description;
    if (brand         !== undefined) update.brand         = brand;
    if (category      !== undefined) update.category      = category;
    if (hp            !== undefined) update.hp            = hp ? Number(hp) : null;
    if (stages        !== undefined) update.stages        = stages ? Number(stages) : null;
    if (depth_ft      !== undefined) update.depth_ft      = depth_ft ? Number(depth_ft) : null;
    if (discharge_lph !== undefined) update.discharge_lph = discharge_lph ? Number(discharge_lph) : null;
    if (head_m        !== undefined) update.head_m        = head_m ? Number(head_m) : null;
    if (parsedFeatures !== undefined) update.features     = parsedFeatures;

    if (req.files?.['image'])      update.image      = req.files['image'][0].filename;
    if (req.files?.['rightImage']) update.rightImage = req.files['rightImage'][0].filename;

    const pump = await AgPump.findOneAndUpdate(
      { id: lookupId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!pump) return res.status(404).json({ success: false, message: 'Agricultural pump not found' });
    res.json({ success: true, pump });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE agpump ────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const pump = await AgPump.findOneAndDelete({ id: req.params.id });
    if (!pump) return res.status(404).json({ success: false, message: 'Agricultural pump not found' });
    res.status(200).json({ success: true, message: 'Agricultural pump deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
});

module.exports = router;
