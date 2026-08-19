import { Router, Request, Response } from 'express';
import { DeviceRegistry, EventStore, logAuthAction } from '@uiap/core';
import { requireDeviceAuth } from '../middleware/deviceAuth.js';

export const deviceApiRouter = Router();

// POST /api/device/heartbeat
deviceApiRouter.post('/heartbeat', requireDeviceAuth, async (req: Request, res: Response) => {
  try {
    const device = req.device!;

    await DeviceRegistry.updateHeartbeat(device.id);
    await logAuthAction('device.heartbeat', null, req.ip, { deviceId: device.id });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/device/events
deviceApiRouter.post('/events', requireDeviceAuth, async (req: Request, res: Response) => {
  try {
    const device = req.device!;
    const { eventId, deviceId, eventType, occurredAt, payload } = req.body;

    // The deviceId in payload should match the authenticated device's uiap ID.
    if (device.id !== deviceId) {
      await logAuthAction('device.event.rejected', null, req.ip, {
        deviceId: device.id,
        reason: 'deviceId mismatch',
      });
      return res.status(403).json({ error: 'Forbidden: deviceId mismatch' });
    }

    if (!eventId || !eventType || !occurredAt || !payload) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const eventTime = new Date(occurredAt).getTime();
    const now = Date.now();

    if (isNaN(eventTime)) {
      return res.status(400).json({ error: 'Invalid occurredAt timestamp' });
    }

    // Max event age 5 minutes
    if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Event timestamp is outside acceptable window' });
    }

    try {
      const status = await EventStore.appendEvent({
        eventId,
        source: 'device',
        sourceId: deviceId,
        eventType,
        occurredAt,
        payload: {
          ...payload,
          _deviceId: deviceId,
          _eventId: eventId,
          _occurredAt: occurredAt,
        },
      });

      if (status === 'accepted') {
        await logAuthAction('device.event.accepted', null, req.ip, {
          deviceId,
          eventId,
          eventType,
        });
        return res.status(202).json({ accepted: true, eventId, status: 'PENDING' });
      } else if (status === 'duplicate') {
        await logAuthAction('device.event.duplicate', null, req.ip, {
          deviceId,
          eventId,
          eventType,
        });
        return res.status(202).json({ accepted: true, eventId, status: 'ALREADY_RECEIVED' });
      }
    } catch (processError: unknown) {
      await logAuthAction('device.event.rejected', null, req.ip, {
        deviceId,
        eventId,
        eventType,
        reason: (processError as Error).message,
      });
      return res.status(400).json({ error: (processError as Error).message });
    }
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
