const express = require('express');
const { z } = require('zod');
const { randomUUID } = require('crypto');
const db = require('../db/pool');
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

  const orgId = randomUUID();
  await db('organizations').insert({
    id: orgId,
    name: parsed.data.name,
    plan: parsed.data.plan
  });
  
  const org = await db('organizations').where({ id: orgId }).first();

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
  const orgs = await db('organizations').orderBy('created_at', 'desc');
  res.json(orgs);
});

// GET /dashboard/organizations/:id
router.get('/:id', async (req, res) => {
  const org = await db('organizations').where('id', req.params.id).first();
  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const licenses = await db('licenses as l')
    .join('modules as m', 'm.id', 'l.module_id')
    .select('l.*', 'm.slug as module_slug', 'm.display_name as module_name')
    .where('l.organization_id', req.params.id);

  const installations = await db('installations')
    .select('id', 'name', 'core_version', 'last_seen_at', 'created_at')
    .where('organization_id', req.params.id);

  res.json({ ...org, licenses, installations });
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

  await db('licenses')
    .insert({
      id: randomUUID(),
      organization_id: organizationId,
      module_id,
      plan,
      status: 'active',
      expires_at: expires_at || null
    })
    .onConflict(['organization_id', 'module_id'])
    .merge({
      status: 'active',
      plan,
      expires_at: expires_at || null
    });

  const license = await db('licenses').where({ organization_id: organizationId, module_id }).first();

  await logAction(req.admin.email, 'license.grant', `${organizationId}/${module_id}`);
  res.status(201).json(license);
});

// POST /dashboard/organizations/:id/licenses/:licenseId/revoke
// This is the "flip the switch" endpoint worth demoing: after this call,
// the org's Edge install will no longer be entitled to pull new versions
// of that module (enforced by the /edge/v1/entitlements endpoint in phase 2).
router.post('/:id/licenses/:licenseId/revoke', async (req, res) => {
  const updated = await db('licenses')
    .update({ status: 'revoked' })
    .where({ id: req.params.licenseId, organization_id: req.params.id });
    
  if (updated === 0) {
    return res.status(404).json({ error: 'License not found for this organization' });
  }

  const license = await db('licenses').where('id', req.params.licenseId).first();
  await logAction(req.admin.email, 'license.revoke', req.params.licenseId);
  res.json(license);
});

// POST /dashboard/organizations/:id/beta
router.post('/:id/beta', async (req, res) => {
  const schema = z.object({ module_id: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  await db('beta_access')
    .insert({ 
      id: randomUUID(), 
      organization_id: req.params.id, 
      module_id: parsed.data.module_id 
    })
    .onConflict(['organization_id', 'module_id'])
    .ignore();

  const beta = await db('beta_access').where({ organization_id: req.params.id, module_id: parsed.data.module_id }).first();
  await logAction(req.admin.email, 'beta.grant', `${req.params.id}/${parsed.data.module_id}`);
  res.status(201).json(beta || { message: 'Beta access already granted' });
});

// DELETE /dashboard/organizations/:id
router.delete('/:id', async (req, res) => {
  try {
    const org = await db('organizations').where('id', req.params.id).first();
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Delete transactions manually because the foreign key lacks onDelete('CASCADE')
    await db('transactions').where('organization_id', req.params.id).delete();

    // Delete the organization. Other tables (licenses, installations) have CASCADE.
    await db('organizations').where('id', req.params.id).delete();
    
    await logAction(req.admin.email, 'organization.delete', req.params.id);
    res.json({ message: 'Organization removed successfully' });
  } catch (err) {
    console.error('[organizations] delete failed:', err);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

module.exports = router;
