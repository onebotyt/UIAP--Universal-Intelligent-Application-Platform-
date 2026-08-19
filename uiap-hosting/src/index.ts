import express from 'express';
import cors from 'cors';
import { runWithTenant, initDatabase, query } from '@uiap/core';
import { createApp } from '../../uiap-workspace/apps/edge-api/dist/app.js';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const PORT = process.env.PORT || 5000;
// We need a direct connection to the master postgres to look up tenants
const masterPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const app = express();
app.use(cors());
app.use(express.json());

// Expose a public provisioning endpoint (Called by UIAP Cloud when a school buys a plan)
app.post('/hosting/orgs/:id/provision', async (req, res) => {
  const orgId = req.params.id;
  const dbName = `uiap_tenant_${orgId.replace(/-/g, '_')}`;
  
  try {
    // 1. Create isolated database
    // We cannot use prepared statements for CREATE DATABASE
    const client = await masterPool.connect();
    try {
      const existsResult = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`);
      if (existsResult.rowCount === 0) {
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`[Hosting] Provisioned new database: ${dbName}`);
      }
    } finally {
      client.release();
    }

    // 2. We would run migrations here by connecting to the new DB.
    const masterUrl = process.env.DATABASE_URL!;
    const tenantDbUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1) + dbName;
    
    // We import runner dynamically so it doesn't block startup
    const { runner } = await import('node-pg-migrate');
    const path = await import('path');
    
    const tenantPool = new Pool({ connectionString: tenantDbUrl });
    try {
      const coreMigrationsDir = path.join(process.cwd(), '../uiap-workspace/packages/core/src/db/migrations');
      await runner({
        dbClient: tenantPool as any,
        dir: coreMigrationsDir,
        direction: 'up',
        migrationsTable: 'pgmigrations',
        ignorePattern: '.*\\.d\\.ts|.*\\.map',
        log: (msg) => console.log(`[Hosting] ${dbName} Migration:`, msg),
      });
      console.log(`[Hosting] Migrated new database: ${dbName}`);
    } finally {
      await tenantPool.end();
    }
    
    res.json({ success: true, dbName });
  } catch (err: any) {
    console.error('[Hosting] Provisioning failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create the Edge API app instance (doesn't start server)
// We will mount this under the tenant context!
const edgeApp = createApp({ isReady: () => true });

// Tenant Routing Middleware
app.use(async (req, res, next) => {
  // Determine tenant from subdomain (e.g., org-a.uiap.cloud -> org-a)
  // For local testing, we'll allow passing ?tenant=org_a or header X-Tenant-ID
  const tenantId = req.headers['x-tenant-id'] as string || req.query.tenant as string;
  
  if (!tenantId) {
    // If no tenant context, it might be a generic health check or the root domain
    if (req.path === '/' || req.path.startsWith('/hosting')) {
      return next();
    }
    return res.status(400).json({ error: 'Tenant context required. Use X-Tenant-ID header.' });
  }

  const dbName = `uiap_tenant_${tenantId.replace(/-/g, '_')}`;
  // Construct tenant DB URL based on master URL (replace the db name at the end)
  const masterUrl = process.env.DATABASE_URL!;
  const tenantDbUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1) + dbName;

  // Run the rest of the request within this tenant's isolated context
  runWithTenant({ id: tenantId, databaseUrl: tenantDbUrl }, () => {
    // We could add a check here to ensure the module is enabled in this tenant's DB
    // But for now, just route to the Edge App
    edgeApp(req, res, next);
  });
});

app.listen(PORT, () => {
  console.log(`[UIAP Hosting Engine] Multi-tenant router listening on port ${PORT}`);
  // Initialize default DB config so that fallback doesn't crash
  initDatabase(process.env as any);
});
