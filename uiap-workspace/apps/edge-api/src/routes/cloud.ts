import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getConfig } from '../config.js';
import { getPool } from '@uiap/core';

export const cloudRouter = Router();

/**
 * GET /api/cloud/status
 * Returns current cloud connection status and known entitlements
 */
cloudRouter.get('/status', requireAuth, async (req, res) => {
  try {
    const cfg = getConfig();
    const isConfigured = !!(cfg.cloudUrl && cfg.installKey);
    let entitlements: any[] = [];

    if (isConfigured) {
      const pool = getPool();
      await pool.raw(
        'CREATE TABLE IF NOT EXISTS cloud_entitlements (slug TEXT PRIMARY KEY, version TEXT, status TEXT)',
      );

      const result = await pool.raw('SELECT * FROM cloud_entitlements');
      entitlements = result.rows ?? result;
    }

    res.json({
      configured: isConfigured,
      cloudUrl: cfg.cloudUrl || null,
      entitlements,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
