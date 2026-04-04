const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// POST /api/analytics/visit — called by frontend on each page load
router.post('/visit', async (req, res) => {
  try {
    const path = (req.body.path || '/').slice(0, 200);
    const ip   = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 45);
    await prisma.pageView.create({ data: { path, ip } });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false }); // never fail the client for analytics
  }
});

// GET /api/analytics/stats — admin only (no auth needed, not sensitive)
router.get('/stats', async (req, res) => {
  try {
    const now          = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek  = new Date(startOfToday); startOfWeek.setDate(startOfToday.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, week, month, topPages, last7Raw] = await Promise.all([
      prisma.pageView.count(),
      prisma.pageView.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.pageView.count({ where: { createdAt: { gte: startOfWeek  } } }),
      prisma.pageView.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Top 5 pages this month
      prisma.$queryRaw`
        SELECT path, COUNT(*)::int AS views
        FROM "PageView"
        WHERE "createdAt" >= ${startOfMonth}
        GROUP BY path ORDER BY views DESC LIMIT 5
      `,
      // Views per day — last 7 days
      prisma.$queryRaw`
        SELECT DATE("createdAt") AS day, COUNT(*)::int AS views,
               COUNT(DISTINCT ip) FILTER (WHERE ip <> '') ::int AS unique_visitors
        FROM "PageView"
        WHERE "createdAt" >= ${startOfWeek}
        GROUP BY day ORDER BY day ASC
      `,
    ]);

    // Unique visitors (distinct IPs) for each period
    const [uvToday, uvWeek, uvMonth] = await Promise.all([
      prisma.pageView.groupBy({ by: ['ip'], where: { createdAt: { gte: startOfToday }, NOT: { ip: '' } } }).then(r => r.length),
      prisma.pageView.groupBy({ by: ['ip'], where: { createdAt: { gte: startOfWeek  }, NOT: { ip: '' } } }).then(r => r.length),
      prisma.pageView.groupBy({ by: ['ip'], where: { createdAt: { gte: startOfMonth }, NOT: { ip: '' } } }).then(r => r.length),
    ]);

    res.json({
      pageViews:  { total, today, week, month },
      uniqueVisitors: { today: uvToday, week: uvWeek, month: uvMonth },
      topPages:   topPages.map(p => ({ path: p.path, views: Number(p.views) })),
      last7Days:  last7Raw.map(r => ({ day: r.day, views: Number(r.views), unique: Number(r.unique_visitors) })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
