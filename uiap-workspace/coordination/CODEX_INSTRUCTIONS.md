# Codex Guidance for Antigravity

## Complete roadmap

Read `docs/PROJECT_ROADMAP.md` before each task. It contains the approved UIAP v0.1 delivery order, architecture guardrails, exact module boundaries, hardware-last policy, and required environment actions.

Codex assigns and reviews one bounded task at a time. Antigravity must not start a future roadmap task until the current task is `DONE`, even when its remaining details are known.

**Official name:** UIAP — **Universal Intelligent Application Platform**.

## Current instruction

## UIAP-006 — Establish PostgreSQL and Core persistence boundary

- State: READY
- Owner: Antigravity + User
- Objective: Prepare the local PostgreSQL 17 development foundation and reusable Core persistence/migration boundary required by every future Core and module feature.
- Required user prerequisite: PostgreSQL 17 must be installed locally on Windows and a local development database/user created. Do not guess or commit real credentials. If it is absent, document the exact safe installation/database setup steps and mark the database-execution portion `BLOCKED`; complete only checks that do not need the server.
- Allowed paths: `infrastructure/`, `packages/core/`, root workspace configuration/dependencies, `.env.example`, `docs/`, focused tests, and coordination status/task-board updates.
- Do not change: `apps/edge-web/`, `modules/`, `firmware/`, device logic, authentication routes, attendance/biometric/college/reports features, or module manager/package-signing features. Do not create any student, attendance, biometric, or module-owned tables.
- Required work:
  1. Add `pg` and `node-pg-migrate` using the approved npm workspace setup; define root migration commands that can target the Core migrations directory.
  2. Add typed database configuration that obtains a database URL only from environment configuration; never log the URL/password.
  3. Implement a reusable Core database pool/transaction boundary that starts no connection until used and can be safely closed for tests/shutdown.
  4. Create Core-only initial migrations for migration tracking plus minimal future-owned foundations: configuration namespace, module-install records, device registry records, and audit-log records. Do not add users/RBAC yet; that is UIAP-007.
  5. Ensure migration names and schemas establish ownership: Core tables use a clear Core namespace; future modules will own their own migrations/tables.
  6. Write PostgreSQL 17 Windows setup, local database creation, `.env` setup, migration commands, backup warning, and troubleshooting documentation. Use safe placeholders only.
  7. Add tests for database configuration validation and migration discovery/command configuration. Where PostgreSQL exists, run migrations against a disposable local test database and document exact results.
- Acceptance criteria:
  - No connection occurs on module import.
  - No real credential is committed or logged.
  - Core migration command can be run repeatedly without corrupting state.
  - With PostgreSQL installed, migration up/down/verification succeeds against a disposable local database.
  - All root quality commands pass.
- Required evidence: Record prerequisites found, commands run, exact pass/fail output, database name pattern (not password), and any blocker in `ANTIGRAVITY_STATUS.md`. Mark `REVIEW` only when all possible work and checks are complete.

## Future work

Do not invent or begin future work from this section. The task-by-task plan is `docs/PROJECT_ROADMAP.md`; Codex will activate each task after reviewing the prior one.
