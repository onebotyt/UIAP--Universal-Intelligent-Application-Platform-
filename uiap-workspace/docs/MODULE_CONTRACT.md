# UIAP Module Contract Specification

> This document is the formal contract for UIAP module development.  
> All modules must conform to these rules to operate within the UIAP Edge platform.

---

## 1. Standard Module Structure

Every UIAP module follows this directory layout:

```
my-module/
│
├── manifest.json          # Module identity and requirements
│
├── server/                # OR dist/ — compiled server code
│   └── index.js           # Server entry point
│
├── web/                   # Frontend assets (optional)
│   ├── index.html         # UI entry point
│   └── assets/            # CSS, JS, images
│
└── migrations/            # Database migrations (optional)
    ├── 001_initial.sql
    └── 002_add_column.sql
```

---

## 2. Manifest Schema

The `manifest.json` file is the single source of truth for a module's identity and requirements.

| Field           | Type     | Required | Description                                          |
| --------------- | -------- | -------- | ---------------------------------------------------- |
| `id`            | string   | ✅       | Unique identifier (e.g. `"uiap.college-management"`) |
| `name`          | string   | ✅       | Human-readable name                                  |
| `version`       | string   | ✅       | Semantic version (`"1.0.0"`)                         |
| `description`   | string   | ✅       | Brief description                                    |
| `platform`      | `"UIAP"` | ✅       | Must be `"UIAP"`                                     |
| `coreVersion`   | string   | ⬜       | Minimum Core version (e.g. `">=0.1.0"`)              |
| `server.entry`  | string   | ⬜       | Server entry point (default: `"dist/index.js"`)      |
| `permissions`   | array    | ⬜       | Permissions this module declares                     |
| `dependencies`  | object   | ⬜       | Module dependencies (`moduleId → semver`)            |
| `ui.entry`      | string   | ⬜       | Frontend entry point HTML                            |
| `ui.navigation` | array    | ⬜       | Shell sidebar navigation items                       |

### Example

```json
{
  "id": "uiap.college-management",
  "name": "College Management",
  "version": "1.0.0",
  "description": "Manages students, teachers, departments, and classes.",
  "platform": "UIAP",
  "coreVersion": ">=0.1.0",
  "server": { "entry": "dist/index.js" },
  "permissions": [
    { "module": "college.students", "action": "view", "description": "View students" },
    { "module": "college.students", "action": "manage", "description": "Create/edit students" }
  ],
  "dependencies": {},
  "ui": {
    "entry": "web/index.html",
    "navigation": [{ "id": "students", "label": "Students", "icon": "🎓" }]
  }
}
```

---

## 3. Server Entry-Point Rules

Every backend module has one defined entry point exporting a class that implements `UIAPModule`.

### Required

```typescript
import type { UIAPModule, ModuleContext, ModuleManifest } from '@uiap/module-sdk';

export default class MyModule implements UIAPModule {
  manifest: ModuleManifest = {/* ... */};

  activate(context: ModuleContext): () => void {
    // Set up routes, event listeners, services
    return () => {
      // Cleanup on deactivation
    };
  }
}
```

### Forbidden

```typescript
// ❌ NEVER create your own Express app or HTTP server
import express from 'express';
const app = express();
app.listen(3000);

// ❌ NEVER import from @uiap/core
import { query } from '@uiap/core';
```

### Correct Model

```
UIAP Edge
   │
   └── Express server (owned by Core)
          │
          └── ModuleRuntime
                 │
                 └── Module router (registered via context.registerApiRouter)
```

---

## 4. ModuleContext API Reference

The `ModuleContext` is the module's ONLY interface to the UIAP platform.

```
ModuleContext
├── module          Module identity (id, version, manifest)
├── auth            Authentication access
├── rbac            Role-Based Access Control
├── db              Schema-isolated database access
├── events          Event publish/subscribe
├── logger          Prefixed logging
├── config          Platform configuration
├── organization    Organization context
└── registerApiRouter()  Express router registration
```

### `context.module`

```typescript
context.module.id; // "uiap.college-management"
context.module.version; // "1.0.0"
context.module.manifest; // Full ModuleManifest object
```

### `context.auth`

```typescript
// Extract authenticated user from an Express request
const user = await context.auth.getUserFromRequest(req);
// Returns: { id, username, permissions } or null
```

### `context.rbac`

```typescript
// As Express middleware (protects a route)
router.get('/students', context.rbac.require('college.students', 'view'), handler);

// Programmatic check
const allowed = await context.rbac.check(userId, 'college.students', 'manage');
```

### `context.db`

```typescript
// Query within the module's own schema
const result = await context.db.query('SELECT * FROM students WHERE id = $1', [studentId]);

// Transaction within the module's schema
await context.db.transaction(async (client) => {
  await client.query('INSERT INTO students (name) VALUES ($1)', [name]);
});

// The schema name is available
context.db.schema; // "uiap_college_management"
```

### `context.events`

```typescript
// Publish (source is auto-injected)
await context.events.publish({
  id: crypto.randomUUID(),
  type: 'student.created',
  occurredAt: Date.now(),
  payload: { studentId, name },
});

// Subscribe
const unsubscribe = context.events.subscribe('fingerprint.verified', async (event) => {
  // Handle the event
});
```

### `context.logger`

