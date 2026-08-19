# UIAP — Master Plan (All Phases)
> Last updated: 2026-08-19  
> This is the single source of truth for the UIAP roadmap. Update this file as decisions are made.

---

## Vision

UIAP (Unified Identity and Attendance Platform) is a **modular, multi-tenant platform** with three deployment modes:

| Plan | How it runs | Who accesses it |
|---|---|---|
| **Local** | On org's own Windows/Mac/Linux server | Staff via LAN |
| **Cloud** | Hosted on UIAP developer's server (one instance per org) | Staff anywhere via browser |
| **Hybrid** | Local app + Cloud instance, both in sync | Local hardware (biometric) + Remote access |

### Core Design Principles
1. **Modules are platform-agnostic** — a module written once runs on Local, Cloud, and all OS apps without changes
2. **Data isolation** — every org gets its own database; no org can see another org's data
3. **Offline-first** — Local mode works 100% without internet; Cloud sync is optional
4. **No code rewrite per OS** — same Node.js backend + React frontend, packaging layer handles OS differences
5. **Production-grade** — real PostgreSQL everywhere, no PGLite in production

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                    UIAP DEVELOPER PLATFORM (Internet)                  │
│                                                                        │
│  ┌──────────────────────────┐   ┌──────────────────────────────────┐  │
│  │   uiap-cloud             │   │   uiap-hosting                   │  │
│  │   (Port 4000)            │   │   (Port 5000)                    │  │
│  │                          │   │                                  │  │
│  │  • Developer dashboard   │   │  Multi-tenant Edge host:         │  │
│  │  • Module marketplace    │   │  Org A → instance + DB_A         │  │
│  │  • License management    │   │  Org B → instance + DB_B         │  │
│  │  • Org/plan management   │   │  Org C → instance + DB_C         │  │
│  │  • /edge/v1/* API        │   │                                  │  │
│  └──────────────────────────┘   └──────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────────────────────┘
                           │ HTTPS (optional, works offline without this)
    ┌──────────────────────┼──────────────────────────┐
    │                      │                          │
┌───▼──────────────┐  ┌────▼────────────────┐  ┌─────▼──────────────────┐
│  Local Plan       │  │  Cloud Plan         │  │  Hybrid Plan           │
│                   │  │                     │  │                        │
│  UIAP App         │  │  (No local app)     │  │  UIAP App (local) ⟺   │
│  Windows/Mac/Linux│  │  Browser → Hosted   │  │  Hosted Cloud Instance │
│  + Local PG       │  │  Instance + Cloud PG│  │  (bidirectional sync)  │
└───────────────────┘  └─────────────────────┘  └────────────────────────┘
```

### Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Backend (Edge Server) | Node.js 24 + Express 5 + TypeScript | Cross-platform, existing code |
| Frontend (Dashboard) | React 19 + Vite + TypeScript | Same UI for all platforms |
| Database | **Real PostgreSQL 16+** (no PGLite in production) | Production-grade, full SQL |
| Native App Shell | **Electron** (Windows/Mac/Linux) | Bundles Node.js, cross-platform builds via electron-builder |
| Cloud Hosting | Docker containers (one per org) | Isolation, easy scaling |
| Module Packaging | Signed ZIP + Ed25519 | Tamper-proof module distribution |
| Sync (Hybrid) | WebSockets + REST delta sync | Real-time + offline-resilient |

---

## All Phases

### ━━━ PHASE 1: Local-First v0.1 (CURRENT) ━━━
**Goal**: Complete working UIAP Edge + Cloud integration. Demo-able at viva.

**Status**: 🔄 IN PROGRESS

**Deliverables:**

#### 1A. Core System (PostgreSQL Migration)
- [ ] Replace PGLite with real `pg` pool in `packages/core/src/db/pool.ts`
- [ ] Ensure all migrations work against real PostgreSQL 16
- [ ] Update `DATABASE_URL` to point to local PostgreSQL in dev `.env`
- [ ] Remove `@electric-sql/pglite` dependency from `core` and `edge-api`

#### 1B. UIAP Cloud — Phase 2 Routes
- [ ] `POST /edge/v1/register` — Edge installation registers, gets `installation_id`
- [ ] `GET /edge/v1/entitlements` — Edge polls which modules it's licensed for
- [ ] `GET /edge/v1/packages/:slug/:version` — Signed ZIP download
- [ ] `POST /dashboard/modules/:id/versions/:v/package` — Admin uploads ZIP
- [ ] Ed25519 signing in `src/signing.js`
- [ ] Store ZIPs as BYTEA in DB (demo-grade; Phase 3 moves to object storage)
- [ ] Add `plan` column to `organizations` table: `local | cloud | hybrid`
- [ ] Complete `public/index.html` dashboard (all missing sections)

#### 1C. UIAP Edge — Cloud Sync Service
- [ ] `services/cloud-sync.ts` — periodic entitlement polling, auto-install
- [ ] `routes/cloud.ts` — `/api/cloud/status`, `/api/cloud/sync`, `/api/cloud/entitlements`
- [ ] Add `UIAP_CLOUD_URL` + `UIAP_INSTALL_KEY` to config (optional, offline if missing)
- [ ] Local DB table: `cloud_entitlements` to cache last known license state

#### 1D. UIAP Edge Web — Cloud Panel
- [ ] `views/CloudView.tsx` — registration status, entitlements table, sync button
- [ ] Add "Cloud" to sidebar nav

#### 1E. Demo Module Packaging
- [ ] `package-modules.ps1` — build + ZIP + sign all 5 demo modules
- [ ] Manifest v2 schema: add `sync_strategy` field (for future hybrid, default `local_only`)
- [ ] Upload demo modules to Cloud dashboard
- [ ] Test full download + install flow via Cloud sync

#### 1F. Attendance Business Rules (Module)
- [ ] Duplicate protection (one check-in per session)
- [ ] Lateness threshold (configurable, e.g. >15 min = Late)
- [ ] Manual correction endpoint

#### 1G. Biometric → Attendance Event Chain
- [ ] ESP32 fires `biometric.scan.matched` Core event
- [ ] Biometric module maps `device_id + slot_id → student_id`, fires `attendance.checkin.request`
- [ ] Attendance module handles event, writes record

**Done when**: Full end-to-end demo works: Cloud → license → Edge auto-downloads module → Biometric scan → Attendance logged.

---

### ━━━ PHASE 2: Cloud Hosting Service ━━━
**Goal**: Organizations can subscribe to a Cloud plan and get full UIAP hosted on developer's server.

**Status**: 📋 PLANNED

#### 2A. `uiap-hosting` Service (New Repo/App)
- Multi-tenant Edge router: one Node.js process, routes per-org requests to isolated handlers
- Per-org database provisioning (PostgreSQL schema-per-org OR separate DB)
- Org onboarding API: `POST /hosting/orgs/:id/provision` → creates DB, starts instance
- Subdomain routing: `org-a.uiap.cloud` → Org A's instance
- Docker Compose for development, Kubernetes-ready for production

#### 2B. UIAP Cloud Updates
- Org plan management: `local | cloud | hybrid`
- When org upgrades to Cloud plan → trigger `uiap-hosting` to provision instance
- Billing hooks (future: Stripe integration)

#### 2C. PostgreSQL Multi-Tenancy Strategy
```
Option A: Schema-per-org (simpler)
  - One PostgreSQL server
  - Each org gets a schema: org_abc.students, org_abc.attendance
  - Pros: easy to manage, one migration to all
  - Cons: one DB server is a single point of failure

Option B: Database-per-org (more isolated, chosen for security)
  - Each org gets their own PostgreSQL database on the server
  - Pros: true isolation, can move orgs between servers
  - Cons: more overhead for many small orgs
```
**Decision: Database-per-org** (matches `new.md` architectural rule: "isolate the organization's data and database")

#### 2D. Module Packaging (Phase 2 upgrade)
- Move from BYTEA storage to object storage (MinIO self-hosted or S3)
- CDN for package distribution
- Package size limit: 100MB

---

### ━━━ PHASE 3: Cross-Platform Native App (Electron) ━━━
**Goal**: UIAP Edge ships as a proper native app for Windows, Mac, Linux. No visible Node.js in Task Manager.

**Status**: 📋 PLANNED

#### 3A. Electron App Shell (`apps/electron-shell/`)
```
electron-shell/
├── main.ts          — Electron main process, system tray, child process manager
├── preload.ts       — Secure IPC bridge
├── tray.ts          — System tray icon + menu (Start/Stop/Open/Logs/Quit)
└── child.ts         — Spawns UIAP Edge server as child process
```

**How it works:**
1. User launches `UIAP.exe` (Windows) / `UIAP.app` (Mac) / `UIAP.AppImage` (Linux)
2. Electron starts, spawns `node dist/index.js` as a child process (the Edge server)
3. Tray icon appears: 🔵 UIAP Running
4. Tray menu: "Open Dashboard" → opens `http://localhost:3000` in system browser or embedded WebView
5. On shutdown: Electron kills child process gracefully, shows "Stopping..."

**Module compatibility**: Modules NEVER interact with Electron. They only use the UIAP Core SDK. Zero changes needed.

#### 3B. electron-builder Configuration
```json
{
  "win": { "target": "nsis", "icon": "assets/icon.ico" },
  "mac": { "target": "dmg", "icon": "assets/icon.icns" },
  "linux": { "target": ["AppImage", "deb", "rpm"] }
}
```
Single `npm run dist` builds all platforms.

#### 3C. Auto-Update (OTA)
- electron-updater for native app updates
- UIAP Cloud serves update manifest
- Background update + restart prompt

#### 3D. PostgreSQL Bundling
- Ship PostgreSQL 16 binaries inside the installer (via `embedded-postgres` npm package)
- On first run: extract + initialize PostgreSQL data directory
- No separate PostgreSQL installation required by end users
- Windows: PostgreSQL as a Windows Service
- Mac/Linux: PostgreSQL as background process managed by Electron

---

### ━━━ PHASE 4: Hybrid Sync ━━━
**Goal**: Orgs on Hybrid plan get Local + Cloud instances that sync bidirectionally, with per-module control.

**Status**: 📋 PLANNED

#### 4A. Module Manifest — Sync Strategy
```json
{
  "slug": "uiap.attendance",
  "sync": {
    "strategy": "bidirectional",
    "tables": ["attendance_records"],
    "conflict": "latest_wins"
  }
}
```

Valid strategies:
- `local_only` — never syncs (biometric templates, device commands)
- `cloud_only` — only exists in cloud instance (analytics dashboards)
- `bidirectional` — syncs both ways (attendance, college management data)
- `push_only` — local pushes to cloud, never pulls (audit logs)

#### 4B. Sync Engine (`packages/sync/`)
- Delta sync: only syncs rows where `updated_at > last_sync_at`
- Conflict resolution per strategy
- Queue-based: offline changes queued locally, pushed when cloud available
- WebSocket for near-real-time sync when both are online

#### 4C. Edge Web — Module Run-Location Control
UI panel where admin selects per-module:
- ☐ Run on Local only
- ☐ Run on Cloud only  
- ☑ Run on Both (sync enabled)

---

### ━━━ PHASE 5: Production Hardening ━━━
**Goal**: Production-ready security, reliability, monitoring.

**Status**: 📋 PLANNED

- SSL/TLS everywhere (Let's Encrypt for cloud instances)
- 2FA for admin accounts
- API rate limiting + DDoS protection
- Database backups (automated, encrypted, off-site)
- Monitoring: health checks, uptime alerts
- Audit log completeness (every user action logged)
- GDPR/data privacy compliance (right to erasure, data export)
- Load testing + capacity planning

---

## File Structure Reference

```
g-p-6a789ef4.../
├── uiap-workspace/               ← UIAP Edge (local app + modules)
│   ├── apps/
│   │   ├── edge-api/             ← Node.js/Express backend
│   │   ├── edge-web/             ← React dashboard
│   │   └── electron-shell/       ← [Phase 3] Native app wrapper
│   ├── packages/
│   │   ├── core/                 ← Shared platform services (DB, auth, events)
│   │   ├── module-sdk/           ← Module development contract
│   │   ├── dev-harness/          ← Standalone module dev server
│   │   └── sync/                 ← [Phase 4] Bidirectional sync engine
│   └── modules/                  ← Demo modules (attendance, biometric, etc.)
│
├── UIAP-cloud-main/              ← UIAP Cloud (license mgmt + module store)
│
└── uiap-hosting/                 ← [Phase 2] Multi-tenant hosting service (new)
```

---

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-08-19 | Remove PGLite, use real PostgreSQL everywhere | Production-grade requirement |
| 2026-08-19 | Use Electron for native app packaging | Cross-platform, no code rewrite for modules |
| 2026-08-19 | Store Cloud ZIPs as BYTEA in PostgreSQL for Phase 1 | Demo simplicity; Phase 2 moves to object storage |
| 2026-08-19 | Database-per-org for cloud hosting | True data isolation per `new.md` architectural rule |
| 2026-08-19 | Module sync_strategy declared in manifest.json | Zero-change module API for hybrid support |
| 2026-08-19 | All 5 phases planned upfront | Full vision documented, build incrementally |
