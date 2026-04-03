const express = require('express');
const multer = require('multer');
const Pipe = require('../models/Pipe');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ─── GET all pipes (with optional filters) ────────────────────────────────────
// Query: ?brand=finolex&type=upvc&diameter_mm=25
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.brand)       filter.brand       = req.query.brand.toLowerCase();
    if (req.query.type)        filter.type        = req.query.type.toLowerCase();
    if (req.query.diameter_mm) filter.diameter_mm = Number(req.query.diameter_mm);

    const pipes = await Pipe.find(filter).sort({ brand: 1, type: 1, diameter_mm: 1 });
    res.json(pipes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipes' });
  }
});

// ─── GET filter options (dynamic) ─────────────────────────────────────────────
router.get('/filters', async (req, res) => {
  try {
    const brands    = await Pipe.distinct('brand');
    const types     = await Pipe.distinct('type');
    const diameters = await Pipe.distinct('diameter_mm', { diameter_mm: { $ne: null } });
    res.json({
      brands,
      types,
      diameters: diameters.sort((a, b) => a - b),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// ─── GET single pipe by id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = decodeURIComponent(req.params.id).trim();
  try {
    const pipe = await Pipe.findOne({ id });
    if (!pipe) return res.status(404).json({ message: 'Pipe not found' });
    res.json(pipe);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pipe', error: err.message });
  }
});

// ─── POST create pipe ─────────────────────────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      id, name, brand, type, diameter_mm, length_m,
      color, standard, application, description, variants,
    } = req.body;

    if (!id || !name || !brand || !type) {
      return res.status(400).json({ success: false, message: 'id, name, brand and type are required' });
    }

    const image = req.file ? req.file.filename : '';

    let parsedVariants = [];
    try { parsedVariants = variants ? JSON.parse(variants) : []; } catch (_) {}

    const newPipe = new Pipe({
      id, name,
      brand:       brand.toLowerCase(),
      type:        type.toLowerCase(),
      diameter_mm: diameter_mm ? Number(diameter_mm) : null,
      length_m:    length_m    ? Number(length_m)    : 3,
      color:       color       || '',
      standard:    standard    || '',
      application: application || '',
      description: description || '',
      image,
      variants:    parsedVariants,
    });

    const saved = await newPipe.save();
    res.status(201).json({ success: true, pipe: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT edit pipe ─────────────────────────────────────────────────────────────
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const lookupId = decodeURIComponent(req.params.id).trim();
    const {
      name, brand, type, diameter_mm, length_m,
      color, standard, application, description, variants,
    } = req.body;

    const update = {};
    if (name        !== undefined) update.name        = name;
    if (brand       !== undefined) update.brand       = brand.toLowerCase();
    if (type        !== undefined) update.type        = type.toLowerCase();
    if (diameter_mm !== undefined) update.diameter_mm = diameter_mm ? Number(diameter_mm) : null;
    if (length_m    !== undefined) update.length_m    = Number(length_m);
    if (color       !== undefined) update.color       = color;
    if (standard    !== undefined) update.standard    = standard;
    if (application !== undefined) update.application = application;
    if (description !== undefined) update.description = description;
    if (req.file)                  update.image       = req.file.filename;

    let parsedVariants;
    try { parsedVariants = variants ? JSON.parse(variants) : undefined; } catch (_) {}
    if (parsedVariants !== undefined) update.variants = parsedVariants;

    const pipe = await Pipe.findOneAndUpdate(
      { id: lookupId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!pipe) return res.status(404).json({ success: false, message: 'Pipe not found' });
    res.json({ success: true, pipe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE pipe ───────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const pipe = await Pipe.findOneAndDelete({ id: req.params.id });
    if (!pipe) return res.status(404).json({ success: false, message: 'Pipe not found' });
    res.json({ success: true, message: 'Pipe deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete pipe' });
  }
});

module.exports = router;
