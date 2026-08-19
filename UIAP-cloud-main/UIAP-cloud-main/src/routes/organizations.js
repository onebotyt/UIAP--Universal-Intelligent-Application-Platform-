const express = require('express');
const { z } = require('zod');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { logAction } = require('../db/audit');

const router = express.Router();
router.use(requireAuth);

// POST /dashboard/organizations
router.post('/', async (req, res) => {
  const schema = z.object({ 
    name: z.string().min(1),
    plan: z.enum(['local', 'cloud', 'hybrid']).default('local')
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const result = await pool.query(
    'INSERT INTO organizations (name, plan) VALUES ($1, $2) RETURNING *',
    [parsed.data.name, parsed.data.plan]
  );
  
  const org = result.rows[0];

  // If the plan requires cloud hosting, trigger provisioning webhook
  if (org.plan === 'cloud' || org.plan === 'hybrid') {
    try {
      const response = await fetch(`http://localhost:5000/hosting/orgs/${org.id}/provision`, {
        method: 'POST',
      });
      if (!response.ok) {
        console.warn(`[UIAP Cloud] Failed to provision hosting for org ${org.id}:`, await response.text());
      } else {
        console.log(`[UIAP Cloud] Provisioned hosting for org ${org.id}`);
      }
    } catch (e) {
      console.warn(`[UIAP Cloud] Could not reach uiap-hosting to provision org ${org.id}`, e);
    }
  }

  await logAction(req.admin.email, 'organization.create', parsed.data.name);
  res.status(201).json(org);
});

// GET /dashboard/organizations
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM organizations ORDER BY created_at DESC');
  res.json(result.rows);
});

// GET /dashboard/organizations/:id
router.get('/:id', async (req, res) => {
  const org = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
  if (org.rows.length === 0) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const licenses = await pool.query(
    `SELECT l.*, m.slug AS module_slug, m.display_name AS module_name
     FROM licenses l JOIN modules m ON m.id = l.module_id
     WHERE l.organization_id = $1`,
    [req.params.id]
  );

  const installations = await pool.query(
    'SELECT id, name, core_version, last_seen_at, created_at FROM installations WHERE organization_id = $1',
    [req.params.id]
  );

  res.json({ ...org.rows[0], licenses: licenses.rows, installations: installations.rows });
});

// POST /dashboard/organizations/:id/licenses
// Grants (or re-activates) a license for a module.
const licenseSchema = z.object({
  module_id: z.string().uuid(),
  plan: z.string().default('standard'),
  expires_at: z.string().datetime().optional(),
});

router.post('/:id/licenses', async (req, res) => {
  const parsed = licenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const { module_id, plan, expires_at } = parsed.data;
  const organizationId = req.params.id;

  const result = await pool.query(
    `INSERT INTO licenses (organization_id, module_id, plan, status, expires_at)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (organization_id, module_id)
     DO UPDATE SET status = 'active', plan = EXCLUDED.plan, expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [organizationId, module_id, plan, expires_at || null]
  );

  await logAction(req.admin.email, 'license.grant', `${organizationId}/${module_id}`);
  res.status(201).json(result.rows[0]);
});

// POST /dashboard/organizations/:id/licenses/:licenseId/revoke
// This is the "flip the switch" endpoint worth demoing: after this call,
// the org's Edge install will no longer be entitled to pull new versions
// of that module (enforced by the /edge/v1/entitlements endpoint in phase 2).
router.post('/:id/licenses/:licenseId/revoke', async (req, res) => {
  const result = await pool.query(
    `UPDATE licenses SET status = 'revoked'
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [req.params.licenseId, req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'License not found for this organization' });
  }

  await logAction(req.admin.email, 'license.revoke', req.params.licenseId);
  res.json(result.rows[0]);
});

// POST /dashboard/organizations/:id/beta
router.post('/:id/beta', async (req, res) => {
  const schema = z.object({ module_id: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const result = await pool.query(
    `INSERT INTO beta_access (organization_id, module_id)
     VALUES ($1, $2)
     ON CONFLICT (organization_id, module_id) DO NOTHING
     RETURNING *`,
    [req.params.id, parsed.data.module_id]
  );

  await logAction(req.admin.email, 'beta.grant', `${req.params.id}/${parsed.data.module_id}`);
  res.status(201).json(result.rows[0] || { message: 'Beta access already granted' });
});

module.exports = router;
