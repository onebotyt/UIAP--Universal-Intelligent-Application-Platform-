/**
 * scripts/postgres/version.ts
 *
 * Pinned PostgreSQL version constants for UIAP Edge Windows deployment.
 * This is the single source of truth for the bundled PostgreSQL version.
 */

/** The pinned major.minor.patch version of PostgreSQL that UIAP bundles and supports. */
export const PG_VERSION = '17.2';

/** The full EDB binary ZIP version string (includes build suffix). */
export const PG_BUILD_VERSION = '17.2-2';

/** Download URL for the EDB portable Windows x64 binaries ZIP. */
export const PG_BINARIES_URL = `https://get.enterprisedb.com/postgresql/postgresql-${PG_BUILD_VERSION}-windows-x64-binaries.zip`;

/** The Windows service name used when UIAP provisions its own PostgreSQL. */
export const PG_SERVICE_NAME = 'UIAP-PostgreSQL';

/** Default PostgreSQL port. */
export const PG_DEFAULT_PORT = 5432;

/** The superuser name used during initdb. */
export const PG_SUPERUSER = 'postgres';

/** The UIAP-specific database name. */
export const UIAP_DATABASE = 'uiap';

/** The UIAP-specific restricted role name. */
export const UIAP_DB_USER = 'uiap_user';

/**
 * Minimum supported major version for an existing PostgreSQL installation.
 * If an organization already has PostgreSQL installed, we require at least this major version.
 */
export const PG_MIN_MAJOR_VERSION = 14;

/**
 * Maximum supported major version for an existing PostgreSQL installation.
 */
export const PG_MAX_MAJOR_VERSION = 17;

/**
 * Check whether a detected version string is within our supported range.
 */
export function isVersionSupported(versionString: string): boolean {
  const match = versionString.match(/(\d+)/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  return major >= PG_MIN_MAJOR_VERSION && major <= PG_MAX_MAJOR_VERSION;
}

/**
 * Extract the major version number from a version string.
 */
export function parseMajorVersion(versionString: string): number | null {
  const match = versionString.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
