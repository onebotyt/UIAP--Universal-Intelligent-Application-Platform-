import { UIAPModule, ModuleContext } from '@uiap/module-sdk';
import { Router } from 'express';

const manifest = {
  id: 'uiap.reports',
  name: 'Attendance Reports',
  version: '0.1.0',
  description: 'Generates attendance reports across the organization',
  platform: 'UIAP' as const,
};

export default {
  manifest,
  activate: async (context: ModuleContext) => {
    context.logger.info('Activating Reports module...');

    const router = Router();
    
    // In a real module, this would query the DB. Since modules are schema-isolated,
    // how does it query attendance data? 
    // Option A: The attendance module exposes an API or database view.
    // Option B: The reports module subscribes to 'attendance.recorded' events and builds its own reporting database.
    // We'll use Option B for true micro-module isolation.

    const db = context.db.getBuilder();
    const hasTable = await db.schema.hasTable('report_data');
    if (!hasTable) {
      await db.schema.createTable('report_data', (table: any) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('student_id').notNullable();
        table.date('record_date').notNullable();
        table.text('status').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.unique(['student_id', 'record_date']);
      });
    }

    // Listen to attendance recorded events (which should be fired by Attendance module)
    // Wait, Attendance module currently doesn't fire this. Let's assume we will add it, or just use cross-schema query for now for demo purposes.
    // For this demo, let's just create a dummy endpoint to show the module is active.

    router.get('/daily', context.rbac.require('reports', 'view'), async (req, res) => {
      // In PostgreSQL we could technically do a cross schema query if permissions allow:
      // SELECT * FROM "uiap.attendance".attendance_records
      // But standard practice in UIAP is Event Sourcing.
      res.json({ success: true, message: 'Daily report generation not fully implemented in demo.' });
    });

    context.registerApiRouter(router);

    return () => {
      context.logger.info('Reports module deactivated.');
    };
  },
} satisfies UIAPModule;
