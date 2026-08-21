import type { UIAPModule, ModuleContext, ModuleManifest } from '@uiap/module-sdk';
import { Router } from 'express';
import manifestData from '../manifest.json';

export default class AttendanceModule implements UIAPModule {
  public manifest: ModuleManifest = manifestData as unknown as ModuleManifest;
  private unsubscribe?: () => void;

  public async activate(context: ModuleContext): Promise<void> {
    context.logger.info('Attendance module activating...');

    // Subscribe to biometric events to automatically mark attendance
    this.unsubscribe = context.events.subscribe('attendance.checkin.request', async (event) => {
      context.logger.info(
        `Received attendance.checkin.request event: ${JSON.stringify(event.payload)}`,
      );
      try {
        const payload = event.payload as any;
        const { student_id, device_id, source } = payload;
        const timestamp = event.occurredAt as string;

        if (!student_id) {
          context.logger.error('Received attendance.checkin.request without student_id');
          return;
        }

        const date = new Date(timestamp);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const db = context.db.getBuilder();

        // Phase 1F: Duplicate protection (prevent check-ins within e.g. 5 mins)
        const recent = await db('attendance_records')
          .select('id', 'check_in_time')
          .where({ student_id, record_date: dateStr })
          .orderBy('created_at', 'desc')
          .first();

        if (recent) {
          // For demo, just checking if it exists today. If we wanted a 5 min cooldown we'd compare time.
          context.logger.info(
            `Duplicate protection: Student ${student_id} already checked in today at ${recent.check_in_time}`,
          );
          return;
        }

        // Phase 1F: Lateness threshold (e.g. check-in after 09:15 = late)
        // Hardcoded for demo, normally fetched from a class/schedule config
        const lateThreshold = '09:15';
        const isLate = timeStr > lateThreshold;
        const status = isLate ? 'late' : 'present';

        await db('attendance_records').insert({
          student_id,
          record_date: dateStr,
          status,
          check_in_time: timeStr,
          method: source || 'biometric',
          device_id: device_id || 'unknown',
          marked_by: 'system',
        });
        context.logger.info(`Marked student ${student_id} as ${status} via ${source}`);
      } catch (err: any) {
        context.logger.error(`Failed to process attendance.checkin.request: ${err.message}`);
      }
    });

    const router = Router();

    // GET /records
    router.get('/records', context.rbac.require('attendance.records', 'view'), async (req, res) => {
      try {
        const db = context.db.getBuilder();
        const records = await db('attendance_records')
          .orderBy('record_date', 'desc')
          .orderBy('check_in_time', 'desc')
          .limit(1000);

        // Map to match frontend format
        const mapped = records.map((r: any) => ({
          id: r.id.toString(),
          studentId: r.student_id,
          studentName: 'Student', // We'll let the frontend join this with actual names if needed, or leave it as generic for now since it's isolated
          className: r.class_id || 'Unknown',
          section: 'N/A',
          subject: r.subject || 'General',
          date:
            r.record_date instanceof Date
              ? r.record_date.toISOString().split('T')[0]
              : String(r.record_date).split('T')[0],
          checkInTime: r.check_in_time,
          status: r.status,
          method: r.method,
          markedBy: r.marked_by,
        }));

        res.json({ success: true, data: mapped });
      } catch (err: any) {
        context.logger.error(`Error fetching records: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // POST /records (single manual)
    router.post(
      '/records',
      context.rbac.require('attendance.records', 'manage'),
      async (req, res) => {
        try {
          const { studentId, className, subject, date, checkInTime, status, method, markedBy } =
            req.body;
          const db = context.db.getBuilder();

          await db('attendance_records').insert({
            student_id: studentId,
            class_id: className,
            subject,
            record_date: date,
            status,
            check_in_time: checkInTime,
            method: method || 'manual',
            marked_by: markedBy || 'admin',
          });

          // Return a mock ID since we don't have RETURNING easily in all DBs without knowing PK
          res.json({ success: true, data: { id: Date.now() } });
        } catch (err: any) {
          context.logger.error(`Error adding record: ${err.message}`);
          res.status(500).json({ success: false, error: err.message });
        }
      },
    );

    // POST /records/batch
    router.post(
      '/records/batch',
      context.rbac.require('attendance.records', 'manage'),
      async (req, res) => {
        try {
          const records = req.body.records || [];
          const db = context.db.getBuilder();

          await db.transaction(async (trx: any) => {
            for (const rec of records) {
              // Delete existing for same student/date/class to avoid duplicates if re-submitting roll call
              await trx('attendance_records')
                .where({ student_id: rec.studentId, record_date: rec.date })
                .delete();

              await trx('attendance_records').insert({
                student_id: rec.studentId,
                class_id: rec.className,
                subject: rec.subject,
                record_date: rec.date,
                status: rec.status,
                check_in_time: rec.checkInTime,
                method: rec.method || 'batch',
                marked_by: rec.markedBy || 'admin',
              });
            }
          });

          res.json({ success: true, count: records.length });
        } catch (err: any) {
          context.logger.error(`Error adding batch records: ${err.message}`);
          res.status(500).json({ success: false, error: err.message });
        }
      },
    );

    // PUT /records/:id
    router.put(
      '/records/:id',
      context.rbac.require('attendance.records', 'manage'),
      async (req, res) => {
        try {
          const { id } = req.params;
          const { status } = req.body;
          const db = context.db.getBuilder();

          await db('attendance_records').where({ id }).update({ status, updated_at: db.fn.now() });

          res.json({ success: true });
        } catch (err: any) {
          context.logger.error(`Error updating record: ${err.message}`);
          res.status(500).json({ success: false, error: err.message });
        }
      },
    );

    // DELETE /records/:id
    router.delete(
      '/records/:id',
      context.rbac.require('attendance.records', 'manage'),
      async (req, res) => {
        try {
          const { id } = req.params;
          const db = context.db.getBuilder();
          await db('attendance_records').where({ id }).delete();
          res.json({ success: true });
        } catch (err: any) {
          context.logger.error(`Error deleting record: ${err.message}`);
          res.status(500).json({ success: false, error: err.message });
        }
      },
    );

    // DELETE /records (batch delete)
    router.delete(
      '/records',
      context.rbac.require('attendance.records', 'manage'),
      async (req, res) => {
        try {
          const ids = req.body.ids || [];
          if (ids.length > 0) {
            const db = context.db.getBuilder();
            await db('attendance_records').whereIn('id', ids).delete();
          }
          res.json({ success: true });
        } catch (err: any) {
          context.logger.error(`Error deleting batch records: ${err.message}`);
          res.status(500).json({ success: false, error: err.message });
        }
      },
    );

    context.registerApiRouter(router);
    context.logger.info('Attendance module activated successfully.');
  }

  public async deactivate(context: ModuleContext): Promise<void> {
    context.logger.info('Attendance module deactivated.');
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}
