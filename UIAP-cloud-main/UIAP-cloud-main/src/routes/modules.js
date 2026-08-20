const express = require('express');
const { z } = require('zod');
const { randomUUID } = require('crypto');
const db = require('../db/pool');
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
    const moduleId = randomUUID();
    await db('modules').insert({
      id: moduleId,
      slug,
      display_name,
      description: description || null,
      owner_admin_id: req.admin.id
    });
    
    const newModule = await db('modules')
      .select('id', 'slug', 'display_name', 'description', 'created_at')
      .where({ id: moduleId })
      .first();

    await logAction(req.admin.email, 'module.create', slug);
    res.status(201).json(newModule);
  } catch (err) {
    // 23505 is PostgreSQL, ER_DUP_ENTRY (1062) is MySQL
    if (err.code === '23505' || err.errno === 1062) {
      return res.status(409).json({ error: `A module with slug "${slug}" already exists` });
    }
    console.error('[modules] create failed:', err);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// GET /dashboard/modules
router.get('/', async (req, res) => {
  try {
    const result = await db('modules as m')
      .leftJoin('module_versions as mv', 'mv.module_id', 'm.id')
      .select('m.id', 'm.slug', 'm.display_name', 'm.description', 'm.created_at')
      .count('mv.id as version_count')
      .groupBy('m.id')
      .orderBy('m.created_at', 'desc');
      
    // Convert version_count to number if it's returned as string (pg behavior)
    const formatted = result.map(row => ({
      ...row,
      version_count: parseInt(row.version_count, 10)
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('[modules] fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// GET /dashboard/modules/:id
router.get('/:id', async (req, res) => {
  try {
    const mod = await db('modules').where('id', req.params.id).first();
    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(mod);
  } catch (err) {
    console.error('[modules] fetch single failed:', err);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
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

  try {
    const updatedRows = await db('modules').update(fields).where('id', req.params.id);
    
    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const updatedModule = await db('modules').where('id', req.params.id).first();
    await logAction(req.admin.email, 'module.update', updatedModule.slug);
    res.json(updatedModule);
  } catch (err) {
    console.error('[modules] update failed:', err);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

module.exports = router;
