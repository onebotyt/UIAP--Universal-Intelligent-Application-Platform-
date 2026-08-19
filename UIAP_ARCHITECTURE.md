# UIAP — Architecture Reference
> This document is the technical architecture bible. Read this before touching any UIAP code.

---

## The Key Rule (from new.md)

> **Share the application runtime and modules; isolate the organization's data and database.**

---

## Cross-Platform Strategy: How One Codebase Runs Everywhere

The secret is the **layered architecture**. Each layer handles exactly one concern:

```
┌─────────────────────────────────────────────────┐
│  LAYER 4: Platform Packaging                    │
│  Electron (Win/Mac/Linux) | Docker (VPS/Cloud)  │
│  THIS IS THE ONLY LAYER THAT DIFFERS PER OS     │
├─────────────────────────────────────────────────┤
│  LAYER 3: UIAP Edge Server                      │
│  Node.js + Express + TypeScript                 │
│  IDENTICAL on all platforms                     │
├─────────────────────────────────────────────────┤
│  LAYER 2: UIAP Core                             │
│  Auth, Events, Module Manager, Device Registry  │
│  IDENTICAL on all platforms                     │
├─────────────────────────────────────────────────┤
│  LAYER 1: Modules                               │
│  uiap.attendance, uiap.biometric, etc.          │
│  IDENTICAL on all platforms — ZERO CHANGES      │
└─────────────────────────────────────────────────┘
```

### What changes per platform:
- **Windows**: Electron builds `.exe` installer (NSIS), bundled PostgreSQL as Windows Service
- **Mac**: Electron builds `.dmg`, bundled PostgreSQL as launchd daemon
- **Linux**: Electron builds `.AppImage`/`.deb`/`.rpm`, bundled PostgreSQL via systemd
- **VPS (Linux)**: Just `docker-compose up` — no Electron, no bundled PG
- **Cloud hosting**: Docker container per org — no Electron, cloud PostgreSQL

### What NEVER changes:
- All TypeScript source in `edge-api/`, `core/`, `module-sdk/`
- All React source in `edge-web/`
- All module code in `modules/`

---

## Database Strategy

### Development
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/uiap_dev
```
Real local PostgreSQL. No PGLite.

### Local Plan (Production)
```
DATABASE_URL=postgresql://postgres:uiap@localhost:5432/uiap
```
PostgreSQL bundled by the Electron installer (embedded-postgres).

### Cloud Plan (Production)
```
DATABASE_URL=postgresql://uiap:secret@pg.hosting.uiap.cloud:5432/org_abc
```
Separate database per org on the developer's PostgreSQL server.

### Multi-tenant Isolation Rule
One physical PostgreSQL server can host multiple org databases:
```
PostgreSQL Server
├── org_abc       ← Org A's entire UIAP database
├── org_xyz       ← Org B's entire UIAP database
└── org_demo      ← Demo org's database
```
Each UIAP Edge instance (for cloud-hosted orgs) connects to only its own DB.

---

## Module Contract

Modules ONLY interact with:
1. `@uiap/module-sdk` — the TypeScript SDK (context, events, DB query)
2. Core Events — fire and listen, never touch another module's tables directly
3. Their own DB tables (prefixed with their slug, e.g. `att_records`, `bio_templates`)

```typescript
// module manifest.json (Phase 1 + future fields)
{
  "slug": "uiap.attendance",
  "version": "1.0.0",
  "displayName": "Attendance",
  "coreCompatRange": ">=0.1.0 <1.0.0",
  "sync": {
    "strategy": "bidirectional",        // Phase 4: hybrid sync
    "tables": ["att_records"],
    "conflict": "latest_wins"
  },
  "runLocation": "both"                 // Phase 4: "local_only"|"cloud_only"|"both"
}
```

---

## Event Flow: Biometric Scan → Attendance Record

```
[ESP32 Hardware]
    │  POST /api/device/event
    ▼
[ESP32 Driver Module]
    fires: Core Event "biometric.scan.matched"
    payload: { device_id, slot_id, timestamp, event_id }
    │
    ▼
[Biometric Verification Module]
    listens: "biometric.scan.matched"
    maps: device_id + slot_id → student_id (from bio_templates table)
    fires: Core Event "attendance.checkin.request"
    payload: { student_id, device_id, timestamp, event_id }
    │
    ▼
[Attendance Module]
    listens: "attendance.checkin.request"
    applies: duplicate check, lateness rule
    writes: att_records row to its own DB table
    fires: Core Event "attendance.checkin.processed"
    payload: { student_id, status, timestamp }
    │
    ▼
[Reports Module] (optional listener)
    listens: "attendance.checkin.processed"
    updates: realtime dashboard stats
```

**Rule**: No module ever writes to another module's database tables. Only events.

---

## Cloud ↔ Edge Protocol

### Edge Registration (once on first boot)
```
Edge → POST https://cloud.uiap.dev/edge/v1/register
Body: { install_key: "...", core_version: "0.1.0", org_id: "uuid" }
Response: { installation_id: "uuid", org_name: "Demo College" }
```

### Entitlement Poll (every 30 minutes)
```
Edge → GET https://cloud.uiap.dev/edge/v1/entitlements
Headers: Authorization: Bearer <install_key>
Response: [
  { module_slug: "uiap.attendance", status: "active", expires_at: null },
  { module_slug: "uiap.reports", status: "active", expires_at: "2027-01-01" }
]
```

### Module Package Download (when new license found)
```
Edge → GET https://cloud.uiap.dev/edge/v1/packages/uiap.attendance/1.0.0
Headers: Authorization: Bearer <install_key>
Response: Binary ZIP stream
Headers: X-Package-Hash: sha256-hex
         X-Package-Signature: ed25519-base64
```
Edge verifies signature before installing.

---

## Hybrid Sync Protocol (Phase 4)

```
Local Edge → POST https://org-abc.uiap.cloud/sync/v1/push
Body: { module: "uiap.attendance", since: "2026-08-19T00:00:00Z", rows: [...] }

Cloud Instance → POST http://local-edge:3000/sync/v1/push  (via VPN or tunnel)
Body: { module: "uiap.attendance", since: "2026-08-19T00:00:00Z", rows: [...] }
```

Per-module `sync.strategy` in `manifest.json` controls direction and conflict resolution.
