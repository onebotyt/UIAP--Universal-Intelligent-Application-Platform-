# UIAP Module Development Guide

Welcome! This guide explains how to build a module for the Unified Identity and Attendance Platform (UIAP).

UIAP is a local-first platform designed for schools, colleges, and organizations. The platform provides a secure **Edge Shell** (authentication, database management, permissions, updates). Your job as a module developer is to write the business logic that runs _inside_ this shell.

## 1. What is a UIAP Module?

A UIAP module is a packaged ZIP file containing:

- `manifest.json` — The module's identity and requirements.
- `server/index.js` — The backend logic (API routes, event listeners).
- `web/index.html` — The frontend user interface (optional).
- `migrations/*.sql` — Database schemas and updates (optional).

Modules are isolated. You cannot directly read another module's database tables, and you don't need to write your own login screens. Everything goes through the **Module SDK**.

---

## 2. Getting Started

### Prerequisites

- Node.js v24+
- TypeScript
- `@uiap/module-sdk`

### Project Structure

Create a new directory for your module:

```bash
mkdir my-first-module
cd my-first-module
npm init -y
npm install @uiap/module-sdk
npm install --save-dev typescript
```

Set up your files to look like this:

```
my-first-module/
├── package.json
├── tsconfig.json
├── manifest.json
├── src/
│   └── index.ts
└── migrations/
    └── 001_initial.sql
```

---

## 3. The Manifest

The `manifest.json` tells the UIAP Core what your module is and what permissions it needs.

```json
{
  "id": "uiap.hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "description": "My first UIAP module",
  "platform": "UIAP",
  "coreVersion": ">=0.1.0",
  "server": {
    "entry": "dist/index.js"
  },
  "permissions": [
    {
      "module": "hello",
      "action": "view",
      "description": "Can view hello world messages"
    }
  ],
  "ui": {
    "entry": "web/index.html",
    "navigation": [
      {
        "id": "hello-nav",
        "label": "Hello World",
        "icon": "👋"
      }
    ]
  }
}
```

---

## 4. Writing the Backend Code

In `src/index.ts`, you export a class that implements `UIAPModule`. The platform will call your `activate()` method when the administrator turns on your module.

```typescript
import type { UIAPModule, ModuleContext, ModuleManifest } from '@uiap/module-sdk';
import { Router } from 'express';

// Import your manifest so you can attach it to the class
import manifestData from '../manifest.json' assert { type: 'json' };

export default class HelloWorldModule implements UIAPModule {
  public manifest: ModuleManifest = manifestData as ModuleManifest;

  activate(context: ModuleContext): () => void {
    // 1. Log that we are starting
    context.logger.info('Hello World module is activating!');

    // 2. Set up API Routes
    const router = Router();

    // An endpoint protected by the permission we declared in manifest.json
    router.get('/message', context.rbac.require('hello', 'view'), async (req, res) => {
      // Get the user who clicked the button
      const user = await context.auth.getUserFromRequest(req);

      res.json({ message: `Hello, ${user?.username}!` });
    });

    // Register the router with the platform
    context.registerApiRouter(router);

    // 3. Return a cleanup function
    return () => {
      context.logger.info('Module deactivated.');
    };
  }
}
```

---

## 5. Using the Database

Your module gets its own isolated database schema. The platform will automatically convert your module ID (`uiap.hello-world`) into a schema name (`uiap_hello_world`).

### Migrations

Create `migrations/001_initial.sql`:

```sql
CREATE TABLE IF NOT EXISTS greetings (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Querying

Use `context.db` to read and write. The SDK automatically ensures you are talking to your own tables.

```typescript
router.post('/save', async (req, res) => {
  const { message } = req.body;

  // Notice we don't specify the schema name in the SQL, the SDK handles it
  await context.db.query('INSERT INTO greetings (message) VALUES ($1)', [message]);

  res.json({ success: true });
});
```

---

## 6. Events (Cross-Module Communication)

Because you cannot query another module's tables directly, modules talk to each other using Events.

### Publishing an event

```typescript
await context.events.publish({
  id: crypto.randomUUID(),
  type: 'hello.message_sent',
  occurredAt: Date.now(),
  payload: { message: 'Hi everyone!' },
});
```

### Subscribing to an event

```typescript
const unsubscribe = context.events.subscribe('fingerprint.verified', async (event) => {
  const { studentId } = event.payload;
  context.logger.info(`I see student ${studentId} just verified their fingerprint!`);
});

// Don't forget to clean up in your deactivate function!
return () => {
  unsubscribe();
};
```

---

## 7. Packaging Your Module

When you're ready to test your module in the UIAP Edge Platform:

1. Compile your TypeScript (`tsc`)
2. Zip the folder. **Important:** The `manifest.json` must be at the root of the ZIP file, not inside a subfolder.

```bash
zip -r my-module.zip manifest.json dist/ migrations/ web/
```

3. Go to the UIAP Dashboard → **Modules**
4. Click **Install Module** and upload your ZIP file.
5. Click **Enable**.

Check the server logs; you should see your `context.logger.info('Hello World module is activating!')` message!

---

## Reference Example

The best way to learn is by reading code. Look at the `platform-proof-demo` module included in the workspace repository. It is the "gold standard" reference module that demonstrates every feature of the SDK.
