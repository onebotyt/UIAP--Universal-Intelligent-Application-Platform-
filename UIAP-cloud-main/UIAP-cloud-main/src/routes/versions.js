const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const pool = require('../db/pool');
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

  const moduleResult = await pool.query('SELECT id, slug FROM modules WHERE id = $1', [moduleId]);
  if (moduleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Module not found' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO module_versions (module_id, version, changelog, core_compat_range, status)
       VALUES ($1, $2, $3, $4, 'draft')
       RETURNING *`,
      [moduleId, version, changelog || null, core_compat_range || null]
    );
    await logAction(req.admin.email, 'version.create', `${moduleResult.rows[0].slug}@${version}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Version ${version} already exists for this module` });
    }
    console.error('[versions] create failed:', err);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// GET /dashboard/modules/:moduleId/versions
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, module_id, version, changelog, core_compat_range, package_hash, signature, status, created_at FROM module_versions WHERE module_id = $1 ORDER BY created_at DESC',
    [req.params.moduleId]
  );
  res.json(result.rows);
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

  const existing = await pool.query('SELECT * FROM module_versions WHERE id = $1', [req.params.versionId]);
  if (existing.rows.length === 0) {
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

    const result = await pool.query(
      `UPDATE module_versions 
       SET package_hash = $1, signature = $2 
       WHERE id = $3 RETURNING id, version, package_hash, signature`,
      [hash, signature, req.params.versionId]
    );
    await logAction(req.admin.email, 'version.package.upload', req.params.versionId);
    res.json({ status: 'ok', data: result.rows[0] });
  } catch (err) {
    console.error('[versions] package upload failed:', err);
    res.status(500).json({ error: 'Failed to save package' });
  }
});

// POST /dashboard/modules/:moduleId/versions/:versionId/publish
router.post('/:versionId/publish', async (req, res) => {
  const existing = await pool.query('SELECT package_hash FROM module_versions WHERE id = $1', [req.params.versionId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Version not found' });
  }

  if (!existing.rows[0].package_hash) {
    return res.status(400).json({ error: 'Cannot publish a version with no uploaded package' });
  }

  const result = await pool.query(
    `UPDATE module_versions SET status = 'published' WHERE id = $1 RETURNING id, version, status`,
    [req.params.versionId]
  );

  await logAction(req.admin.email, 'version.publish', req.params.versionId);
  res.json(result.rows[0]);
});

// POST /dashboard/modules/:moduleId/versions/:versionId/deprecate
router.post('/:versionId/deprecate', async (req, res) => {
  const result = await pool.query(
    `UPDATE module_versions SET status = 'deprecated' WHERE id = $1 RETURNING id, version, status`,
    [req.params.versionId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Version not found' });
  }
  await logAction(req.admin.email, 'version.deprecate', req.params.versionId);
  res.json(result.rows[0]);
});

module.exports = router;

