-- UIAP Cloud schema (Developer 2)
-- Run via: npm run migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- Dashboard admin users (humans who log into the Developer Dashboard)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization owners (users who register via web or app)
CREATE TABLE IF NOT EXISTS org_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organizations (customers running a UIAP Edge)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES org_owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'local',
  status TEXT NOT NULL DEFAULT 'pending_setup', -- active, suspended, pending_setup, pending_activation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing plans for organization setup
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions for pending payments
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  type TEXT NOT NULL, -- 'setup' or 'module'
  target_id UUID, -- For 'module' type, this is module_id
  amount_usd NUMERIC(10, 2) NOT NULL,
  transaction_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Edge installations belonging to an organization
CREATE TABLE IF NOT EXISTS installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  install_key_hash TEXT NOT NULL, -- store a hash, never the raw key
  core_version TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module "types" (e.g. uiap.attendance)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  owner_admin_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Specific versions/releases of a module
CREATE TABLE IF NOT EXISTS module_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  version TEXT NOT NULL,               -- e.g. "1.0.0"
  changelog TEXT,
  core_compat_range TEXT,              -- e.g. ">=0.1.0 <1.0.0"
  package_path TEXT,                   -- legacy, kept for compatibility if needed
  package_data BYTEA,                  -- ZIP file binary
  package_hash TEXT,                   -- SHA-256 hex digest, filled in on upload
  signature TEXT,                      -- Ed25519 signature, filled in on publish (step 2)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'beta', 'published', 'deprecated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, version)
);

-- Licenses: which orgs are allowed to use which modules
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (organization_id, module_id)
);

-- Beta access grants (separate from licensing — lets an org see pre-release versions)
CREATE TABLE IF NOT EXISTS beta_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, module_id)
);

-- Audit log for dashboard actions
CREATE TABLE IF NOT EXISTS audit_log_cloud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,        -- admin email or "system"
  action TEXT NOT NULL,       -- e.g. "module.create", "license.revoke"
  target TEXT,                -- e.g. module slug or org id
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_versions_module_id ON module_versions(module_id);
CREATE INDEX IF NOT EXISTS idx_licenses_org_id ON licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_installations_org_id ON installations(organization_id);
