import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getDb } from '@uiap/core';

export const eventsRouter = Router();

// GET /api/events
eventsRouter.get(
  '/',
  requireAuth,
  requirePermission('events', 'view'),
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const db = getDb();

      const events = await db('core_event_inbox')
        .select(
          'id',
          'event_id',
          'event_type',
          'source',
          'source_id',
          'status',
          'attempt_count',
          'received_at',
          'processed_at',
          'last_error',
        )
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const countResult = await db('core_event_inbox').count('id as cnt').first();
      const totalCount = parseInt(String(countResult?.cnt || 0), 10);

      res.json({
        data: events.map((row: Record<string, unknown>) => ({
          id: row.id,
          eventId: row.event_id,
          eventType: row.event_type,
          source: row.source,
          sourceId: row.source_id,
          status: row.status,
          attemptCount: row.attempt_count,
          receivedAt: row.received_at,
          processedAt: row.processed_at,
          lastError: row.last_error,
        })),
        total: totalCount,
        limit,
        offset,
      });
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
);
