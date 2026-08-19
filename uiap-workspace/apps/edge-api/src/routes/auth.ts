import { Router, Request } from 'express';
import { z } from 'zod';
import {
  getUserByUsername,
  getUserById,
  verifyPassword,
  signToken,
  logAuthAction,
  getUserPermissions,
  getBuilder,
} from '@uiap/core';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rate-limiter.js';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const verify2faSchema = z.object({
  token: z.string().min(1),
  code: z.string().min(6).max(6),
});

authRouter.post('/login', loginLimiter, async (req: Request, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res
        .status(400)
        .json({ error: { message: 'Invalid payload', code: 'BAD_REQUEST', requestId: req.id } });
      return;
    }

    const { username, password } = parseResult.data;
    const cloudApiUrl = process.env.CLOUD_API_URL || 'http://localhost:4000';
    let cloudUser: any = null;
    let cloudError = false;

    // 1. Try Cloud Authentication First
    try {
      const cloudRes = await fetch(`${cloudApiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      if (cloudRes.ok) {
        const data = await cloudRes.json() as any;
        cloudUser = data.user;
      }
    } catch (e) {
      console.warn('[auth] Cloud API unreachable, falling back to local auth.');
      cloudError = true;
    }

    let user = await getUserByUsername(username);

    // 2. Sync Cloud User to Local DB
    if (cloudUser && cloudUser.role === 'owner') {
      if (!user) {
        // Sync owner to local DB so offline mode works later
        const knex = getBuilder();
        const hash = await bcrypt.hash(password, 10);
        await knex('users').withSchema('core').insert({
          username: username,
          password_hash: hash,
          is_active: true
        });
        user = await getUserByUsername(username);
      }
    }

    // 3. Evaluate Credentials
    if (!cloudUser) {
      // If cloud didn't auth them, fallback to local DB entirely
      if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
        await logAuthAction('login_failed', user?.id, req.ip, { username });
        res.status(401).json({
          error: { message: 'Invalid credentials', code: 'UNAUTHORIZED', requestId: req.id },
        });
        return;
      }
    }

    if (!user) {
       res.status(401).json({ error: { message: 'User not synced locally properly', code: 'UNAUTHORIZED' }});
       return;
    }

    if (user.requires_2fa && user.totp_secret) {
      const token2fa = signToken(
        { userId: user.id, type: '2fa_pending' },
        process.env.JWT_SECRET || 'local_dev_secret_uiap_2026',
        '5m'
      );
      await logAuthAction('2fa_prompted', user.id, req.ip);
      res.json({ status: 'ok', requires2FA: true, token2fa });
      return;
    }

    const token = signToken(
      { userId: user.id },
      process.env.JWT_SECRET || 'local_dev_secret_uiap_2026',
      process.env.JWT_EXPIRES_IN || '8h',
    );

    await logAuthAction('login_success', user.id, req.ip);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({ status: 'ok', user: { id: user.id, username: user.username } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/2fa/verify', loginLimiter, async (req: Request, res, next) => {
  try {
    const parseResult = verify2faSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: { message: 'Invalid payload', code: 'BAD_REQUEST' } });
      return;
    }

    const { token, code } = parseResult.data;
    
    // Verify the temporary 2FA token
    const secret = process.env.JWT_SECRET || 'local_dev_secret_uiap_2026';
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      res.status(401).json({ error: { message: 'Invalid or expired 2FA token', code: 'UNAUTHORIZED' } });
      return;
    }

    if (decoded.type !== '2fa_pending' || !decoded.userId) {
      res.status(401).json({ error: { message: 'Invalid 2FA token type', code: 'UNAUTHORIZED' } });
      return;
    }

    const user = await getUserById(decoded.userId);
    if (!user || !user.is_active || !user.totp_secret) {
      res.status(401).json({ error: { message: 'User invalid for 2FA', code: 'UNAUTHORIZED' } });
      return;
    }

    // Verify TOTP code
    const isValid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code,
      window: 1 // allow 1 step before/after (30s)
    });
    if (!isValid) {
      await logAuthAction('2fa_failed', user.id, req.ip);
      res.status(401).json({ error: { message: 'Invalid 2FA code', code: 'UNAUTHORIZED' } });
      return;
    }

    // Success - issue real token
    const sessionToken = signToken(
      { userId: user.id },
      secret,
      process.env.JWT_EXPIRES_IN || '8h',
    );

    await logAuthAction('login_success', user.id, req.ip);

    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({ status: 'ok', user: { id: user.id, username: user.username } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', requireAuth, async (req: Request, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (authReq.user) {
      await logAuthAction('logout', authReq.user.id, req.ip);
    }
    res.clearCookie('token');
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req: Request, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) return;
    const [dbUser, permissions] = await Promise.all([
      getUserById(authReq.user.id),
      getUserPermissions(authReq.user.id),
    ]);
    res.json({
      status: 'ok',
      user: {
        id: authReq.user.id,
        username: dbUser?.username ?? 'unknown',
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Test route exclusively for verifying RBAC middleware
authRouter.get(
  '/test-permission',
  requireAuth,
  requirePermission('test_module', 'test_action'),
  (req, res) => {
    res.json({ status: 'ok', message: 'Permission granted' });
  },
);
