const express = require('express');
const { z } = require('zod');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { logAction } = require('../db/audit');

const router = express.Router();
router.use(requireAuth);

// GET /dashboard/transactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, o.name as org_name
      FROM transactions t
      JOIN organizations o ON t.organization_id = o.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /dashboard/transactions/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    // 1. Mark transaction as approved
    const txResult = await pool.query(
      `UPDATE transactions SET status = 'approved' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    // 2. Based on type, activate something
    if (tx.type === 'setup') {
      // Activate the organization
      await pool.query(
        `UPDATE organizations SET status = 'active' WHERE id = $1`,
        [tx.organization_id]
      );
      await logAction(req.admin.email, 'organization.activate', tx.organization_id);
    } else if (tx.type === 'module') {
      // Grant license to module
      await pool.query(
        `INSERT INTO licenses (organization_id, module_id, plan, status)
         VALUES ($1, $2, 'standard', 'active')
         ON CONFLICT (organization_id, module_id)
         DO UPDATE SET status = 'active'`,
        [tx.organization_id, tx.target_id]
      );
      await logAction(req.admin.email, 'license.grant', `${tx.organization_id}/${tx.target_id}`);
    }

    await logAction(req.admin.email, 'transaction.approve', tx.id);
    res.json({ status: 'ok', transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve transaction' });
  }
});

// POST /dashboard/transactions/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const txResult = await pool.query(
      `UPDATE transactions SET status = 'rejected' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await logAction(req.admin.email, 'transaction.reject', req.params.id);
    res.json({ status: 'ok', transaction: txResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject transaction' });
  }
});

module.exports = router;