```typescript
context.logger.info('Student created'); // [uiap.college-management] Student created
context.logger.error('Failed to save'); // [uiap.college-management] Failed to save
```

### `context.config`

```typescript
context.config.coreVersion; // "0.1.0"
const value = await context.config.get('some_setting');
```

### `context.organization`

```typescript
context.organization.id; // "local" (v1)
context.organization.name; // "Local Organization" (v1)
```

---

## 5. Authentication Flow

Modules must NOT implement their own authentication.

```
Browser
   ↓
Core Authentication (JWT cookie)
   ↓
Authenticated request (req.user populated)
   ↓
Module API (receives authenticated context)
```

The module accesses the authenticated user through:

```typescript
const user = await context.auth.getUserFromRequest(req);
```

---

## 6. RBAC Integration

Modules declare permissions in their manifest. Core creates the permission records on installation.

```
manifest.json
   ↓ permissions: [{ module: "college.students", action: "view" }]
   ↓
Core creates permission records
   ↓
Administrator assigns permissions to roles
   ↓
Module uses context.rbac.require() or context.rbac.check()
```

Modules must NEVER bypass Core RBAC:

```typescript
// ❌ WRONG
if (user.role === 'admin') {
  /* allow */
}

// ✅ CORRECT
const allowed = await context.rbac.check(userId, 'college.students', 'manage');
```

---

## 7. Database Isolation

### Core owns Core tables

```
core.users
core.roles
core.permissions
core.module_installations
core.device_registry
core.audit_logs
```

### Modules own their own schema

```
uiap_college_management.students
uiap_college_management.departments
uiap_attendance.records
uiap_biometric.fingerprint_mappings
```

### Rules

1. A module must NEVER directly modify another module's tables.
2. Cross-module data flows through events, not SQL joins.

```
❌ Attendance → UPDATE biometric.fingerprint_mappings
✅ Biometric → publish("fingerprint.verified") → Attendance subscribes → attendance.records
```

### Schema naming

Module ID dots and hyphens are replaced with underscores:

| Module ID                 | Schema                    |
| ------------------------- | ------------------------- |
| `uiap.college-management` | `uiap_college_management` |
| `uiap.attendance`         | `uiap_attendance`         |
| `uiap.biometric`          | `uiap_biometric`          |

---

## 8. Module Migrations

Modules ship database migrations as numbered `.sql` files:

```
migrations/
├── 001_initial.sql
├── 002_add_student_status.sql
└── 003_add_index.sql
```

Rules:

- Migrations run within the module's own schema (Core sets `search_path` automatically).
- Migrations must ONLY create/modify objects in the module's schema.
- Migrations execute in sorted filename order during install/update.
- Use `CREATE TABLE IF NOT EXISTS` for idempotency.

---

## 9. Event Naming Convention

Events follow the pattern: `<domain>.<action>`

| Event Type             | Description                        |
| ---------------------- | ---------------------------------- |
| `student.created`      | A student record was created       |
| `student.updated`      | A student record was updated       |
| `fingerprint.enrolled` | A fingerprint was enrolled         |
| `fingerprint.verified` | A fingerprint was verified         |
| `attendance.recorded`  | An attendance record was created   |
| `attendance.corrected` | An attendance record was corrected |
| `device.registered`    | A device was registered            |
| `device.heartbeat`     | A device sent a heartbeat          |

Events have typed payloads. The `source` field is auto-injected by the SDK.

---

## 10. Module UI Contract

Module frontends are served through the existing ModuleRuntime at:

```
/api/m/<module-id>/ui/*
```

The module's UI communicates with its backend API at:

```
/api/m/<module-id>/<endpoint>
```

The module frontend must NOT assume a separate web server. It runs inside an iframe in the UIAP Edge shell.

---

## 11. Module Lifecycle

### Install & Enable

```
ZIP → PackageVerifier → Module Manager → Install → Migration → Installed → Enable → ModuleRuntime → activate(context) → Running
```

### Disable

```
Running → deactivate() → unsubscribe events → remove routes → Disabled
```

### Activation Failure

```
activate() → ERROR → Runtime catches error → Audit log → Module disabled
```

A module failure must NEVER crash UIAP Core. Other modules continue operating.

---

## 12. Error Isolation

```
Attendance ❌ (crash)
       │
       ▼
Core continues
       │
       ├── Authentication ✅
       ├── College Management ✅
       ├── Biometric ✅
       └── Reports ✅
```

The SDK documents this guarantee. The Core runtime wraps `activate()` in a try/catch and logs failures to `core.audit_logs`.

---

## 13. Deployment-Neutral Boundary

Modules must NOT contain deployment-mode logic:

```typescript
// ❌ FORBIDDEN
if (process.platform === 'win32') {
  /* ... */
}
if (process.env.CLOUD_MODE) {
  /* ... */
}

// ✅ CORRECT — use the SDK context
const orgId = context.organization.id;
const dbResult = await context.db.query('SELECT ...');
```

The module SDK abstracts the deployment environment. The same module code runs on:

- Windows Local Edge (v1)
- Future Cloud Runtime

---

## 14. Organization Context

### Local v1

```
context.organization.id   = "local"
context.organization.name = "Local Organization"
```

There is exactly one organization.

### Future Cloud

```
context.organization.id   = "org-abc-123"
context.organization.name = "Springfield College"
```

The runtime will inject the correct tenant context. Modules do not need to change.
