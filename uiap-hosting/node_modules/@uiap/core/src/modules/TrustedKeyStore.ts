import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_KEYS_DIR = path.join(process.cwd(), 'trusted-keys');

/**
 * Manages trusted Ed25519 public keys for module signature verification.
 *
 * Public keys are stored as PEM files named `<keyId>.pem` in a trusted-keys
 * directory. Only public keys are stored — private keys must never appear
 * on the Edge.
 */
export class TrustedKeyStore {
  private readonly keysDir: string;
  private readonly cache: Map<string, string> = new Map();

  constructor(keysDir?: string) {
    this.keysDir = keysDir || process.env.UIAP_TRUSTED_KEYS_DIR || DEFAULT_KEYS_DIR;
  }

  /**
   * Looks up a trusted public key by keyId.
   * @returns PEM-encoded public key, or null if the keyId is not trusted
   */
  getPublicKey(keyId: string): string | null {
    // Sanitize keyId to prevent path traversal
    if (!keyId || keyId.includes('..') || keyId.includes('/') || keyId.includes('\\')) {
      return null;
    }

    if (this.cache.has(keyId)) {
      return this.cache.get(keyId)!;
    }

    const keyPath = path.join(this.keysDir, `${keyId}.pem`);
    try {
      if (!fs.existsSync(keyPath)) {
        return null;
      }
      const pem = fs.readFileSync(keyPath, 'utf8').trim();
      if (!pem.includes('BEGIN PUBLIC KEY')) {
        return null; // Not a valid public key PEM
      }
      this.cache.set(keyId, pem);
      return pem;
    } catch {
      return null;
    }
  }

  /**
   * Clears the in-memory key cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
