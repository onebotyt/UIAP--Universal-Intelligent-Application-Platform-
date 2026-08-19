import { Router } from 'express';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';
import { getRoles, createRole, assignRolePermissions } from '@uiap/core';

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

// GET /api/roles - List roles
rolesRouter.get('/', requirePermission('core.roles', 'view'), async (req, res, next) => {
  try {
    const roles = await getRoles();
    res.json({ status: 'ok', data: roles });
  } catch (error) {
    next(error);
  }
});

// POST /api/roles - Create role
rolesRouter.post('/', requirePermission('core.roles', 'manage'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Invalid name or description' });
    }

    const actorId = (req as AuthRequest).user!.id;
    const role = await createRole(name, description, actorId);
    res.status(201).json({ status: 'ok', data: role });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    next(error);
  }
});

// PUT /api/roles/:id/permissions - Assign permissions to role
rolesRouter.put(
  '/:id/permissions',
  requirePermission('core.roles', 'manage'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === 'string')) {
        return res.status(400).json({ error: 'permissions must be an array of strings' });
      }

      const actorId = (req as AuthRequest).user!.id;
      await assignRolePermissions(id as string, permissions, actorId);
      res.json({ status: 'ok' });
    } catch (error: unknown) {
      next(error);
    }
  },
);
