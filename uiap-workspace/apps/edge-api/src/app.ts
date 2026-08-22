/**
 * UIAP Edge API — Express application factory
 *
 * Creates and configures the Express app without starting a listener.
 * This allows the app to be imported by tests without binding a port.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { CORE_VERSION, PLATFORM_NAME } from '@uiap/core';
import { requestIdMiddleware } from './middleware/requestId.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { rolesRouter } from './routes/roles.js';
import { permissionsRouter } from './routes/permissions.js';
import { modulesRouter } from './routes/modules.js';
import { backupsRouter } from './routes/backups.js';
import { devicesAdminRouter } from './routes/devices.js';
import { deviceApiRouter } from './routes/device-api.js';
import { eventsRouter } from './routes/events.js';
import { setupRouter } from './routes/setup.js';
import { dashboardRouter } from './routes/dashboard.js';
import { systemRouter } from './routes/system.js';
import { cloudRouter } from './routes/cloud.js';
import { runtime } from '@uiap/core';
import { apiLimiter, loginLimiter } from './middleware/rate-limiter.js';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULES_DIR = process.env.UIAP_MODULES_DIR || path.join(process.cwd(), 'modules_data');

export interface AppOptions {
  isReady?: () => boolean;
}

export function createApp(options?: AppOptions): express.Express {
  const app = express();

  // Add Request ID middleware early
  app.use(requestIdMiddleware);

  // Parse cookies and JSON body
  app.use(express.json());
  app.use(cookieParser());

  // Apply general rate limiting to all /api routes
  app.use('/api/', apiLimiter);

  /** Liveness probe — process is running */
  app.get('/api/health/live', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
      const { query } = await import('@uiap/core');
      await query('SELECT 1');
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error';
    }

    const memoryUsage = process.memoryUsage();

    res.json({
      status: 'ok',
      platform: PLATFORM_NAME,
      version: CORE_VERSION,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      database: dbStatus,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      },
    });
  });

  /** Legacy health check — aliased to live */
  app.get('/api/health', (req, res) => {
    res.redirect('/api/health/live');
  });

  /** Readiness probe — process has finished booting and is connected to DB */
  app.get('/api/health/ready', (req, res) => {
    const ready = options?.isReady ? options.isReady() : true;
    if (!ready) {
      return res.status(503).json({
        status: 'error',
        message: 'Service is starting up or shutting down',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      });
    }

    res.json({
      status: 'ok',
      platform: PLATFORM_NAME,
      version: CORE_VERSION,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  });

  /** Root redirect to health/live for quick verification (if not serving UI) */
  app.get('/api', (req, res) => {
    res.json({
      message: `${PLATFORM_NAME} Edge API is running.`,
      health: '/api/health/live',
      requestId: req.id,
    });
  });

  // Core module routers
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/permissions', permissionsRouter);
  app.use('/api/modules', modulesRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/devices', devicesAdminRouter);
  app.use('/api/device', deviceApiRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/setup', setupRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/cloud', cloudRouter);

  // Dynamic module APIs
  app.use('/api/m/:moduleId', (req, res, next) => {
    // We don't want the UI static files route to fall into the router
    if (req.path.startsWith('/ui/')) {
      return next();
    }

    const router = runtime.apiRouters.get(req.params.moduleId);
    if (router) {
      return router(req, res, next);
    }
    next();
  });

  // Dynamic module UI static serving
  app.use('/api/m/:moduleId/ui', (req, res, next) => {
    const moduleId = req.params.moduleId;
    // Ensure module is active before serving UI files
    if (!runtime.isActive(moduleId)) {
      return res.status(404).json({ error: 'Module not active or not found' });
    }
    express.static(
      path.join(MODULES_DIR, 'installed', moduleId, runtime.getActiveVersion(moduleId)!, 'web'),
    )(req, res, next);
  });

  // Serve Core Edge Web frontend (Static Assets)
  // This paths assumes structure: apps/edge-api/dist/app.js and apps/edge-web/dist
  const webDistPath = path.join(__dirname, '../../edge-web/dist');
  app.use(express.static(webDistPath));

  // Serve local uploads for profile pictures etc.
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Handle SPA fallback for non-API routes
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next(); // Let it fall through to the API 404 handler
    }
    res.sendFile(path.join(webDistPath, 'index.html'), (err) => {
      if (err) {
        next(); // Fallback to 404 if index.html is missing
      }
    });
  });

  // Handle 404 (Not Found) for API or missing assets
  app.use(notFoundHandler);

  // Handle 500 (Internal Server Error)
  app.use(globalErrorHandler);

  return app;
}
