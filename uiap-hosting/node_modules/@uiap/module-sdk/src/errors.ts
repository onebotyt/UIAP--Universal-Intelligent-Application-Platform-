/**
 * @uiap/module-sdk — Error Classes
 *
 * Standard error types that modules can throw to communicate
 * specific failure conditions to the UIAP Core runtime.
 */

/**
 * Thrown when a module permission check fails.
 * The Core runtime will translate this to an HTTP 403 response.
 */
export class ModulePermissionError extends Error {
  public readonly code = 'MODULE_PERMISSION_DENIED';

  constructor(
    public readonly moduleName: string,
    public readonly action: string,
    message?: string,
  ) {
    super(message || `Permission denied: ${moduleName}.${action}`);
    this.name = 'ModulePermissionError';
  }
}

/**
 * Thrown when a required configuration value is missing.
 */
export class ModuleConfigError extends Error {
  public readonly code = 'MODULE_CONFIG_ERROR';

  constructor(
    public readonly key: string,
    message?: string,
  ) {
    super(message || `Missing configuration: ${key}`);
    this.name = 'ModuleConfigError';
  }
}

/**
 * Thrown when a module fails to activate properly.
 * The Core runtime will catch this, log it, and disable the module.
 */
export class ModuleActivationError extends Error {
  public readonly code = 'MODULE_ACTIVATION_FAILED';

  constructor(
    public readonly moduleId: string,
    message?: string,
    public readonly cause?: Error,
  ) {
    super(message || `Module ${moduleId} failed to activate`);
    this.name = 'ModuleActivationError';
  }
}
