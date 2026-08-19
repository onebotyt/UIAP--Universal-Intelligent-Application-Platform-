#!/usr/bin/env tsx
/**
 * UIAP Module Package Signer
 *
 * Signs a module directory into a distributable signed ZIP package.
 *
 * Usage: npm run sign:module -- <moduleDir> <privateKeyPath> <keyId>
 * Example: npm run sign:module -- modules/platform-proof-demo signing-keys/uiap-dev-001.private.pem uiap-dev-001
 *
 * Output: <moduleDir>/<moduleId>.signed.zip
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { hashBuffer, serializeHashFile } from '../packages/core/src/modules/crypto/hash.js';
import { computePackageDigest } from '../packages/core/src/modules/crypto/canonical.js';
import { signPackageDigest } from '../packages/core/src/modules/crypto/sign.js';

const moduleDir = process.argv[2];
const privateKeyPath = process.argv[3];
const keyId = process.argv[4];

if (!moduleDir || !privateKeyPath || !keyId) {
  console.error('Usage: npm run sign:module -- <moduleDir> <privateKeyPath> <keyId>');
  console.error(
    'Example: npm run sign:module -- modules/platform-proof-demo signing-keys/uiap-dev-001.private.pem uiap-dev-001',
  );
  process.exit(1);
}

const absModuleDir = path.resolve(moduleDir);
if (!fs.existsSync(absModuleDir)) {
  console.error(`Error: Module directory not found: ${absModuleDir}`);
  process.exit(1);
}

const manifestPath = path.join(absModuleDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found in ${absModuleDir}`);
  process.exit(1);
}

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Error: Private key not found: ${privateKeyPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`Signing module: ${manifest.id} v${manifest.version}`);
console.log(`Using key: ${keyId}`);

// 1. Build the ZIP with all module files
const zip = new AdmZip();

// Add manifest
zip.addLocalFile(manifestPath);

// Add standard directories if they exist
const dirs = ['dist', 'web', 'migrations', 'assets', 'server'];
for (const dir of dirs) {
  const dirPath = path.join(absModuleDir, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    zip.addLocalFolder(dirPath, dir);
  }
}

// 2. Compute file hashes (excluding package.sha256 and signature.json)
const fileHashes: Record<string, string> = {};
for (const entry of zip.getEntries()) {
  if (entry.isDirectory) continue;
  const name = entry.entryName.replace(/\\/g, '/');
  fileHashes[name] = hashBuffer(entry.getData());
}

// Sort by path
const sortedHashes: Record<string, string> = {};
for (const key of Object.keys(fileHashes).sort()) {
  sortedHashes[key] = fileHashes[key];
}

// 3. Generate package.sha256
const hashFileContent = serializeHashFile(sortedHashes);
zip.addFile('package.sha256', Buffer.from(hashFileContent, 'utf8'));

// 4. Compute canonical package digest
const packageDigest = computePackageDigest(manifest, sortedHashes);

// 5. Sign the digest
const signature = signPackageDigest(packageDigest, privateKey);

// 6. Generate signature.json
const signatureMetadata = {
  algorithm: 'Ed25519',
  keyId,
  packageDigest,
  signature,
  signedAt: new Date().toISOString(),
};
zip.addFile('signature.json', Buffer.from(JSON.stringify(signatureMetadata, null, 2), 'utf8'));

// 7. Write the signed ZIP
const outputPath = path.join(absModuleDir, `${manifest.id}.signed.zip`);
zip.writeZip(outputPath);

console.log(`✓ Signed package written to: ${outputPath}`);
console.log(`  Package digest: ${packageDigest}`);
console.log(`  Files hashed: ${Object.keys(sortedHashes).length}`);
