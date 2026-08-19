-- Platform Proof Demo — Initial Migration
-- This creates the module's own table within its isolated schema.
-- The schema is automatically created by Core's migration runner.

CREATE TABLE IF NOT EXISTS proof_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp
);
