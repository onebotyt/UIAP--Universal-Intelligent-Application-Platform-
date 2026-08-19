/**
 * @uiap/module-sdk — UIAP Module SDK
 *
 * Public contract for UIAP module developers.
 * Modules depend ONLY on this package to integrate with the UIAP Core platform.
 *
 * Modules must never import from `@uiap/core` or internal Core files.
 */

// ─── SDK Version ────────────────────────────────────────────────────────────

/** Module SDK version identifier. */
export const MODULE_SDK_VERSION = '0.1.0';

// ─── Event Contract ─────────────────────────────────────────────────────────

/**
 * The universal event envelope.
 * All events flowing through the UIAP Core Event Bus must adhere to this shape.
 */
export interface UIAPEvent<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string | number;
  readonly source: string;
  readonly payload: T;
}

/**
 * A function that handles an incoming event.
 */
export type EventSubscriber<T = unknown> = (event: UIAPEvent<T>) => void | Promise<void>;

/**
 * Result returned after publishing an event.
 */
export interface EventBusPublishResult {
  delivered: number;
  errors: Error[];
}

// ─── Event Naming Convention ────────────────────────────────────────────────
//
// Events follow the pattern: <domain>.<action>
//
// Examples:
//   student.created       student.updated
//   fingerprint.enrolled  fingerprint.verified
//   attendance.recorded   attendance.corrected
//   device.registered     device.heartbeat
//   platform.proof_requested  platform.proof_completed
//
// The domain is typically the module's business domain.
// The action describes what happened (past tense).
//
// ────────────────────────────────────────────────────────────────────────────

// ─── Authentication Types ───────────────────────────────────────────────────

/**
 * Represents an authenticated user as seen by a module.
 * Modules receive this through `context.auth.getUserFromRequest(req)`.
 * Modules must NEVER implement their own authentication.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly username: string;
  readonly permissions: ReadonlyArray<{ module_name: string; action: string }>;
}

// ─── Permission Declaration ─────────────────────────────────────────────────

/**
 * Declares a permission that a module requires.
 * Listed in the module's `manifest.json` under `permissions`.
 * Core will auto-create these permission rows on module installation.
 */
export interface ModulePermissionDeclaration {
  /** The permission's module scope (e.g. "college.students"). */
  module: string;
  /** The action within that scope (e.g. "view", "manage"). */
  action: string;
  /** Human-readable description of what this permission grants. */
  description: string;
}

// ─── Module Manifest ────────────────────────────────────────────────────────

/**
 * Every UIAP module must provide a `manifest.json` conforming to this shape.
 *
 * The manifest is the single source of truth for module identity, capabilities,
 * and requirements. It is read by the Module Manager during install/update.
 */
export interface ModuleManifest {
  /** Unique module identifier (e.g. "uiap.college-management"). */
  id: string;

  /** Human-readable module name. */
  name: string;

  /** Semantic version string. */
  version: string;

  /** Brief description of the module. */
  description: string;

  /** Target platform name — must be 'UIAP'. */
  platform: 'UIAP';

  /** Minimum Core version required (semver range, e.g. ">=0.1.0"). */
  coreVersion?: string;

  /**
   * Configuration for data synchronization in hybrid deployments.
   */
  sync?: {
    strategy: 'local_only' | 'cloud_only' | 'bidirectional' | 'push_only';
    tables: string[];
    conflict: 'latest_wins' | 'server_wins';
  };

  /**
   * Server-side entry point configuration.
   * If omitted, defaults to `{ entry: "dist/index.js" }`.
   */
  server?: {
    /** Path to the server entry point relative to module root. */
    entry: string;
  };

  /**
   * Permissions this module declares.
   * Core will create these permission records on installation.
   */
  permissions?: ModulePermissionDeclaration[];

  /**
   * Module dependencies: moduleId → semver range.
   * Core enforces that dependencies are installed and enabled before this module can be enabled.
   */
  dependencies?: Record<string, string>;

  /**
   * UI configuration for the UIAP Edge Web shell.
   * If omitted, the module has no frontend.
   */
  ui?: {
    /** Entry point HTML file relative to the module root. */
    entry: string;

    /**
     * Legacy single navigation item.
     * @deprecated Use `navigation` instead.
     */
    navItem?: string;

    /**
     * Navigation items for the shell sidebar.
     */
    navigation?: Array<{
      id: string;
      label: string;
      icon?: string;
      requiredPermission?: { module: string; action: string };
    }>;
  };
}

// ─── Module Context Sub-Contexts ────────────────────────────────────────────

/**
 * Provides module identity information.
 */
export interface ModuleIdentityContext {
  /** The module's unique identifier. */
  readonly id: string;
  /** The module's active version. */
  readonly version: string;
  /** The full manifest. */
  readonly manifest: ModuleManifest;
}

/**
 * Provides access to Core authentication.
 * Modules must NOT implement their own authentication.
 *
 * Flow:
 *   Browser → Core Authentication → Authenticated Request → Module API
 */
