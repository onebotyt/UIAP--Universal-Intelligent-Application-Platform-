#!/usr/bin/env tsx
/**
 * UIAP Ed25519 Keypair Generator
 *
 * Generates a signing keypair for module packages.
 * - Public key → trusted-keys/<keyId>.pem (safe to commit)
 * - Private key → signing-keys/<keyId>.private.pem (NEVER commit)
 *
 * Usage: npm run sign:keygen -- <keyId>
 * Example: npm run sign:keygen -- uiap-dev-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateKeyPair } from '../packages/core/src/modules/crypto/sign.js';

const keyId = process.argv[2];
if (!keyId) {
  console.error('Usage: npm run sign:keygen -- <keyId>');
  console.error('Example: npm run sign:keygen -- uiap-dev-001');
  process.exit(1);
}

// Sanitize
if (keyId.includes('..') || keyId.includes('/') || keyId.includes('\\')) {
  console.error('Error: keyId must not contain path separators or ".."');
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPair();

// Public key → trusted-keys/
const trustedDir = path.join(process.cwd(), 'trusted-keys');
fs.mkdirSync(trustedDir, { recursive: true });
const pubPath = path.join(trustedDir, `${keyId}.pem`);
fs.writeFileSync(pubPath, publicKey, 'utf8');
console.log(`✓ Public key written to: ${pubPath}`);

// Private key → signing-keys/ (gitignored)
const signingDir = path.join(process.cwd(), 'signing-keys');
fs.mkdirSync(signingDir, { recursive: true });
const privPath = path.join(signingDir, `${keyId}.private.pem`);
fs.writeFileSync(privPath, privateKey, { encoding: 'utf8', mode: 0o600 });
console.log(`✓ Private key written to: ${privPath}`);
console.log('');
console.log('⚠  IMPORTANT: Never commit the private key to version control!');
console.log('   The signing-keys/ directory is gitignored.');
