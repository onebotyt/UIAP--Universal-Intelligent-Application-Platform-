import * as crypto from 'crypto';
import type AdmZip from 'adm-zip';

/** Files excluded from hash computation (they are outputs, not inputs). */
const EXCLUDED_FILES = new Set(['package.sha256', 'signature.json']);

/**
 * Computes the SHA-256 hash of a Buffer.
 * @returns Hex-encoded SHA-256 string
 */
export function hashBuffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Iterates all entries in an AdmZip archive and computes SHA-256 hashes
 * for each file, excluding `package.sha256` and `signature.json`.
 *
 * Directories are skipped. Paths are normalized to forward-slash.
 *
 * @returns Sorted map of { relativePath: sha256hex }
 */
export function hashZipEntries(zip: AdmZip): Record<string, string> {
  const hashes: Record<string, string> = {};

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;

    const name = entry.entryName.replace(/\\/g, '/');
    if (EXCLUDED_FILES.has(name)) continue;

    hashes[name] = hashBuffer(entry.getData());
  }

  // Return sorted by path for determinism
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(hashes).sort()) {
    sorted[key] = hashes[key];
  }
  return sorted;
}

/**
 * Serializes a file-hash map into the `package.sha256` text format.
 * Format: `<sha256hex>  <relative-path>` (two spaces, sorted by path)
 */
export function serializeHashFile(hashes: Record<string, string>): string {
  return Object.entries(hashes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, hash]) => `${hash}  ${path}`)
    .join('\n');
}

/**
 * Parses a `package.sha256` text file into a file-hash map.
 */
export function parseHashFile(content: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: <hex>  <path> (two spaces)
    const idx = trimmed.indexOf('  ');
    if (idx === -1) continue;
    const hash = trimmed.substring(0, idx);
    const path = trimmed.substring(idx + 2);
    if (hash && path) {
      hashes[path] = hash;
    }
  }
  return hashes;
}
