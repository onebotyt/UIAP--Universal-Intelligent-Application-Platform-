import { UIAPModule, ModuleContext } from '@uiap/module-sdk';
import { Router } from 'express';

const manifest = {
  id: 'uiap.biometric-verification',
  name: 'Biometric Verification',
  version: '0.1.0',
  description: 'Manages biometric templates and processes hardware scans',
  platform: 'UIAP' as const,
};

export default {
  manifest,
  activate: async (context: ModuleContext) => {
    context.logger.info('Activating Biometric Verification module...');

    // 1. Initialize schema
    const db = context.db.getBuilder();
    const hasTable = await db.schema.hasTable('biometric_enrollments');
    if (!hasTable) {
      await db.schema.createTable('biometric_enrollments', (table: any) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('student_id').notNullable().unique();
        table.string('device_id').notNullable();
        table.integer('slot_id').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.unique(['device_id', 'slot_id']);
      });
    }

    // 2. Setup API Router
    const router = Router();
    
    // Enroll a student (maps a device slot to a student_id)
    router.post('/enroll', context.rbac.require('biometric', 'manage'), async (req, res) => {
      const { student_id, device_id, slot_id } = req.body;
      if (!student_id || !device_id || slot_id === undefined) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      try {
        const db = context.db.getBuilder();
        await db('biometric_enrollments')
          .insert({ student_id, device_id, slot_id })
          .onConflict('student_id')
          .merge(['device_id', 'slot_id']);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    context.registerApiRouter(router);

    // 3. Listen to hardware events (Phase 1G Event Chain)
    const unsubscribe = context.events.subscribe('hardware.biometric.scanned', async (event) => {
      const { device_id, slot_id, timestamp } = event.payload as any;
      context.logger.info(`Received hardware scan from device ${device_id} slot ${slot_id}`);

      // Find the student
      const db = context.db.getBuilder();
      const enrollment = await db('biometric_enrollments')
        .select('student_id')
        .where({ device_id, slot_id })
        .first();

      if (enrollment) {
        const studentId = enrollment.student_id;
        context.logger.info(`Matched slot ${slot_id} to student ${studentId}. Requesting check-in...`);
        
        // Fire attendance request
        await context.events.publish({
          type: 'attendance.checkin.request',
          occurredAt: timestamp || new Date().toISOString(),
          payload: {
            student_id: studentId,
            source: 'biometric',
            device_id
          }
        });
      } else {
        context.logger.warn(`Unregistered scan: device ${device_id} slot ${slot_id}`);
      }
    });

    return () => {
      unsubscribe();
      context.logger.info('Biometric Verification module deactivated.');
    };
  },
} satisfies UIAPModule;
