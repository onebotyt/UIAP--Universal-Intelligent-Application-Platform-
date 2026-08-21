import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '@uiap/core';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // DB agnostic counting
    const totalModules = await db('core_module_installations').count('id as cnt').first();
    const enabledModules = await db('core_module_installations')
      .count('id as cnt')
      .where({ is_enabled: true })
      .first();
    const totalDevices = await db('core_device_registry').count('id as cnt').first();

    const failedEvents = await db('core_event_inbox')
      .count('id as cnt')
      .where({ status: 'FAILED' })
      .first();
    const pendingEvents = await db('core_event_inbox')
      .count('id as cnt')
      .where({ status: 'PENDING' })
      .first();

    const parseCount = (val: any) => parseInt(String(val?.cnt || 0), 10);

    res.json({
      core: 'running',
      database: 'connected',
      modules: {
        enabled: parseCount(enabledModules),
        total: parseCount(totalModules),
      },
      devices: {
        total: parseCount(totalDevices),
      },
      events: {
        failed: parseCount(failedEvents),
        pending: parseCount(pendingEvents),
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});
