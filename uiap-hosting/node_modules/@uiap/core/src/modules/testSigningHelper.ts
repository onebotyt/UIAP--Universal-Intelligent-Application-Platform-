/**
 * Test helper: creates signed module ZIP packages for testing.
 * Generates a fresh Ed25519 keypair and writes the public key
 * to a temporary trusted-keys directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import { generateKeyPair, signPackageDigest } from './crypto/sign.js';
import { hashBuffer, serializeHashFile } from './crypto/hash.js';
import { computePackageDigest } from './crypto/canonical.js';

export interface TestSigningContext {
  keyId: string;
  publicKey: string;
  privateKey: string;
  trustedKeysDir: string;
}

/**
 * Sets up a temporary trusted-keys directory with a fresh keypair.
 */
export function createTestSigningContext(keyId = 'test-key-001'): TestSigningContext {
  const { publicKey, privateKey } = generateKeyPair();
  const trustedKeysDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uiap-trusted-keys-'));
  fs.writeFileSync(path.join(trustedKeysDir, `${keyId}.pem`), publicKey, 'utf8');
  return { keyId, publicKey, privateKey, trustedKeysDir };
}

/**
 * Cleans up the temporary trusted-keys directory.
 */
export function cleanupTestSigningContext(ctx: TestSigningContext): void {
  try {
    fs.rmSync(ctx.trustedKeysDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export interface SignedZipOptions {
  manifest: Record<string, unknown>;
  files?: Record<string, string | Buffer>;
  ctx: TestSigningContext;
}

/**
 * Creates a properly signed module ZIP buffer for testing.
 */
export function createSignedZip(opts: SignedZipOptions): Buffer {
  const { manifest, files = {}, ctx } = opts;

  const zip = new AdmZip();

  // Add manifest
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf8'));

  // Add additional files
  for (const [name, content] of Object.entries(files)) {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    zip.addFile(name, buf);
  }

  // Compute file hashes
  const fileHashes: Record<string, string> = {};
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    fileHashes[name] = hashBuffer(entry.getData());
  }

  // Sort
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(fileHashes).sort()) {
    sorted[key] = fileHashes[key];
  }

  // Add package.sha256
  zip.addFile('package.sha256', Buffer.from(serializeHashFile(sorted), 'utf8'));

  // Compute digest and sign
  const packageDigest = computePackageDigest(manifest, sorted);
  const signature = signPackageDigest(packageDigest, ctx.privateKey);

  // Add signature.json
  const sigMeta = {
    algorithm: 'Ed25519',
    keyId: ctx.keyId,
    packageDigest,
    signature,
    signedAt: new Date().toISOString(),
  };
  zip.addFile('signature.json', Buffer.from(JSON.stringify(sigMeta, null, 2), 'utf8'));

  return zip.toBuffer();
}
