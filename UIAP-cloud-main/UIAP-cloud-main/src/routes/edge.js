const express = require('express');
const { z } = require('zod');
const pool = require('../db/pool');

const router = express.Router();

const registerSchema = z.object({
  install_key: z.string(),
  core_version: z.string(),
  org_id: z.string().uuid().optional(),
});

/**
 * POST /edge/v1/register
 * Edge installations call this on first boot to register themselves.
 */
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const { install_key, core_version, org_id } = parsed.data;

  // In a real system, install_key would be hashed and compared.
  // For the demo, we assume the install_key is valid.
  // We need an org_id to associate with. Let's just pick the first org if none is provided,
  // or use the provided one.
  
  let targetOrgId = org_id;
  if (!targetOrgId) {
    const orgs = await pool.query('SELECT id FROM organizations LIMIT 1');
    if (orgs.rows.length === 0) {
      return res.status(400).json({ error: 'No organizations found to register against' });
    }
    targetOrgId = orgs.rows[0].id;
  }

  try {
    const result = await pool.query(
      `INSERT INTO installations (organization_id, install_key_hash, core_version, last_seen_at)
       VALUES ($1, $2, $3, now())
       RETURNING id, organization_id`,
      [targetOrgId, install_key, core_version] // Storing raw key as hash just for demo simplicity
    );
    
    res.status(201).json({
      status: 'ok',
      installation_id: result.rows[0].id,
      organization_id: result.rows[0].organization_id
    });
  } catch (err) {
    console.error('[edge] register failed:', err);
    res.status(500).json({ error: 'Failed to register installation' });
  }
});

/**
 * Middleware to authenticate edge requests
 */
async function requireEdgeAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  
  const installKey = authHeader.split(' ')[1];
  
  // Find installation by key
  const result = await pool.query(
    'SELECT id, organization_id FROM installations WHERE install_key_hash = $1',
    [installKey]
  );
  
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid installation key' });
  }
  
  req.edge = result.rows[0];
  
  // Update last seen
  await pool.query('UPDATE installations SET last_seen_at = now() WHERE id = $1', [req.edge.id]);
  
  next();
}

/**
 * GET /edge/v1/entitlements
 * Returns the list of licensed modules for the installation's organization.
 */
router.get('/entitlements', requireEdgeAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT m.slug, m.display_name, l.status, l.expires_at, v.version
     FROM licenses l
     JOIN modules m ON l.module_id = m.id
     LEFT JOIN (
       SELECT module_id, MAX(version) as version
       FROM module_versions
       WHERE status = 'published'
       GROUP BY module_id
     ) v ON m.id = v.module_id
     WHERE l.organization_id = $1`,
    [req.edge.organization_id]
  );
  
  res.json({ status: 'ok', entitlements: result.rows });
});

/**
 * GET /edge/v1/packages/:slug/:version
 * Downloads the signed ZIP package for a module.
 */
router.get('/packages/:slug/:version', requireEdgeAuth, async (req, res) => {
  const { slug, version } = req.params;
  
  // 1. Verify the org actually has a license for this module
  const licenseCheck = await pool.query(
    `SELECT l.status 
     FROM licenses l
     JOIN modules m ON l.module_id = m.id
     WHERE l.organization_id = $1 AND m.slug = $2`,
    [req.edge.organization_id, slug]
  );
  
  if (licenseCheck.rows.length === 0 || licenseCheck.rows[0].status !== 'active') {
    return res.status(403).json({ error: 'No active license for this module' });
  }
  
  // 2. Fetch the package metadata
  const result = await pool.query(
    `SELECT v.id, v.package_hash, v.signature
     FROM module_versions v
     JOIN modules m ON v.module_id = m.id
     WHERE m.slug = $1 AND v.version = $2 AND v.status = 'published'`,
    [slug, version]
  );
  
  if (result.rows.length === 0 || !result.rows[0].package_hash) {
    return res.status(404).json({ error: 'Package version not found or no data uploaded' });
  }
  
  const { id, package_hash, signature } = result.rows[0];
  
  const fs = require('fs');
  const path = require('path');
  const packagePath = path.join(__dirname, '../../packages_data', `${id}.zip`);
  
  if (!fs.existsSync(packagePath)) {
    return res.status(404).json({ error: 'Package file missing on server' });
  }

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${slug}-${version}.zip"`,
    'X-Package-Hash': package_hash,
    'X-Package-Signature': signature
  });
  
  const readStream = fs.createReadStream(packagePath);
  readStream.pipe(res);
});

/**
 * GET /edge/v1/plans
 * Returns available organization plans and their prices.
 */
router.get('/plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, slug, name, price_usd FROM plans ORDER BY price_usd ASC');
    res.json({ status: 'ok', plans: result.rows });
  } catch (err) {
    console.error('[edge] get plans failed:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * POST /edge/v1/payment/submit
 * Submits a manual QR payment transaction for verification.
 */
router.post('/payment/submit', requireEdgeAuth, async (req, res) => {
  const { type, target_id, amount_usd, transaction_ref } = req.body;
  if (!type || !amount_usd || !transaction_ref) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (organization_id, type, target_id, amount_usd, transaction_ref, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, status`,
      [req.edge.organization_id, type, target_id || null, amount_usd, transaction_ref]
    );

    res.status(201).json({
      status: 'ok',
      transaction: result.rows[0],
      message: 'Payment submitted successfully. Awaiting admin verification.'
    });
  } catch (err) {
    console.error('[edge] payment submit failed:', err);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

/**
 * GET /edge/v1/status
 * Returns current organization activation status (for lock screen polling)
 */
router.get('/status', requireEdgeAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status, plan FROM organizations WHERE id = $1',
      [req.edge.organization_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ status: 'ok', data: result.rows[0] });
  } catch (err) {
    console.error('[edge] get status failed:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

module.exports = router;
