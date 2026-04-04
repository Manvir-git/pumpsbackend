require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const jwt     = require('jsonwebtoken');
const prisma  = require('./lib/prisma');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Auth helpers ───────────────────────────────────────────────────────────────
const SECRET_KEY = process.env.SECRET_KEY || 'fallback_secret_change_me';

const verifyToken = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const INACTIVITY = parseInt(process.env.INACTIVITY_TIMEOUT_MS) || 3600_000;
    if (Date.now() - decoded.lastActivity > INACTIVITY)
      return res.status(401).json({ message: 'Session expired', reason: 'inactivity' });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token', reason: 'token_expired' });
  }
};

// ── Keep-alive ping (hit every 5 min by uptime monitor) ───────────────────────
app.get('/ping', (_req, res) => {
  console.log('working');
  res.json({ status: 'working' });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/categories', require('./routes/categoryRoute'));
app.use('/api/products',   require('./routes/productRoute'));
app.use('/api/enqueries',  require('./routes/Enqueries'));
app.use('/api/inventory',  require('./routes/inventoryRoute'));
app.use('/api/bills',      require('./routes/billRoute'));
app.use('/api/import',     require('./routes/importRoute'));
app.use('/api/stats',      require('./routes/statsRoute'));
app.use('/api/search',     require('./routes/searchRoute'));
app.use('/api/customers',  require('./routes/customersRoute'));

// ── Seed categories endpoint (called from Admin panel) ─────────────────────────
app.post('/api/seed-categories', async (req, res) => {
  try {
    // Delete products first (FK), then categories
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    const roots = [
      { name: 'Agricultural Pumps',   slug: 'agricultural', icon: '🌾', sortOrder: 1 },
      { name: 'Domestic / Household', slug: 'domestic',     icon: '🏠', sortOrder: 2 },
      { name: 'Pipes & Fittings',     slug: 'pipes',        icon: '🔧', sortOrder: 3 },
      { name: 'Sanitary',             slug: 'sanitary',     icon: '🚿', sortOrder: 4 },
      { name: 'Accessories',          slug: 'accessories',  icon: '⚡', sortOrder: 5 },
    ];

    const saved = await Promise.all(roots.map(r => prisma.category.create({ data: r })));
    const bySlug = {};
    saved.forEach(c => { bySlug[c.slug] = c.id; });

    const children = [
      { name: '7.5 HP',  slug: '7.5-hp',  parentId: bySlug.agricultural, icon: '🌾', sortOrder: 1 },
      { name: '10 HP',   slug: '10-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 2 },
      { name: '12 HP',   slug: '12-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 3 },
      { name: '15 HP',   slug: '15-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 4 },
      { name: '20 HP',   slug: '20-hp',   parentId: bySlug.agricultural, icon: '🌾', sortOrder: 5 },
      { name: '1 HP',    slug: '1-hp',    parentId: bySlug.domestic,     icon: '🏠', sortOrder: 1 },
      { name: '1.5 HP',  slug: '1.5-hp',  parentId: bySlug.domestic,     icon: '🏠', sortOrder: 2 },
      { name: '2 HP',    slug: '2-hp',    parentId: bySlug.domestic,     icon: '🏠', sortOrder: 3 },
      { name: '3 HP',    slug: '3-hp',    parentId: bySlug.domestic,     icon: '🏠', sortOrder: 4 },
      // Pipes & Fittings
      { name: 'UPVC Pipes',          slug: 'upvc-pipes',       parentId: bySlug.pipes,       icon: '',  sortOrder: 1 },
      { name: 'CPVC Pipes',          slug: 'cpvc-pipes',       parentId: bySlug.pipes,       icon: '',  sortOrder: 2 },
      { name: 'PVC Pipes',           slug: 'pvc-pipes',        parentId: bySlug.pipes,       icon: '',  sortOrder: 3 },
      { name: 'HDPE Pipes',          slug: 'hdpe-pipes',       parentId: bySlug.pipes,       icon: '',  sortOrder: 4 },
      { name: 'GI Pipes',            slug: 'gi-pipes',         parentId: bySlug.pipes,       icon: '',  sortOrder: 5 },
      { name: 'Column Pipes',        slug: 'column-pipes',     parentId: bySlug.pipes,       icon: '',  sortOrder: 6 },
      { name: 'Casing Pipes',        slug: 'casing-pipes',     parentId: bySlug.pipes,       icon: '',  sortOrder: 7 },
      { name: 'Elbows & Bends',      slug: 'elbows-bends',     parentId: bySlug.pipes,       icon: '',  sortOrder: 8 },
      { name: 'Tees & Reducers',     slug: 'tees-reducers',    parentId: bySlug.pipes,       icon: '',  sortOrder: 9 },
      { name: 'Couplings & Unions',  slug: 'couplings-unions', parentId: bySlug.pipes,       icon: '',  sortOrder: 10 },
      { name: 'End Caps & Plugs',    slug: 'end-caps-plugs',   parentId: bySlug.pipes,       icon: '',  sortOrder: 11 },
      // Sanitary
      { name: 'Pillar Taps',            slug: 'pillar-taps',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 1 },
      { name: 'Bib Cocks',              slug: 'bib-cocks',         parentId: bySlug.sanitary,    icon: '',  sortOrder: 2 },
      { name: 'Wall Mixers',            slug: 'wall-mixers',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 3 },
      { name: 'Shower Sets & Heads',    slug: 'shower-sets',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 4 },
      { name: 'Ball Valves',            slug: 'ball-valves',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 5 },
      { name: 'Gate Valves',            slug: 'gate-valves',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 6 },
      { name: 'Foot Valves',            slug: 'foot-valves',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 7 },
      { name: 'Non-Return Valves',      slug: 'non-return-valves', parentId: bySlug.sanitary,    icon: '',  sortOrder: 8 },
      { name: 'CP Fittings',            slug: 'cp-fittings',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 9 },
      { name: 'PVC Fittings',           slug: 'pvc-fittings',      parentId: bySlug.sanitary,    icon: '',  sortOrder: 10 },
      { name: 'Flush Tanks & Cisterns', slug: 'flush-tanks',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 11 },
      { name: 'Toilet Seats & Covers',  slug: 'toilet-seats',      parentId: bySlug.sanitary,    icon: '',  sortOrder: 12 },
      { name: 'Wash Basins',            slug: 'wash-basins',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 13 },
      { name: 'Water Tanks',            slug: 'water-tanks',       parentId: bySlug.sanitary,    icon: '',  sortOrder: 14 },
      // Accessories
      { name: 'Pump Wire',         slug: 'pump-wire',       parentId: bySlug.accessories, icon: '',  sortOrder: 1 },
      { name: 'Starters & Panels', slug: 'starters-panels', parentId: bySlug.accessories, icon: '',  sortOrder: 2 },
    ];

    await prisma.category.createMany({ data: children });
    const total = await prisma.category.count();
    res.json({ success: true, message: `Seeded ${total} categories (${roots.length} roots + ${children.length} subcategories)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin login ────────────────────────────────────────────────────────────────
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'harry5510@gmail.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminharry';

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role: 'admin', lastActivity: Date.now() }, SECRET_KEY, { expiresIn: '7d' });
    return res.json({ token, message: 'Login successful', user: { email } });
  }

  await new Promise(r => setTimeout(r, 500)); // timing-safe delay
  return res.status(401).json({ message: 'Invalid credentials' });
});

// ── Admin token verify ─────────────────────────────────────────────────────────
app.get('/admin/verify', verifyToken, (req, res) => {
  res.json({ message: 'Token is valid', user: req.user });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGTERM', () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

module.exports = app;
