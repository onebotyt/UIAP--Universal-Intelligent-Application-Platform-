const express = require('express');
const { z } = require('zod');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { logAction } = require('../db/audit');
const versionsRouter = require('./versions');

const router = express.Router();
router.use(requireAuth);

// Nested: /dashboard/modules/:moduleId/versions/*
router.use('/:moduleId/versions', versionsRouter);

const slugPattern = /^[a-z0-9]+(\.[a-z0-9-]+)+$/; // e.g. uiap.attendance, uiap.college-management

const createModuleSchema = z.object({
  slug: z.string().regex(slugPattern, 'slug must look like "uiap.module-name"'),
  display_name: z.string().min(1),
  description: z.string().optional(),
});

// POST /dashboard/modules
router.post('/', async (req, res) => {
  const parsed = createModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const { slug, display_name, description } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO modules (slug, display_name, description, owner_admin_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, slug, display_name, description, created_at`,
      [slug, display_name, description || null, req.admin.id]
    );
    await logAction(req.admin.email, 'module.create', slug);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: `A module with slug "${slug}" already exists` });
    }
    console.error('[modules] create failed:', err);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// GET /dashboard/modules
router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT m.id, m.slug, m.display_name, m.description, m.created_at,
            COUNT(mv.id)::int AS version_count
     FROM modules m
     LEFT JOIN module_versions mv ON mv.module_id = m.id
     GROUP BY m.id
     ORDER BY m.created_at DESC`
  );
  res.json(result.rows);
});

// GET /dashboard/modules/:id
router.get('/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM modules WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Module not found' });
  }
  res.json(result.rows[0]);
});

// PATCH /dashboard/modules/:id  (edit display name / description only — slug is immutable)
const updateModuleSchema = z.object({
  display_name: z.string().min(1).optional(),
  description: z.string().optional(),
});

router.patch('/:id', async (req, res) => {
  const parsed = updateModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const fields = parsed.data;
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClauses = Object.keys(fields).map((key, i) => `${key} = $${i + 1}`);
  const values = Object.values(fields);
  values.push(req.params.id);

  const result = await pool.query(
    `UPDATE modules SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Module not found' });
  }

  await logAction(req.admin.email, 'module.update', result.rows[0].slug);
  res.json(result.rows[0]);
});

module.exports = router;
