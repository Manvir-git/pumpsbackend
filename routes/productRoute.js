const express    = require('express');
const multer     = require('multer');
const router     = express.Router();
const prisma     = require('../lib/prisma');
const cloudinary = require('cloudinary').v2;
// cloudinary auto-reads CLOUDINARY_URL from env

const upload    = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const csvUpload = multer({ storage: multer.memoryStorage() });

async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'ltc-products', resource_type: 'image' },
      (err, result) => { if (err) reject(err); else resolve(result.secure_url); }
    ).end(buffer);
  });
}

function makeSlug(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function safeParse(val, fallback) {
  try { return val ? JSON.parse(val) : fallback; } catch (_) { return fallback; }
}

// Map Prisma product → frontend-compatible shape (_id, categoryId as object)
function fmt(p) {
  if (!p) return p;
  const { id, category, categoryId, ...rest } = p;
  return {
    ...rest,
    _id: id,
    categoryId: category
      ? { _id: category.id, name: category.name, slug: category.slug, parentId: category.parentId }
      : categoryId,
  };
}

// ── GET /api/products ──────────────────────────────────────────────────────────
// ?categorySlug=  ?categoryId=  ?brand=  ?search=  ?isActive=
router.get('/', async (req, res) => {
  try {
    const where = {};

    if (req.query.categorySlug) {
      const cat = await prisma.category.findUnique({ where: { slug: req.query.categorySlug } });
      if (!cat) return res.json([]);
      where.categoryId = cat.id;
    } else if (req.query.categoryId) {
      where.categoryId = req.query.categoryId;
    }

    if (req.query.brand)    where.brandSlug = makeSlug(req.query.brand);
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive !== 'false';
    if (req.query.search)   where.name = { contains: req.query.search, mode: 'insensitive' };

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true, slug: true, parentId: true } } },
    });

    res.json(products.map(fmt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/products/csv-template — MUST be before /:id ─────────────────────
router.get('/csv-template', (req, res) => {
  const headers = [
    'name', 'brand', 'categorySlug', 'price', 'description',
    'features',
    'variant1_label', 'variant1_price',
    'variant2_label', 'variant2_price',
    'variant3_label', 'variant3_price',
  ];
  const exampleRows = [
    ['BS 7.5 HP Submersible Pump','BS Pumps','7.5-hp','','High-efficiency borewell pump','ISI marked;Sand resistant;Thermal protection','7 Stage – 150 ft','18500','9 Stage – 200 ft','21500','11 Stage – 250 ft','24500'],
    ['Finolex UPVC Pipe 25mm','Finolex','upvc-pipes','','ISI marked UPVC pipe','ISI certified;UV stabilised;Lead-free','Class 2 (0.40 MPa)','52','Class 3 (0.60 MPa)','72','',''],
    ['Sintex Water Tank 1000L','Sintex','water-tanks','3800','Triple layer overhead tank','UV protection;10-year warranty','','','','','',''],
  ];
  const csvLines = [
    headers.join(','),
    ...exampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ltc_products_template.csv"');
  res.send(csvLines.join('\n'));
});

// ── GET /api/products/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const p = await prisma.product.findUnique({
      where:   { id: req.params.id },
      include: { category: { select: { id: true, name: true, slug: true, parentId: true } } },
    });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(fmt(p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/products ─────────────────────────────────────────────────────────
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { name, brand, categoryId, specs, price, variants, features, description, sortOrder } = req.body;

    if (!name || !brand || !categoryId)
      return res.status(400).json({ error: 'name, brand and categoryId are required' });

    const catExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!catExists) return res.status(400).json({ error: 'Invalid categoryId' });

    const parsedSpecs    = safeParse(specs,    {});
    const parsedVariants = safeParse(variants, []);
    const parsedFeatures = safeParse(features, []);
    const images = req.files && req.files.length > 0
      ? await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer)))
      : [];

    const product = await prisma.product.create({
      data: {
        name:        name.trim(),
        brand:       brand.trim(),
        brandSlug:   makeSlug(brand),
        categoryId,
        specs:       parsedSpecs,
        price:       price || '',
        variants:    parsedVariants,
        features:    parsedFeatures,
        images,
        description: description || '',
        sortOrder:   sortOrder != null ? Number(sortOrder) : 0,
      },
      include: { category: { select: { id: true, name: true, slug: true, parentId: true } } },
    });

    res.status(201).json(fmt(product));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/products/:id ──────────────────────────────────────────────────────
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { name, brand, categoryId, specs, price, variants, features, description, sortOrder, isActive, replaceImages } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const data = {};
    if (name        != null) { data.name = name.trim(); }
    if (brand       != null) { data.brand = brand.trim(); data.brandSlug = makeSlug(brand); }
    if (categoryId  != null) data.categoryId  = categoryId;
    if (price       != null) data.price       = price;
    if (description != null) data.description = description;
    if (sortOrder   != null) data.sortOrder   = Number(sortOrder);
    if (isActive    != null) data.isActive    = isActive === 'true' || isActive === true;

    if (specs    != null) data.specs    = safeParse(specs,    existing.specs);
    if (variants != null) data.variants = safeParse(variants, existing.variants);
    if (features != null) data.features = safeParse(features, existing.features);

    if (req.files && req.files.length > 0) {
      const newImages = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer)));
      data.images = replaceImages === 'true' ? newImages : [...(existing.images || []), ...newImages];
    }

    const product = await prisma.product.update({
      where:   { id: req.params.id },
      data,
      include: { category: { select: { id: true, name: true, slug: true, parentId: true } } },
    });

    res.json(fmt(product));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/products/:id/price ─────────────────────────────────────────────
