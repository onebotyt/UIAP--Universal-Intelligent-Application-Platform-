import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getDb } from '@uiap/core';
import crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export const devicesAdminRouter = Router();

// GET /api/devices
devicesAdminRouter.get(
  '/',
  requireAuth,
  requirePermission('devices', 'view'),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const devices = await db('core_device_registry')
        .select('id', 'hardware_id', 'name', 'type', 'status', 'enabled', 'last_heartbeat_at', 'created_at', 'updated_at')
        .orderBy('created_at', 'desc');
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to get devices' });
    }
  },
);

// GET /api/devices/:id
devicesAdminRouter.get(
  '/:id',
  requireAuth,
  requirePermission('devices', 'view'),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const device = await db('core_device_registry')
        .select('id', 'hardware_id', 'name', 'type', 'status', 'enabled', 'last_heartbeat_at', 'created_at', 'updated_at')
        .where({ id: req.params.id })
        .first();

      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to get device' });
    }
  },
);

// POST /api/devices
devicesAdminRouter.post(
  '/',
  requireAuth,
  requirePermission('devices', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { hardwareId, name, type } = req.body;
      const db = getDb();

      // Check if hardwareId exists
      const check = await db('core_device_registry').where({ hardware_id: hardwareId }).first();
      if (check) {
        res.status(409).json({ error: 'Device with this hardwareId already exists' });
        return;
      }

      const secret = crypto.randomBytes(32).toString('hex');
      const hash = await bcrypt.hash(secret, 10);
      const id = crypto.randomUUID();

      await db('core_device_registry').insert({
        id,
        hardware_id: hardwareId,
        name,
        type,
        credential_hash: hash,
        status: 'REGISTERED',
        enabled: true
      });

      const device = await db('core_device_registry')
        .select('id', 'hardware_id', 'name', 'type', 'status', 'enabled', 'last_heartbeat_at', 'created_at', 'updated_at')
        .where({ id })
        .first();

      res.status(201).json({ device, secret });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to create device' });
    }
  },
);

// POST /api/devices/:id/disable
devicesAdminRouter.post(
  '/:id/disable',
  requireAuth,
  requirePermission('devices', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const updatedCount = await db('core_device_registry')
        .where({ id: req.params.id })
        .update({
          enabled: false,
          status: 'DISABLED'
        });

      if (updatedCount === 0) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to disable device' });
    }
  },
);

// POST /api/devices/:id/enable
devicesAdminRouter.post(
  '/:id/enable',
  requireAuth,
  requirePermission('devices', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const updatedCount = await db('core_device_registry')
        .where({ id: req.params.id })
        .update({
          enabled: true,
          status: 'REGISTERED'
        });

      if (updatedCount === 0) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to enable device' });
    }
  },
);
