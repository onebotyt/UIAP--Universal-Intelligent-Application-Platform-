# UIAP Architecture Decisions

## ADR-008 — UIAP implementation stack

- Status: Accepted
- Decision: UIAP Edge uses Node.js 24 LTS, npm workspaces, Express with TypeScript, React + TypeScript + Vite for the Web/PWA, and PostgreSQL 17 accessed with `pg`.
- Reason: It matches the approved local-first Windows deployment and provides one typed language across Edge API, Web/PWA, Core, and Module SDK.

## ADR-009 — Quality and database tooling

- Status: Accepted
- Decision: Use `node-pg-migrate` for migrations, ESLint 9 and Prettier for style, TypeScript compiler checks, and Vitest for automated tests.
- Reason: The tools provide repeatable validation before review without adding an ORM or custom tooling.

## ADR-007 — Platform identity

- Status: Accepted
- Decision: UIAP means **Universal Intelligent Application Platform**. UIAP is a reusable local-first platform for installable applications and modules; it is not an attendance-only platform.
- Reason: College Biometric Attendance is the v0.1 demonstration bundle. The Core must remain general and reusable for future modules.

## ADR-004 — UIAP Edge backend foundation

- Status: Accepted
- Decision: UIAP Edge backend services will use Node.js with Express.
- Reason: Chosen for the v0.1 local Windows deployment.

## ADR-005 — UIAP Edge web application

- Status: Accepted
- Decision: UIAP Edge uses a React + TypeScript Web/PWA shell.
- Reason: The Core provides a common authenticated shell, navigation, settings, notifications, and module UI registration.

## ADR-006 — Hardware delivery order

- Status: Accepted
- Decision: The ESP32/R307 driver and firmware are the final integration stage. Before then, Biometric and Attendance use authenticated simulated verification events to prove the complete software flow.
- Reason: Hardware delays must not block Core and business-module development.

## ADR-001 — Local-first data boundary

- Status: Accepted
- Decision: UIAP Edge stores organization student, biometric mapping, and attendance data in organization-local PostgreSQL. The developer server stores only organization admin/contact, installation ID, enabled modules, license status, and updates.
- Reason: Daily operations must continue without internet and student data must remain local.

## ADR-002 — Module data ownership and communication

- Status: Accepted
- Decision: Each module owns its tables and migrations. Modules communicate through Core events, not by directly changing another module's tables.
- Reason: Keeps UIAP Core reusable and modules independently maintainable.

## ADR-003 — Biometric event identity

- Status: Accepted
- Decision: The attendance mapping key is device ID plus R307 sensor slot ID. A slot number by itself is never a student identity.
- Reason: Slots are allocated per device or department.