// Body: { price } for top-level  OR  { variantId, price } for a variant
router.patch('/:id/price', async (req, res) => {
  try {
    const { price, variantId } = req.body;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    let data;
    if (variantId) {
      const variants = (existing.variants || []).map(v =>
        v.id === variantId || v._id === variantId ? { ...v, price } : v
      );
      data = { variants };
    } else {
      data = { price };
    }

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ success: true, price, product: fmt(product) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/products/:id/toggle ────────────────────────────────────────────
router.patch('/:id/toggle', async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data:  { isActive: !existing.isActive },
    });
    res.json({ success: true, isActive: product.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/products/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/products/bulk-import — import products from CSV upload ───────────
// Accepts multipart/form-data with field "file" (CSV)
router.post('/bulk-import', csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

    const text  = req.file.buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have at least a header row and one data row' });

    function parseCsvLine(line) {
      const result = [];
      let current  = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim()); current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    }

    // Build category slug → id map
    const allCats = await prisma.category.findMany();
    const catMap  = {};
    allCats.forEach(c => { catMap[c.slug] = c.id; });

    let added = 0, skipped = 0, errors = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 3) continue;

      const [name, brand, categorySlug, price, description, featuresRaw,
             v1label, v1price, v2label, v2price, v3label, v3price] = cols;

      if (!name || !brand || !categorySlug) {
        errors.push(`Row ${i + 1}: name, brand and categorySlug are required`);
        continue;
      }

      const catId = catMap[categorySlug.trim()];
      if (!catId) {
        errors.push(`Row ${i + 1}: unknown categorySlug "${categorySlug}"`);
        continue;
      }

      const exists = await prisma.product.findFirst({
        where: { name: name.trim(), categoryId: catId },
      });
      if (exists) { skipped++; continue; }

      const features = featuresRaw
        ? featuresRaw.split(';').map(f => f.trim()).filter(Boolean)
        : [];

      const variants = [];
      if (v1label) variants.push({ label: v1label, price: v1price || '', inStock: true });
      if (v2label) variants.push({ label: v2label, price: v2price || '', inStock: true });
      if (v3label) variants.push({ label: v3label, price: v3price || '', inStock: true });

      try {
        await prisma.product.create({
          data: {
            name:        name.trim(),
            brand:       brand.trim(),
            brandSlug:   makeSlug(brand),
            categoryId:  catId,
            price:       price || '',
            description: description || '',
            features,
            variants,
            specs:       {},
            isActive:    true,
            sortOrder:   0,
          },
        });
        added++;
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    res.json({ success: true, added, skipped, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
