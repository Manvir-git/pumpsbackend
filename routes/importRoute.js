/**
 * importRoute.js
 * AI-powered bill reading — upload a supplier invoice (image or PDF)
 * and automatically extract products + update inventory.
 */

const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const prisma   = require('../lib/prisma');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function makeSlug(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Groq AI extraction (free tier — 1500 req/day) ─────────────────────────
async function extractFromBill(fileBuffer, mimeType) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set in .env — get a free key at console.groq.com');

  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey });

  const CATEGORY_LIST = `
7.5-hp, 10-hp, 12-hp, 15-hp, 20-hp  (agricultural submersible pumps — use HP to pick)
1-hp, 1.5-hp, 2-hp, 3-hp             (domestic/household submersible pumps)
upvc-pipes, cpvc-pipes, gi-pipes, column-pipes
valves, taps-faucets, gi-fittings, pvc-fittings, water-tanks
pump-wire, starters-panels`.trim();

  const promptText = `You are analyzing a supplier's purchase invoice for a pump and plumbing hardware store in Punjab, India.
Extract ALL product line items. Return ONLY a valid JSON array, no markdown, no explanation.

Each item: {"name":"full product name with size/HP","brand":"brand or empty string","quantity":number,"unitPrice":number,"hsnCode":"HSN or empty","categorySlug":"best match from list below"}

Category slugs: ${CATEGORY_LIST}

Rules: one entry per size/variant, include HP/diameter/size in name, return [] if nothing found.
Example: [{"name":"BS 7.5 HP Submersible Pump 9 Stage","brand":"BS Pumps","quantity":3,"unitPrice":21500,"hsnCode":"8413","categorySlug":"7.5-hp"}]`;

  let responseText;

  if (mimeType === 'application/pdf') {
    // PDFs: extract text first, then use text model
    const pdfParse = require('pdf-parse');
    const pdfData  = await pdfParse(fileBuffer);
    const billText = pdfData.text.slice(0, 8000); // stay within token limit

    const completion = await groq.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: `${promptText}\n\nBill text:\n${billText}` }],
    });
    responseText = completion.choices[0].message.content;
  } else {
    // Images: use vision model
    const base64  = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;

    const completion = await groq.chat.completions.create({
      model:      'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 2048,
      messages:   [{
        role:    'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text',      text: promptText },
        ],
      }],
    });
    responseText = completion.choices[0].message.content;
  }

  const cleaned = responseText.trim()
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(cleaned);
}

// ── POST /api/import/bill ───────────────────────────────────────────────────
// Step 1: upload bill → AI extracts items → return preview for admin to review
router.post('/bill', upload.single('bill'), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY)
      return res.status(400).json({ error: 'GROQ_API_KEY not configured in .env — get a free key at console.groq.com' });

    if (!req.file)
      return res.status(400).json({ error: 'No file uploaded. Send a bill image (JPG/PNG) or PDF.' });

    const extracted = await extractFromBill(req.file.buffer, req.file.mimetype);
    if (!Array.isArray(extracted) || extracted.length === 0)
      return res.json({ items: [], message: 'No products could be read from this bill.' });

    // For each item, check if it already exists in DB
    const allCats = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
    const catMap  = {};
    allCats.forEach(c => { catMap[c.slug] = c; });

    const items = await Promise.all(extracted.map(async item => {
      const cat    = catMap[item.categorySlug];
      const exists = cat ? await prisma.product.findFirst({
        where: { name: { contains: item.name.slice(0, 20), mode: 'insensitive' }, categoryId: cat.id },
        select: { id: true, name: true },
      }) : null;
      return {
        ...item,
        categoryName: cat?.name || item.categorySlug,
        existingId:   exists?.id  || null,
        existingName: exists?.name || null,
        selected:     true, // default: import this item
      };
    }));

    res.json({ items });
  } catch (err) {
    console.error('Import error:', err.message);
    if (err.message.includes('GROQ_API_KEY'))
      return res.status(400).json({ error: err.message });
    if (err.message.includes('401') || err.message.includes('invalid_api_key'))
      return res.status(400).json({ error: 'Groq API key is invalid. Check GROQ_API_KEY in .env' });
    if (err.message.includes('rate_limit') || err.message.includes('429'))
      return res.status(429).json({ error: 'Groq rate limit reached. Free tier allows 1500 requests/day. Try again later.' });
    res.status(500).json({ error: 'AI extraction failed: ' + err.message });
  }
});

// ── POST /api/import/confirm ────────────────────────────────────────────────
// Step 2: admin reviews items, clicks confirm
// Body: { items: [{...item, selected, categorySlug}], mode: 'products'|'inventory'|'both' }
router.post('/confirm', async (req, res) => {
  const { items, mode = 'both' } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items provided' });

  const allCats = await prisma.category.findMany();
  const catMap  = {};
  allCats.forEach(c => { catMap[c.slug] = c; });

  // Fallback: first leaf category (non-root)
  const fallbackCat = allCats.find(c => c.parentId) || allCats[0];

  let addedProducts = 0, updatedInventory = 0, skipped = 0;
  const errors = [];

  for (const item of items) {
    if (!item.selected) { skipped++; continue; }

    try {
      const cat   = catMap[item.categorySlug] || fallbackCat;
      const qty   = Math.max(1, parseInt(item.quantity) || 1);
      const price = parseFloat(item.unitPrice) || 0;

      // Find or create the product
      let product = await prisma.product.findFirst({
        where: { name: { contains: item.name.slice(0, 20), mode: 'insensitive' }, categoryId: cat.id },
      });

      if (!product && (mode === 'products' || mode === 'both')) {
        product = await prisma.product.create({
          data: {
            name:        item.name,
            brand:       item.brand || '',
            brandSlug:   makeSlug(item.brand || ''),
            categoryId:  cat.id,
            price:       price > 0 ? String(price) : '',
            specs:       item.hsnCode ? { hsnCode: item.hsnCode } : {},
            features:    [],
            variants:    [],
            description: '',
            isActive:    true,
            sortOrder:   0,
          },
        });
        addedProducts++;
      }

      if (product && (mode === 'inventory' || mode === 'both')) {
        await prisma.$transaction([
          prisma.product.update({ where: { id: product.id }, data: { stock: { increment: qty } } }),
          prisma.inventoryLog.create({
            data: { productId: product.id, type: 'IN', quantity: qty, note: 'Auto-imported from bill scan' },
          }),
        ]);
        updatedInventory++;
      }
    } catch (e) {
      errors.push(`${item.name}: ${e.message}`);
    }
  }

  res.json({ success: true, addedProducts, updatedInventory, skipped, errors });
});

module.exports = router;
