const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { randomUUID } = require('crypto');
const db = require('../db/pool');
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
    const existing = await db('org_owners').select('id').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate UUIDs in Node so we have them immediately (MySQL doesn't support RETURNING UUIDs)
    const ownerId = randomUUID();
    const orgId = randomUUID();

    // Use transaction to create both owner and org
    await db.transaction(async (trx) => {
      await trx('org_owners').insert({
        id: ownerId,
        email,
        password_hash: passwordHash
      });

      await trx('organizations').insert({
        id: orgId,
        owner_id: ownerId,
        name: orgName,
        status: 'pending_setup'
      });
    });

    // Automatically log them in after registration
    const token = jwt.sign(
      { sub: ownerId, email, role: 'owner' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.status(201).json({ token, user: { id: ownerId, email, role: 'owner' } });
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
    const admin = await db('admin_users').select('id', 'email', 'password_hash').where({ email }).first();
    if (admin) {
      const match = await bcrypt.compare(password, admin.password_hash);
      if (match) {
        const token = jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
        await logAction(admin.email, 'auth.login', admin.email);
        return res.json({ token, user: { id: admin.id, email: admin.email, role: 'admin' } });
      }
    }

    // 2. Check if user is an Org Owner
    const owner = await db('org_owners').select('id', 'email', 'password_hash').where({ email }).first();
    if (owner) {
      const match = await bcrypt.compare(password, owner.password_hash);
      if (match) {
        // Fetch org details for response
        const org = await db('organizations').select('id', 'name', 'plan', 'status').where({ owner_id: owner.id }).first();

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
