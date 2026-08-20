const express = require('express');
const { z } = require('zod');
const { randomUUID } = require('crypto');
const db = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { logAction } = require('../db/audit');

const router = express.Router();
router.use(requireAuth);

// GET /dashboard/transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await db('transactions as t')
      .join('organizations as o', 't.organization_id', 'o.id')
      .select('t.*', 'o.name as org_name')
      .orderBy('t.created_at', 'desc');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /dashboard/transactions/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    // 1. Mark transaction as approved
    const updatedRows = await db('transactions')
      .update({ status: 'approved' })
      .where({ id: req.params.id });

    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = await db('transactions').where('id', req.params.id).first();

    // 2. Based on type, activate something
    if (tx.type === 'setup') {
      // Activate the organization
      await db('organizations')
        .update({ status: 'active' })
        .where('id', tx.organization_id);
      await logAction(req.admin.email, 'organization.activate', tx.organization_id);
    } else if (tx.type === 'module') {
      // Grant license to module
      await db('licenses')
        .insert({
          id: randomUUID(),
          organization_id: tx.organization_id,
          module_id: tx.target_id,
          plan: 'standard',
          status: 'active'
        })
        .onConflict(['organization_id', 'module_id'])
        .merge({ status: 'active' });
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
    const updatedRows = await db('transactions')
      .update({ status: 'rejected' })
      .where({ id: req.params.id });

    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = await db('transactions').where('id', req.params.id).first();

    await logAction(req.admin.email, 'transaction.reject', req.params.id);
    res.json({ status: 'ok', transaction: tx });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject transaction' });
  }
});

module.exports = router;
