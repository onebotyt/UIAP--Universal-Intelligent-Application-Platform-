# UIAP — Universal Intelligent Application Platform: Development Guide

## Current stage

Workspace bootstrapped (UIAP-002). The npm workspaces monorepo compiles, lints, formats, tests, and builds successfully. No database schema, authentication, or business module code has been written yet.

## Approved technology decisions

| Area                  | Decision                                         | Status                         |
| --------------------- | ------------------------------------------------ | ------------------------------ |
| Runtime               | Node.js 24 LTS (24.18.0 currently installed)     | Approved                       |
| Package manager       | npm 11 (11.16.0 currently installed)             | Approved                       |
| UIAP Edge API         | Express 5 + TypeScript                           | Approved                       |
| UIAP Edge Web/PWA     | React 19 + TypeScript + Vite 8                   | Approved                       |
| Organization database | PostgreSQL 17, local Windows installation        | Approved; installation pending |
| Database client       | `pg`                                             | Approved                       |
| Migrations            | `node-pg-migrate`                                | Approved                       |
| Quality tools         | ESLint 9, Prettier 3, TypeScript 5, and Vitest 3 | Approved                       |
| Development servers   | Vite (Web/PWA) and `tsx watch` (Edge API)        | Approved                       |

## Workspace layout

```text
uiap-workspace/
├── package.json              # Root — npm workspaces, canonical scripts
├── tsconfig.json             # Root — TypeScript project references
├── tsconfig.base.json        # Shared compiler options
├── eslint.config.js          # ESLint 9 flat config
├── .prettierrc               # Prettier formatting rules
├── vitest.config.ts          # Vitest test configuration
├── .env.example              # Environment variable template (safe)
├── .npmrc                    # npm settings (engine-strict, save-exact)
├── .editorconfig             # Editor formatting consistency
├── apps/
│   ├── edge-api/             # Express API (health-check placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── edge-web/             # React + Vite PWA (shell placeholder)
│       ├── package.json
│       ├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/App.tsx, main.tsx, App.css
├── packages/
│   ├── core/                 # Reusable platform contracts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── module-sdk/           # Public module development contract
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
├── modules/                  # Installable UIAP modules (future)
├── tests/                    # Cross-component integration tests (future)
├── scripts/                  # Local automation and packaging scripts (future)
├── docs/                     # This file and other documentation
└── coordination/             # Collaboration protocol files
```

## Canonical commands (verified working)

All commands are run from the workspace root (`uiap-workspace/`).

```bash
npm install           # Install all workspace dependencies
npm run dev           # Start dev servers (edge-api + edge-web)
npm run build         # Build all packages and apps
npm run typecheck     # TypeScript compiler check (tsc --build)
npm run lint          # ESLint across workspace
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check (CI-safe)
npm test              # Vitest run (all test files)
npm run test:watch    # Vitest watch mode
```

## Prerequisites (Windows)

1. **Node.js 24 LTS** — download from https://nodejs.org/
2. **Git** — download from https://git-scm.com/
3. **PostgreSQL 17** — download from https://www.postgresql.org/download/windows/
   - Run the installer and accept the default settings for Port (5432) and Locale.
   - Set a secure superuser (`postgres`) password, but **do not** use this for the UIAP app.
   - Open pgAdmin 4 (included in the installation) or `psql`.
   - Create a new login role: `CREATE ROLE uiap_user WITH LOGIN PASSWORD 'your_secure_password';`
   - Create the development database: `CREATE DATABASE uiap_dev OWNER uiap_user;`
   - Update your `.env` file with `DATABASE_URL=postgres://uiap_user:your_secure_password@localhost:5432/uiap_dev`.

## Environment setup

1. Clone the repository and `cd uiap-workspace`.
2. Copy `.env.example` to `.env` and fill in real values.
3. Run `npm install`.
4. Run `npm run dev` to start the development servers.

## API Foundation (Edge API)

The Edge API uses a validated configuration, robust request tracking, and safe JSON responses.

### Environment Configuration

Configuration is validated using Zod at startup. Invalid configuration prevents the server from starting.

- `NODE_ENV`: Validated as `development | test | production` (default: `development`).
- `PORT`: Validated as a positive integer (default: `3000`).

### Request Correlation

Every incoming request is assigned a Correlation ID.

- **Header:** `X-Request-Id`
- **Behavior:** The API honors an incoming `X-Request-Id` if it contains only alphanumeric characters and hyphens, up to 64 characters. Otherwise, it generates a standard UUID v4.
- **Response:** The ID is always attached to `req.id` and returned in the `X-Request-Id` response header.

### Safe JSON Error Contract

All API errors follow a strict, safe JSON contract that does not leak stacks or database details.

```json
{
  "error": {
    "message": "User-friendly or generic error description",
    "code": "ERROR_CODE_STRING",
    "requestId": "correlation-uuid-here"
  }
}
```

- **404 Not Found**: Returns `code: "NOT_FOUND"`.
- **500 Internal Server Error**: Catches unhandled exceptions and returns `code: "INTERNAL_SERVER_ERROR"`. Internal stacks are logged safely to the console with the `requestId`.

## Event Bus Contract (Core)

The UIAP Core provides an in-process, asynchronous `EventBus` to decouple modules.

- **Event Envelope**: All events implement `UIAPEvent<T>` with required fields: `id`, `type`, `occurredAt`, `source`, and `payload`.
- **Naming Convention**: Event types must be non-empty, dot-separated identifiers (e.g., `device.fingerprint_matched`).
- **Delivery**: Events are delivered to all matching subscribers sequentially in registration order.
- **Subscriber Failure Behavior**: One subscriber failing (throwing an error) does **not** prevent subsequent subscribers from receiving the event. Failures are collected and returned to the publisher via the `EventBusPublishResult`.
- **Ownership**: The `EventBus` is an instance-based class, not a global singleton. It will be instantiated and injected by the Core/App composition root in later tasks.

## Platform Proof Demo Module

The repository contains a deliberately minimal module (`@uiap/platform-proof-demo`) to prove the viability of the UIAP Core Event Bus and Module SDK.

- **What it proves:** It verifies the boundary between Core and modules. It proves that an independent module can be instantiated, accept an injected `ModuleContext`, subscribe to events, and publish its own events seamlessly without relying on global singletons or direct imports of Core implementation details.
- **Explicit Limits:** This demo does **not** prove (and is not designed for) ZIP installation, code signing, compatibility checking, database migrations, UI/menu registration, or the full Module Manager lifecycle. Those are future platform features.

## Security baseline

- Use `.env.example` with variable names and safe placeholders only; never commit a populated `.env` file.
- Keep the PostgreSQL password and all authentication secrets local to the installation.
- The detailed authentication and session design is a future Core task; do not introduce a login implementation during bootstrap.
