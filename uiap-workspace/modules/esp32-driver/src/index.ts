import { UIAPModule, ModuleContext } from '@uiap/module-sdk';
import { Router } from 'express';

const manifest = {
  id: 'uiap.esp32-driver',
  name: 'ESP32 Hardware Driver',
  version: '0.1.0',
  description: 'Receives payloads from physical ESP32 biometric scanners',
  platform: 'UIAP' as const,
};

export default {
  manifest,
  activate: async (context: ModuleContext) => {
    context.logger.info('Activating ESP32 Driver module...');

    const router = Router();

    // Webhook for the ESP32 to push scan results
    router.post('/webhook/scan', async (req, res) => {
      // Typically there would be a device API key verification here
      const { device_id, slot_id, timestamp } = req.body;

      if (!device_id || slot_id === undefined) {
        return res.status(400).json({ error: 'Missing device_id or slot_id' });
      }

      context.logger.info(`Received webhook scan from ${device_id} (slot: ${slot_id})`);

      try {
        await context.events.publish({
          type: 'hardware.biometric.scanned',
          occurredAt: timestamp || new Date().toISOString(),
          payload: {
            device_id,
            slot_id,
          },
        });
        res.json({ success: true, message: 'Scan processed' });
      } catch (err: any) {
        context.logger.error('Failed to publish scan event:', err);
        res.status(500).json({ error: 'Internal event bus error' });
      }
    });

    context.registerApiRouter(router);

    return () => {
      context.logger.info('ESP32 Driver module deactivated.');
    };
  },
} satisfies UIAPModule;
