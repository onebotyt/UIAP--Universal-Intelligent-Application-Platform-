import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createSignedZip, createTestSigningContext } from '../packages/core/src/modules/testSigningHelper.js';

const MODULES_DIR = path.join(process.cwd(), 'modules');
const DIST_DIR = path.join(process.cwd(), 'dist-modules');
const KEYS_DIR = path.join(process.cwd(), 'trusted-keys');

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  console.log('[Packaging] Generating dev keypair...');
  const ctx = createTestSigningContext('uiap-dev-key');

  // Move the public key to trusted-keys so local server trusts it
  fs.copyFileSync(path.join(ctx.trustedKeysDir, 'uiap-dev-key.pem'), path.join(KEYS_DIR, 'uiap-dev-key.pem'));
  
  const modules = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const mod of modules) {
    const modPath = path.join(MODULES_DIR, mod);
    const manifestPath = path.join(modPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    const manifestStr = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestStr);

    console.log(`[Packaging] Building package for ${manifest.id}@${manifest.version}...`);

    const files: Record<string, string | Buffer> = {};
    
    // Recursive function to collect files
    function collectFiles(dir: string, baseDir: string = '') {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = baseDir ? path.posix.join(baseDir, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          collectFiles(fullPath, relativePath);
        } else {
          files[relativePath] = fs.readFileSync(fullPath);
        }
      }
    }

    // Include specific subdirectories
    collectFiles(path.join(modPath, 'dist'), 'dist');
    collectFiles(path.join(modPath, 'migrations'), 'migrations');
    collectFiles(path.join(modPath, 'web'), 'web');

    // Make sure we have dist/index.js if it's the entrypoint
    if (manifest.entrypoint && !files[manifest.entrypoint]) {
      console.warn(`[Packaging] Warning: Entrypoint ${manifest.entrypoint} not found for ${mod}. Did you build the module?`);
    }

    // Zip and sign
    const zipBuffer = createSignedZip({ manifest, files, ctx });
    
    const outName = `${mod}.zip`;
    const outPath = path.join(DIST_DIR, outName);
    fs.writeFileSync(outPath, zipBuffer);
    
    console.log(`[Packaging] Created ${outPath}`);
  }
  
  console.log('[Packaging] Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
