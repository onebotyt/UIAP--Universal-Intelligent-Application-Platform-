/**
 * Platform Proof Demo Module
 *
 * Gold-standard reference module demonstrating the full UIAP Module SDK contract.
 *
 * This module proves:
 *   - Manifest with all required fields
 *   - Server entry point with activate/deactivate lifecycle
 *   - API router registration with RBAC
 *   - Event publish/subscribe through the SDK
 *   - Schema-isolated database access
 *   - Prefixed logging
 *   - Module context usage (auth, rbac, db, events, logger, config, organization)
 *   - UI served from web/ directory
 *
 * Modules must ONLY import from '@uiap/module-sdk'.
 * Modules must NEVER import from '@uiap/core' or Core internal files.
 */

import type { UIAPModule, ModuleContext, ModuleManifest, UIAPEvent } from '@uiap/module-sdk';

import { Router } from 'express';

// ── Manifest ────────────────────────────────────────────────────────────────

export const manifest: ModuleManifest = {
  id: 'uiap.platform-proof-demo',
  name: 'Platform Proof Demo',
  version: '0.1.0',
  description: 'A tiny independent module proving the SDK/event boundary without Core changes.',
  platform: 'UIAP',
  coreVersion: '>=0.1.0',
  server: {
    entry: 'dist/index.js',
  },
  permissions: [
    { module: 'proof-demo', action: 'view', description: 'View proof demo data' },
    { module: 'proof-demo', action: 'trigger', description: 'Trigger proof events' },
  ],
  dependencies: {},
  ui: {
    entry: 'web/index.html',
    navigation: [
      {
        id: 'proof-demo',
        label: 'Proof Demo',
        icon: '🧪',
      },
    ],
  },
};

// ── Module Class ────────────────────────────────────────────────────────────

export default class PlatformProofDemoModule implements UIAPModule {
  public manifest = manifest;

  activate(context: ModuleContext): () => void {
    // ── Log activation using the SDK logger ──
    context.logger.info('Activating...');
    context.logger.info(`Core version: ${context.config.coreVersion}`);
    context.logger.info(`Organization: ${context.organization.name} (${context.organization.id})`);

    // ── Register API Router ──
    const router = Router();

    // Public endpoint — no RBAC required
    router.get('/hello', (_req, res) => {
      res.json({
        message: 'Hello from Platform Proof Demo module API!',
        moduleId: context.module.id,
        version: context.module.version,
      });
    });

    // Protected endpoint — requires 'proof-demo.trigger' permission
    router.post('/trigger', context.rbac.require('proof-demo', 'trigger'), async (req, res) => {
      const user = await context.auth.getUserFromRequest(req);
      const requestId = crypto.randomUUID();

      // Publish an event through the SDK
      await context.events.publish({
        id: requestId,
        type: 'platform.proof_requested',
        occurredAt: Date.now(),
        payload: {
          requestId,
          triggeredBy: user?.username || 'unknown',
        },
      });

      context.logger.info(`Proof event triggered by ${user?.username || 'unknown'}: ${requestId}`);

      res.json({
        status: 'ok',
        requestId,
        triggeredBy: user?.username || 'unknown',
      });
    });

    // Database-backed endpoint — demonstrates schema-isolated DB access
    router.get('/events', context.rbac.require('proof-demo', 'view'), async (_req, res) => {
      try {
        const db = context.db.getBuilder();
        const data = await db('proof_events')
          .select('id', 'request_id', 'created_at')
          .orderBy('created_at', 'desc')
          .limit(20);
        res.json({ status: 'ok', data });
      } catch {
        // Table may not exist yet if migrations haven't run
        res.json({ status: 'ok', data: [], note: 'No proof_events table yet' });
      }
    });

    context.registerApiRouter(router);

    // ── Subscribe to events ──
    const unsubscribe = context.events.subscribe(
      'platform.proof_requested',
      async (event: UIAPEvent) => {
        const requestPayload = event.payload as { requestId: string; triggeredBy?: string };

        context.logger.info(`Received proof request: ${requestPayload.requestId}`);

        // Record to database (if table exists)
        try {
          const db = context.db.getBuilder();
          await db('proof_events').insert({ request_id: requestPayload.requestId });
        } catch {
          // Table may not exist if migrations haven't run
          context.logger.debug('proof_events table not available, skipping DB insert');
        }

        // Publish a completed event
        await context.events.publish({
          id: crypto.randomUUID(),
          type: 'platform.proof_completed',
          occurredAt: Date.now(),
          payload: {
            responderId: context.module.id,
            requestId: requestPayload?.requestId,
          },
        });
      },
    );

    context.logger.info('Activated successfully');

    // ── Return cleanup function (deactivate) ──
    return () => {
      context.logger.info('Deactivating...');
      unsubscribe();
      context.logger.info('Deactivated');
    };
  }
}
