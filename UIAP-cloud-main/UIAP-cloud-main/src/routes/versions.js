const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const { randomUUID } = require('crypto');
const db = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { logAction } = require('../db/audit');
const { signPackage } = require('../signing');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for demo
});

const semverPattern = /^\d+\.\d+\.\d+$/;

const createVersionSchema = z.object({
  version: z.string().regex(semverPattern, 'version must be semver, e.g. "1.0.0"'),
  changelog: z.string().optional(),
  core_compat_range: z.string().optional(),
});

// POST /dashboard/modules/:moduleId/versions
router.post('/', async (req, res) => {
  const parsed = createVersionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const { version, changelog, core_compat_range } = parsed.data;
  const { moduleId } = req.params;

  const moduleResult = await db('modules').select('id', 'slug').where('id', moduleId).first();
  if (!moduleResult) {
    return res.status(404).json({ error: 'Module not found' });
  }

  try {
    const versionId = randomUUID();
    await db('module_versions').insert({
      id: versionId,
      module_id: moduleId,
      version,
      changelog: changelog || null,
      core_compat_range: core_compat_range || null,
      status: 'draft'
    });
    
    const newVersion = await db('module_versions').where({ id: versionId }).first();
    await logAction(req.admin.email, 'version.create', `${moduleResult.slug}@${version}`);
    res.status(201).json(newVersion);
  } catch (err) {
    // 23505 is pg, 1062 is mysql
    if (err.code === '23505' || err.errno === 1062) {
      return res.status(409).json({ error: `Version ${version} already exists for this module` });
    }
    console.error('[versions] create failed:', err);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// GET /dashboard/modules/:moduleId/versions
router.get('/', async (req, res) => {
  const versions = await db('module_versions')
    .select('id', 'module_id', 'version', 'changelog', 'core_compat_range', 'package_hash', 'signature', 'status', 'created_at')
    .where('module_id', req.params.moduleId)
    .orderBy('created_at', 'desc');
  res.json(versions);
});

const fs = require('fs/promises');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '../../packages_data');

// POST /dashboard/modules/:moduleId/versions/:versionId/package
// Uploads the ZIP, signs it, and stores the buffer in DB
router.post('/:versionId/package', upload.single('package'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No package file provided' });
  }

  const existing = await db('module_versions').where('id', req.params.versionId).first();
  if (!existing) {
    return res.status(404).json({ error: 'Version not found' });
  }

  const buffer = req.file.buffer;
  const { hash, signature } = signPackage(buffer);

  try {
    // Ensure packages directory exists
    await fs.mkdir(PACKAGES_DIR, { recursive: true });
    
    // Write package to filesystem
    const packagePath = path.join(PACKAGES_DIR, `${req.params.versionId}.zip`);
    await fs.writeFile(packagePath, buffer);

    await db('module_versions')
      .update({ package_hash: hash, signature: signature })
      .where('id', req.params.versionId);
      
    const updated = await db('module_versions')
      .select('id', 'version', 'package_hash', 'signature')
      .where('id', req.params.versionId)
      .first();

    await logAction(req.admin.email, 'version.package.upload', req.params.versionId);
    res.json({ status: 'ok', data: updated });
  } catch (err) {
    console.error('[versions] package upload failed:', err);
    res.status(500).json({ error: 'Failed to save package' });
  }
});

// POST /dashboard/modules/:moduleId/versions/:versionId/publish
router.post('/:versionId/publish', async (req, res) => {
  const existing = await db('module_versions').select('package_hash').where('id', req.params.versionId).first();
  if (!existing) {
    return res.status(404).json({ error: 'Version not found' });
  }

  if (!existing.package_hash) {
    return res.status(400).json({ error: 'Cannot publish a version with no uploaded package' });
  }

  await db('module_versions').update({ status: 'published' }).where('id', req.params.versionId);
  const updated = await db('module_versions').select('id', 'version', 'status').where('id', req.params.versionId).first();

  await logAction(req.admin.email, 'version.publish', req.params.versionId);
  res.json(updated);
});

// POST /dashboard/modules/:moduleId/versions/:versionId/deprecate
router.post('/:versionId/deprecate', async (req, res) => {
  const updatedRows = await db('module_versions').update({ status: 'deprecated' }).where('id', req.params.versionId);
  if (updatedRows === 0) {
    return res.status(404).json({ error: 'Version not found' });
  }
  const updated = await db('module_versions').select('id', 'version', 'status').where('id', req.params.versionId).first();
  await logAction(req.admin.email, 'version.deprecate', req.params.versionId);
  res.json(updated);
});

module.exports = router;

