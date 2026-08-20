const express = require('express');
const db = require('../db/pool');
const jwt = require('jsonwebtoken');
const router = express.Router();

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /dashboard/analytics
router.get('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Analytics overview stats
    const totalOrgs = await db('organizations').count('* as count').first();
    const totalModules = await db('modules').count('* as count').first();
    
    // Org breakdown by plan
    const orgPlans = await db('organizations')
      .select('plan')
      .count('* as value')
      .groupBy('plan');

    // Recent transactions (last 7 days grouped by date)
    // Since this is MySQL, we use DATE(created_at)
    const txByDate = await db('transactions')
      .select(db.raw('DATE(created_at) as date'))
      .sum('amount_usd as revenue')
      .whereRaw('created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    res.json({
      stats: {
        organizations: totalOrgs.count,
        modules: totalModules.count,
      },
      charts: {
        orgPlans,
        txByDate
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
