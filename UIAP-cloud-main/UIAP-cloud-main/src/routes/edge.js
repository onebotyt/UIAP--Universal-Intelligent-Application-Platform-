const express = require('express');
const { z } = require('zod');
const { randomUUID } = require('crypto');
const db = require('../db/pool');

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
    const org = await db('organizations').select('id').first();
    if (!org) {
      return res.status(400).json({ error: 'No organizations found to register against' });
    }
    targetOrgId = org.id;
  }

  try {
    const installationId = randomUUID();
    
    await db('installations').insert({
      id: installationId,
      organization_id: targetOrgId,
      install_key_hash: install_key,
      core_version: core_version,
      last_seen_at: db.fn.now()
    });
    
    res.status(201).json({
      status: 'ok',
      installation_id: installationId,
      organization_id: targetOrgId
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
  const edge = await db('installations')
    .select('id', 'organization_id')
    .where({ install_key_hash: installKey })
    .first();
  
  if (!edge) {
    return res.status(401).json({ error: 'Invalid installation key' });
  }
  
  req.edge = edge;
  
  // Update last seen
  await db('installations')
    .update({ last_seen_at: db.fn.now() })
    .where({ id: req.edge.id });
  
  next();
}

/**
 * GET /edge/v1/entitlements
 * Returns the list of licensed modules for the installation's organization.
 */
router.get('/entitlements', requireEdgeAuth, async (req, res) => {
  try {
    const entitlements = await db('licenses as l')
      .join('modules as m', 'l.module_id', 'm.id')
      .leftJoin(
        db('module_versions')
          .select('module_id')
          .max('version as version')
          .where('status', 'published')
          .groupBy('module_id')
          .as('v'),
        'm.id', 'v.module_id'
      )
      .select('m.slug', 'm.display_name', 'l.status', 'l.expires_at', 'v.version')
      .where('l.organization_id', req.edge.organization_id);
      
    res.json({ status: 'ok', entitlements });
  } catch (err) {
    console.error('[edge] entitlements failed:', err);
    res.status(500).json({ error: 'Failed to fetch entitlements' });
  }
});

/**
 * GET /edge/v1/packages/:slug/:version
 * Downloads the signed ZIP package for a module.
 */
router.get('/packages/:slug/:version', requireEdgeAuth, async (req, res) => {
  const { slug, version } = req.params;
  
  // 1. Verify the org actually has a license for this module
  const licenseCheck = await db('licenses as l')
    .join('modules as m', 'l.module_id', 'm.id')
    .select('l.status')
    .where('l.organization_id', req.edge.organization_id)
    .where('m.slug', slug)
    .first();
  
  if (!licenseCheck || licenseCheck.status !== 'active') {
    return res.status(403).json({ error: 'No active license for this module' });
  }
  
  // 2. Fetch the package metadata
  const result = await db('module_versions as v')
    .join('modules as m', 'v.module_id', 'm.id')
    .select('v.id', 'v.package_hash', 'v.signature')
    .where('m.slug', slug)
    .where('v.version', version)
    .where('v.status', 'published')
    .first();
  
  if (!result || !result.package_hash) {
    return res.status(404).json({ error: 'Package version not found or no data uploaded' });
  }
  
  const { id, package_hash, signature } = result;
  
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
    const plans = await db('plans').select('id', 'slug', 'name', 'price_usd').orderBy('price_usd', 'asc');
    res.json({ status: 'ok', plans });
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
    const transactionId = randomUUID();
    
    await db('transactions').insert({
      id: transactionId,
      organization_id: req.edge.organization_id,
      type,
      target_id: target_id || null,
      amount_usd,
      transaction_ref,
      status: 'pending'
    });

    res.status(201).json({
      status: 'ok',
      transaction: { id: transactionId, status: 'pending' },
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
    const org = await db('organizations')
      .select('status', 'plan')
      .where('id', req.edge.organization_id)
      .first();
      
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ status: 'ok', data: org });
  } catch (err) {
    console.error('[edge] get status failed:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

module.exports = router;
