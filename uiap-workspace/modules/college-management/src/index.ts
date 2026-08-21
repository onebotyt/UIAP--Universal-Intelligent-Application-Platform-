import type { UIAPModule, ModuleContext, ModuleManifest } from '@uiap/module-sdk';
import { Router } from 'express';
import manifestData from '../manifest.json' with { type: 'json' };

export default class CollegeManagementModule implements UIAPModule {
  public manifest: ModuleManifest = manifestData as ModuleManifest;

  activate(context: ModuleContext): () => void {
    context.logger.info('College Management module is activating!');

    const router = Router();
    const requireView = context.rbac.require('college', 'view');
    const requireManage = context.rbac.require('college', 'manage');

    // ==========================================
    // DEPARTMENTS
    // ==========================================
    router.get('/departments', requireView, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        const data = await db('departments').orderBy('name', 'asc');
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.post('/departments', requireManage, async (req, res) => {
      try {
        const { name, code } = req.body;
        const db = context.db.getBuilder();
        await db('departments').insert({ name, code });
        const data = await db('departments').where({ code }).first();
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.delete('/departments/:id', requireManage, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        await db('departments').where({ id: req.params.id }).delete();
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // ==========================================
    // CLASSES
    // ==========================================
    router.get('/classes', requireView, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        const data = await db('classes as c')
          .join('departments as d', 'c.department_id', 'd.id')
          .select('c.*', 'd.name as department_name')
          .orderBy('c.semester', 'asc')
          .orderBy('c.name', 'asc');
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.post('/classes', requireManage, async (req, res) => {
      try {
        const { department_id, name, semester } = req.body;
        const db = context.db.getBuilder();
        await db('classes').insert({ department_id, name, semester });
        // Getting last inserted might need UUID handling, but since this is local sqlite mostly, it's fine.
        const data = await db('classes').where({ department_id, name, semester }).first();
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.delete('/classes/:id', requireManage, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        await db('classes').where({ id: req.params.id }).delete();
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // ==========================================
    // TEACHERS
    // ==========================================
    router.get('/teachers', requireView, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        const data = await db('teachers as t')
          .join('departments as d', 't.department_id', 'd.id')
          .select('t.*', 'd.name as department_name')
          .orderBy('t.last_name', 'asc')
          .orderBy('t.first_name', 'asc');
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.post('/teachers', requireManage, async (req, res) => {
      try {
        const { department_id, first_name, last_name, employee_id } = req.body;
        const db = context.db.getBuilder();
        await db('teachers').insert({ department_id, first_name, last_name, employee_id });
        const data = await db('teachers').where({ employee_id }).first();
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.delete('/teachers/:id', requireManage, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        await db('teachers').where({ id: req.params.id }).delete();
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // ==========================================
    // STUDENTS
    // ==========================================
    router.get('/students', requireView, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        const data = await db('students as s')
          .join('classes as c', 's.class_id', 'c.id')
          .join('departments as d', 'c.department_id', 'd.id')
          .select('s.*', 'c.name as class_name', 'd.name as department_name')
          .orderBy('s.last_name', 'asc')
          .orderBy('s.first_name', 'asc');
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.post('/students', requireManage, async (req, res) => {
      try {
        const { class_id, first_name, last_name, enrollment_no } = req.body;
        const db = context.db.getBuilder();
        await db('students').insert({ class_id, first_name, last_name, enrollment_no });
        const data = await db('students').where({ enrollment_no }).first();
        res.json({ success: true, data });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.delete('/students/:id', requireManage, async (req, res) => {
      try {
        const db = context.db.getBuilder();
        await db('students').where({ id: req.params.id }).delete();
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Register router
    context.registerApiRouter(router);

    return () => {
      context.logger.info('College Management module deactivated.');
    };
  }
}
