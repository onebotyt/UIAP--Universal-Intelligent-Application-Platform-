const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db/pool');
const { logAction } = require('../db/audit');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
});

// POST /api/auth/register (Organization Owner Registration)
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const { email, password, orgName } = parsed.data;

  try {
    const existing = await pool.query('SELECT id FROM org_owners WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Use transaction to create both owner and org
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerRes = await client.query(
        'INSERT INTO org_owners (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, passwordHash]
      );
      const owner = ownerRes.rows[0];

      await client.query(
        'INSERT INTO organizations (owner_id, name, status) VALUES ($1, $2, $3)',
        [owner.id, orgName, 'pending_setup']
      );
      await client.query('COMMIT');

      // Automatically log them in after registration
      const token = jwt.sign(
        { sub: owner.id, email: owner.email, role: 'owner' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.status(201).json({ token, user: { id: owner.id, email: owner.email, role: 'owner' } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  try {
    // 1. Check if user is an Admin
    const adminRes = await pool.query('SELECT id, email, password_hash FROM admin_users WHERE email = $1', [email]);
    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];
      const match = await bcrypt.compare(password, admin.password_hash);
      if (match) {
        const token = jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
        await logAction(admin.email, 'auth.login', admin.email);
        return res.json({ token, user: { id: admin.id, email: admin.email, role: 'admin' } });
      }
    }

    // 2. Check if user is an Org Owner
    const ownerRes = await pool.query('SELECT id, email, password_hash FROM org_owners WHERE email = $1', [email]);
    if (ownerRes.rows.length > 0) {
      const owner = ownerRes.rows[0];
      const match = await bcrypt.compare(password, owner.password_hash);
      if (match) {
        // Fetch org details for response
        const orgRes = await pool.query('SELECT id, name, plan, status FROM organizations WHERE owner_id = $1 LIMIT 1', [owner.id]);
        const org = orgRes.rows[0];

        const token = jwt.sign({ sub: owner.id, email: owner.email, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token, user: { id: owner.id, email: owner.email, role: 'owner', organization: org } });
      }
    }

    res.status(401).json({ error: 'Invalid email or password' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
