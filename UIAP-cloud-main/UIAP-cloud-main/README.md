# UIAP Cloud — Developer Dashboard (Developer 2, Phase 1)

This is the first slice of UIAP Cloud: **auth + module/version CRUD**, fully testable
with Postman, no dependency on Dev 1's Edge Core yet.

Not included yet (coming in Phase 2): package ZIP upload, hashing, Ed25519 signing,
and the `/edge/v1/*` machine-facing API. The routes are structured so those slot in
without reshaping what's here.

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to any Postgres instance)

## 2. Setup

```bash
cd uiap-cloud
npm install

cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD

npm run migrate   # creates all tables
npm run seed       # creates your first dashboard admin login

npm run dev        # starts the API on http://localhost:4000
```

Check it's alive:
```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

## 3. Postman Walkthrough (do this in order)

**1. Log in**
```
POST /dashboard/auth/login
{ "email": "admin@uiap.local", "password": "<your seeded password>" }
```
Copy the `token` from the response. For every request below, add header:
`Authorization: Bearer <token>`

**2. Create a module**
```
POST /dashboard/modules
{ "slug": "uiap.attendance", "display_name": "Attendance" }
```
Copy the returned `id` — you'll need it as `:moduleId` below.

**3. Create a draft version**
```
POST /dashboard/modules/:moduleId/versions
{ "version": "1.0.0", "changelog": "Initial release", "core_compat_range": ">=0.1.0 <1.0.0" }
```

**4. List versions**
```
GET /dashboard/modules/:moduleId/versions
```

**5. Publish it**
```
POST /dashboard/modules/:moduleId/versions/:versionId/publish
```

**6. Create an organization**
```
POST /dashboard/organizations
{ "name": "Demo College" }
```

**7. Grant a license**
```
POST /dashboard/organizations/:orgId/licenses
{ "module_id": "<the module id from step 2>" }
```

**8. View the org (see the license attached)**
```
GET /dashboard/organizations/:orgId
```

**9. Revoke the license — the demo moment**
```
POST /dashboard/organizations/:orgId/licenses/:licenseId/revoke
```
`licenseId` is in the response from step 7 or 8. After this, `status` becomes `"revoked"`.
Once Phase 2's `/edge/v1/entitlements` exists, this is the switch that stops an Edge
installation from being allowed to pull that module.

## 4. Project Structure

```
uiap-cloud/
├── server.js                 entry point, mounts routes
├── src/
│   ├── db/
│   │   ├── schema.sql        full table definitions
│   │   ├── pool.js           pg connection pool
│   │   ├── migrate.js        applies schema.sql
│   │   ├── seed.js           creates first admin user
│   │   └── audit.js          audit log helper
│   ├── middleware/
│   │   └── requireAuth.js    JWT verification for /dashboard/* routes
│   └── routes/
│       ├── auth.js           POST /dashboard/auth/login
│       ├── modules.js        module CRUD (+ mounts versions.js)
│       ├── versions.js       version CRUD, publish/deprecate
│       └── organizations.js  orgs, licenses, beta access
```

## 5. Roadmap (what's next, in order)

1. **Package upload** — `POST /dashboard/modules/:id/versions/:v/package` (multipart ZIP via `multer`), validate `manifest.json` inside it matches slug/version.
2. **Hashing + signing** — SHA-256 the ZIP, sign with Ed25519 private key, store `package_hash` + `signature` on the version row. Update the `publish` route to require these before allowing publish.
3. **Edge-facing API** (`/edge/v1/*`) — installation registration, entitlements lookup, signed package download. This is what Dev 1's Core will call.
4. **Dashboard frontend** (React/TS) — thin UI over the endpoints above; not strictly required for the backend to be demo-able via Postman, but makes the viva presentation much better.

## 6. Contract to confirm with Developer 1 before Phase 3

- Auth scheme for Edge → Cloud calls (`installation_id` + `install_key` header)
- Exact bytes being signed (SHA-256 digest bytes, not hex string) so signature verification matches on both ends
- Shape of the entitlements response: `[{ module_slug, max_version, beta_opt_in }]`
