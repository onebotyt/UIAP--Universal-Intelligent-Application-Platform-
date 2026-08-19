# UIAP v0.1 Completion Roadmap

UIAP means **Universal Intelligent Application Platform**. College Biometric Attendance is the first demonstration bundle, not the platform's definition.

## Non-negotiable rules

- UIAP Edge is Windows-only and local-first. Daily work must function without internet.
- Organization student, biometric mapping, attendance, device, and audit data stay in local PostgreSQL.
- The developer service may hold only organization admin/contact, installation ID, enabled modules, license status, and updates—never student or attendance data.
- Each module owns its own tables and migrations. Modules communicate through Core events, never by writing another module's tables.
- The R307 match result is a device sensor slot. Only `device ID + sensor slot ID` maps to a student.
- The ESP32/R307 driver and firmware are final integration work, after the software flow is proven with simulated events.
- Every task runs typecheck, lint, format check, tests, and build before review.

## Delivery sequence

| Task range   | Deliverable                                                                                                                | Required proof before moving on                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| UIAP-001–005 | Workspace, API foundations, EventBus, SDK proof module                                                                     | Completed                                                            |
| UIAP-006     | PostgreSQL 17 setup, migration runner, Core persistence boundary                                                           | Real local migration up/down succeeds                                |
| UIAP-007     | Core identity: users, password hashing, sessions, RBAC permissions, audit foundation                                       | Protected API and audit tests pass                                   |
| UIAP-008     | Core module manifest schema, compatibility/dependency validation, lifecycle contracts                                      | Invalid manifests rejected; valid module contract accepted           |
| UIAP-009     | Module manager: discovery, install staging, enable/disable, migrations, event/UI registration                              | Proof module enable/disable works without Core changes               |
| UIAP-010     | Signed ZIP package verification and local license verification/update metadata boundary                                    | Tampered package rejected; valid signed package accepted             |
| UIAP-011     | Edge React/PWA shell: login, navigation, role-aware menus, module mount points, branding                                   | Offline shell and protected navigation work locally                  |
| UIAP-012     | Generic device registry/API: enrollment of device identity, secret rotation, status, heartbeat, device event deduplication | Simulated authenticated device event is accepted once only           |
| UIAP-013     | College Management module: departments, classes, students, teachers                                                        | Module owns migrations/UI/API and passes CRUD/RBAC tests             |
| UIAP-014     | Biometric Verification module: logical enrollment records and `device + slot -> student` mapping                           | Slot alone cannot resolve a student; mapping tests pass              |
| UIAP-015     | Attendance module: check-in/out, late rules, duplicates, manual corrections, audit events                                  | Simulated verification produces one correct attendance result        |
| UIAP-016     | Reports module: daily, student-wise, department-wise reports                                                               | Report totals match persisted attendance fixtures                    |
| UIAP-017     | Software demonstration integration: College → Biometric → Attendance → Reports                                             | End-to-end simulated-device test works offline                       |
| UIAP-018     | ESP32/R307 Edge driver module: device commands, enrollment response, match/heartbeat translation                           | Driver emits the same standard verification event as the simulator   |
| UIAP-019     | ESP32/R307 firmware: Wi-Fi, device authentication, R307 UART, event ID/counter, enrollment commands                        | Firmware communicates with a test device and retries safely          |
| UIAP-020     | Real hardware integration and acceptance                                                                                   | Finger touch → R307 match → ESP32 → Edge → attendance → report works |
| UIAP-021     | Release hardening: backup/restore, offline checks, security review, deployment guide, final demo script                    | Clean Windows installation and acceptance checklist pass             |

## Task detail and boundaries

### UIAP-006 — PostgreSQL foundation

Install PostgreSQL 17 on the organization/development Windows PC. Add a local connection convention, `node-pg-migrate`, Core database migration tracking, transaction helper, and the Core-owned tables needed later (users/roles/permissions, module records, device records, audit records, configurations). No business-module tables yet. Never hard-code credentials or commit `.env`.

### UIAP-007 — Identity, RBAC, and audit

Implement Core users/roles/permissions, password hashing, session/token lifecycle, authorization middleware, login/logout, and append-only audit records. Audit changes through a Core interface, not direct inserts by modules. Define initial organization administrator bootstrap without a default production password.

### UIAP-008–010 — Module platform

Define the module manifest fields (identity, version, platform compatibility, dependencies, permissions, routes, menus, migrations, entry points). Validate before install. The manager stages installation, verifies signed ZIP packages, validates dependencies/compatibility, runs only the module's migrations transactionally where possible, enables/disables safely, and logs every lifecycle action. License verification must fail safely offline according to a locally cached valid license policy; no student data leaves Edge.

### UIAP-011–012 — Shell and generic devices

The PWA shell supplies authentication, branding, menus, notifications, settings, module route mounting, and offline assets. The generic device registry owns device identity, credential/secret lifecycle, enabled state, heartbeat, status, timestamps, and idempotent event IDs. It does not know R307 protocol details.

### UIAP-013–016 — College demonstration modules

College Management owns students, teachers, departments, and classes. Biometric owns enrollment records and mapping. Attendance owns attendance rules and records. Reports reads through module APIs/events or approved read models—not direct table edits. Define each module's permissions, migrations, UI pages, API endpoints, events, validation, and audits before coding.

### UIAP-017–020 — Software-first to hardware

First send a simulated authenticated verification event containing `eventId`, `deviceId`, `slotId`, `occurredAt`, and match metadata. Biometric maps it to a student and emits a verified-person event; Attendance applies rules and persists the result. Only then add the Edge driver and ESP32 firmware. R307 performs local 1:N matching; the driver only translates hardware data into standard UIAP events and must not contain student or attendance business logic.

### UIAP-021 — Ready-to-demonstrate release

Verify a fresh offline Windows Edge installation, PostgreSQL backup/restore, role separation, audit evidence, invalid package/device-event rejection, duplicate protection, module disable/enable, update/license behavior, and the complete fingerprint flow. Deliver installation, operations, troubleshooting, API, module-author, and hardware setup documentation.

## Required user/environment actions

Before UIAP-006 can be fully verified, install PostgreSQL 17 locally and create a development database/user. Antigravity must document the exact safe commands and never place real credentials in Git. Hardware tasks also require the actual ESP32, R307, wiring, and a local-network test setup.
