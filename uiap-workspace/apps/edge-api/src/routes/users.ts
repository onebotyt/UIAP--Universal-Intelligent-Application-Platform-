import { Router } from 'express';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';
import { getUsers, createUser, updateUserStatus, assignUserRoles } from '@uiap/core';

export const usersRouter = Router();

// Base middleware for all user routes
usersRouter.use(requireAuth);

// GET /api/users - List users
usersRouter.get('/', requirePermission('core.users', 'view'), async (req, res, next) => {
  try {
    const users = await getUsers();
    res.json({ status: 'ok', data: users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create user
usersRouter.post('/', requirePermission('core.users', 'manage'), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const actorId = (req as AuthRequest).user!.id;
    const user = await createUser(username, password, actorId);
    res.status(201).json({ status: 'ok', data: user });
  } catch (error: unknown) {
    // Handle unique constraint violation gracefully
    if ((error as { code?: string }).code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    next(error);
  }
});

// PATCH /api/users/:id/status - Update user status
usersRouter.patch(
  '/:id/status',
  requirePermission('core.users', 'manage'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
      }

      const actorId = (req as AuthRequest).user!.id;
      const user = await updateUserStatus(id as string, is_active, actorId);
      res.json({ status: 'ok', data: user });
    } catch (error: unknown) {
      if ((error as Error).message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      next(error);
    }
  },
);

// PUT /api/users/:id/roles - Assign roles to user
usersRouter.put('/:id/roles', requirePermission('core.users', 'manage'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles) || !roles.every((r) => typeof r === 'string')) {
      return res.status(400).json({ error: 'roles must be an array of strings' });
    }

    const actorId = (req as AuthRequest).user!.id;
    await assignUserRoles(id as string, roles, actorId);
    res.json({ status: 'ok' });
  } catch (error: unknown) {
    next(error);
  }
});