export interface ModuleAuthContext {
  /**
   * Extracts the authenticated user from an Express request.
   * Returns null if the request is not authenticated.
   *
   * The request has already been authenticated by Core's `requireAuth` middleware
   * before reaching the module's API router.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUserFromRequest(req: any): Promise<AuthenticatedUser | null>;
}

/**
 * Provides access to Core RBAC.
 * Modules declare permissions in their manifest; Core enforces them.
 *
 * Modules can:
 *   1. Use `require()` as Express middleware to protect routes.
 *   2. Use `check()` for programmatic permission checks.
 */
export interface ModuleRbacContext {
  /**
   * Returns an Express middleware that rejects requests without the specified permission.
   * Usage: `router.get('/students', context.rbac.require('college.students', 'view'), handler)`
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  require(moduleName: string, action: string): any;

  /**
   * Programmatically checks if a user has a permission.
   * @returns true if the user has the permission, false otherwise.
   */
  check(userId: string, moduleName: string, action: string): Promise<boolean>;
}

/**
 * Provides schema-isolated database access for a module.
 *
 * Rules:
 *   - Each module gets its own PostgreSQL schema (derived from manifest.id).
 *   - Modules must NEVER directly modify another module's tables.
 *   - Cross-module communication happens through the Event Bus.
 */
export interface ModuleDatabaseContext {
  /** The PostgreSQL schema name assigned to this module. */
  readonly schema: string;

  /**
   * Executes a SQL query within the module's schema.
   * The `search_path` is automatically set to the module's schema.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(text: string, params?: unknown[]): Promise<any>;

  getBuilder(): any;

  /**
   * Executes a callback within a database transaction.
   * If the callback throws, the transaction is rolled back.
   * The `search_path` is automatically set to the module's schema.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}

/**
 * Provides structured event publish/subscribe.
 * This is the primary mechanism for cross-module communication.
 *
 * Event naming convention: `<domain>.<action>` (e.g. "student.created")
 */
export interface ModuleEventsContext {
  /**
   * Publishes an event. The `source` field is automatically set to the module's ID.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish(event: Omit<UIAPEvent<any>, 'source'>): Promise<EventBusPublishResult>;

  /**
   * Subscribes to events of a given type.
   * @returns An unsubscribe function.
   */
  subscribe<T = unknown>(type: string, handler: EventSubscriber<T>): () => void;
}

/**
 * Provides a prefixed logger for the module.
 * Output is tagged with the module's ID for easy filtering.
 */
export interface ModuleLoggerContext {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Provides access to platform configuration.
 */
export interface ModuleConfigContext {
  /** The Core platform version. */
  readonly coreVersion: string;

  /**
   * Retrieves a configuration value scoped to this module.
   * Returns undefined if the key does not exist.
   */
  get(key: string): Promise<string | undefined>;
}

/**
 * Provides organization context.
 *
 * For Local v1: there is exactly one organization.
 * For Future Cloud: the runtime will inject the correct tenant context.
 *
 * Modules must NOT contain deployment-mode checks (if Windows, if cloud, etc.).
 */
export interface ModuleOrganizationContext {
  /** The organization's unique identifier. */
  readonly id: string;
  /** The organization's display name. */
  readonly name: string;
}

// ─── Module Context ─────────────────────────────────────────────────────────

/**
 * The execution context provided to a module upon activation.
 *
 * This is the module's ONLY interface to the UIAP platform.
 * Modules must never import Core internals directly.
 *
 * ```
 * Module → ModuleContext → UIAP Core
 * ```
 */
export interface ModuleContext {
  // ── Structured sub-contexts (preferred) ──

  /** Module identity information. */
  readonly module: ModuleIdentityContext;

  /** Core authentication access. */
  readonly auth: ModuleAuthContext;

  /** Core RBAC access. */
  readonly rbac: ModuleRbacContext;

  /** Schema-isolated database access. */
  readonly db: ModuleDatabaseContext;

  /** Event publish/subscribe. */
  readonly events: ModuleEventsContext;

  /** Prefixed logger. */
  readonly logger: ModuleLoggerContext;

  /** Platform configuration. */
  readonly config: ModuleConfigContext;

  /** Organization context. */
  readonly organization: ModuleOrganizationContext;

  /** Deployment context. */
  readonly deployment: {
    readonly type: 'local' | 'cloud';
  };

  // ── Legacy top-level methods (backward compatibility) ──

  /**
   * Publishes an event. Source is auto-injected.
   * @deprecated Use `context.events.publish()` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish: (event: Omit<UIAPEvent<any>, 'source'>) => Promise<EventBusPublishResult>;

  /**
   * Subscribes to an event type.
   * @deprecated Use `context.events.subscribe()` instead.
   */
  subscribe: <T = unknown>(type: string, handler: EventSubscriber<T>) => () => void;

  /**
   * Registers an Express router under this module's namespace.
   * The router will be mounted at `/api/m/:moduleId/`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerApiRouter: (router: any) => void;
}

// ─── Module Lifecycle Interface ─────────────────────────────────────────────

/**
 * The standard lifecycle interface that every UIAP module must implement.
 *
 * Lifecycle:
 *   1. Core calls `activate(context)` when the module is enabled.
 *   2. The module sets up event listeners, API routes, and services.
 *   3. The module returns an optional cleanup function.
 *   4. Core calls the cleanup function when the module is disabled.
 *
 * If `activate()` throws, Core catches the error, logs it, and disables the module.
 * A module failure must NEVER crash UIAP Core.
 */
export interface UIAPModule {
  /** The manifest defining the module's identity. */
  manifest: ModuleManifest;

  /**
   * Activates the module with the platform context.
   *
   * @returns An optional cleanup/deactivation function.
   */
  activate: (context: ModuleContext) => void | Promise<void> | (() => void | Promise<void>);
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export * from './errors.js';
