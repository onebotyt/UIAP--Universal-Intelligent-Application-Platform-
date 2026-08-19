import { getDb } from '../db/pool.js';
import { runtime } from '../runtime/ModuleRuntime.js';
import crypto from 'crypto';

export interface DeviceEventEnvelope {
  eventId: string;
  deviceId: string;
  eventType: string;
  occurredAt: string;
  payload: unknown;
}

export class DeviceEventRouter {
  // Max event age 5 minutes
  private static readonly MAX_EVENT_AGE_MS = 5 * 60 * 1000;

  static async processEvent(
    envelope: DeviceEventEnvelope,
  ): Promise<'accepted' | 'rejected' | 'duplicate'> {
    const { eventId, deviceId, eventType, occurredAt, payload } = envelope;

    const eventTime = new Date(occurredAt).getTime();
    const now = Date.now();

    if (isNaN(eventTime)) {
      throw new Error('Invalid occurredAt timestamp');
    }

    if (Math.abs(now - eventTime) > this.MAX_EVENT_AGE_MS) {
      throw new Error('Event timestamp is outside acceptable window');
    }

    // Idempotency check via DB insert
    try {
      const db = getDb();
      await db('core_device_events_log').insert({
        event_id: eventId,
        device_id: deviceId,
        event_type: eventType,
        occurred_at: new Date(occurredAt)
      });
    } catch (err: any) {
      // 23505 is PostgreSQL unique_violation, 1062 is MySQL, SQLITE_CONSTRAINT is SQLite
      const isDuplicate = 
        err.code === '23505' || 
        err.code === 'ER_DUP_ENTRY' || 
        err.errno === 1062 ||
        (err.code && err.code.includes('SQLITE_CONSTRAINT'));

      if (isDuplicate) {
        return 'duplicate';
      }
      throw err;
    }

    // Publish to EventBus
    await runtime.eventBus.publish({
      id: crypto.randomUUID(),
      type: eventType,
      source: `device:${deviceId}`,
      occurredAt: occurredAt,
      payload: {
        ...((payload as Record<string, unknown>) || {}),
        _deviceId: deviceId,
        _eventId: eventId,
        _occurredAt: occurredAt,
      },
    });

    return 'accepted';
  }
}
