import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as https from 'https';
import { PG_BINARIES_URL, PG_BUILD_VERSION } from './postgres/version.js';

const rootDir = process.cwd();
const buildDir = path.join(rootDir, 'build/UIAP');
const dbBuildDir = path.join(rootDir, 'build/UIAP-Database');

const NODE_URL = 'https://nodejs.org/dist/v24.18.0/win-x64/node.exe';

function exec(cmd: string, cwd: string = rootDir) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

/**
 * Download a file from a URL with redirect support.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`Downloading ${url}...`);
  return new Promise<void>((resolve, reject) => {
    const follow = (currentUrl: string) => {
      https.get(currentUrl, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          follow(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}: ${currentUrl}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download complete.');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };
    follow(url);
  });
}

async function downloadNode() {
  const nodePath = path.join(buildDir, 'runtime/node.exe');
  await downloadFile(NODE_URL, nodePath);
}

function copyPackage(pkgPath: string) {
  const srcDir = path.join(rootDir, pkgPath);
  const destDir = path.join(buildDir, 'application', pkgPath);
  fs.mkdirSync(destDir, { recursive: true });

  // copy package.json
  fs.copyFileSync(path.join(srcDir, 'package.json'), path.join(destDir, 'package.json'));

  // copy dist if exists
  const distDir = path.join(srcDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.cpSync(distDir, path.join(destDir, 'dist'), { recursive: true });
  }
}

async function run() {
  console.log('--- UIAP Edge Windows Packager ---');

  // 1. Clean build dirs
  for (const dir of [buildDir, dbBuildDir]) {
    if (fs.existsSync(dir)) {
      console.log(`Cleaning old build: ${dir}...`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 2. Create UIAP structure
  console.log('Creating UIAP directory structure...');
  const uiapDirs = [
    'application',
    'data/configuration',
    'data/logs',
    'data/modules/installed',
    'data/backups',
    'runtime',
  ];
  uiapDirs.forEach((d) => fs.mkdirSync(path.join(buildDir, d), { recursive: true }));

  // 3. Create UIAP-Database structure
  console.log('Creating UIAP-Database directory structure...');
  const dbDirs = ['pgsql', 'data', 'scripts'];
  dbDirs.forEach((d) => fs.mkdirSync(path.join(dbBuildDir, d), { recursive: true }));

  // 4. Build UIAP Workspace
  console.log('Building UIAP Workspace...');
  exec('npm run build');

  // 5. Copy packages
  console.log('Copying application files...');
  fs.copyFileSync(
    path.join(rootDir, 'package.json'),
    path.join(buildDir, 'application/package.json'),
  );
  fs.copyFileSync(
    path.join(rootDir, 'package-lock.json'),
    path.join(buildDir, 'application/package-lock.json'),
  );

  copyPackage('packages/core');
  copyPackage('packages/module-sdk');
  copyPackage('apps/edge-api');
  copyPackage('apps/edge-web');

  // Copy trusted keys
  const keysDir = path.join(buildDir, 'application/trusted-keys');
  fs.mkdirSync(keysDir, { recursive: true });
  if (fs.existsSync(path.join(rootDir, 'trusted-keys/uiap-developer.pub'))) {
    fs.copyFileSync(
      path.join(rootDir, 'trusted-keys/uiap-developer.pub'),
      path.join(keysDir, 'uiap-developer.pub'),
    );
  }

  // 6. Install Production Dependencies
  console.log('Installing production dependencies...');
  exec('npm ci --omit=dev --ignore-scripts=false', path.join(buildDir, 'application'));

  // 7. Download Node.js
  await downloadNode();

  // 8. Download PostgreSQL binaries
  console.log(`\nDownloading PostgreSQL ${PG_BUILD_VERSION} binaries...`);
  const pgZipPath = path.join(rootDir, 'build', `postgresql-${PG_BUILD_VERSION}.zip`);
  await downloadFile(PG_BINARIES_URL, pgZipPath);

  const extractDir = path.join(rootDir, 'build', 'pg-extract');
  fs.mkdirSync(extractDir, { recursive: true });
  
  // Use Windows 10/11 native tar for much faster extraction than PowerShell Expand-Archive
  const extractCmd = `tar -xf "${pgZipPath}" -C "${extractDir}"`;
  console.log('Extracting PostgreSQL binaries (this might take a minute)...');
  exec(extractCmd);

  // The ZIP contains a top-level "pgsql" folder — move its contents to our dbBuildDir/pgsql
  const extractedPgsqlDir = path.join(rootDir, 'build', 'pg-extract', 'pgsql');
  if (fs.existsSync(extractedPgsqlDir)) {
    fs.cpSync(extractedPgsqlDir, path.join(dbBuildDir, 'pgsql'), { recursive: true });
    
    // Clean up unnecessary deep directories that bloat the installer and break MAX_PATH
    console.log('Cleaning up unnecessary PostgreSQL components (pgAdmin, docs, symbols)...');
    const toRemove = ['pgAdmin 4', 'doc', 'symbols', 'include'];
    for (const item of toRemove) {
      const itemPath = path.join(dbBuildDir, 'pgsql', item);
      if (fs.existsSync(itemPath)) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
    }
    
    console.log('PostgreSQL binaries extracted successfully.');
  } else {
    throw new Error('PostgreSQL ZIP extraction failed — pgsql directory not found.');
  }

  // Clean up ZIP and extraction temp
  fs.rmSync(pgZipPath, { force: true });
  fs.rmSync(path.join(rootDir, 'build', 'pg-extract'), { recursive: true, force: true });

  // 9. Compile and copy provisioning scripts
  console.log('Compiling provisioning scripts...');
  const provisionScriptsDir = path.join(dbBuildDir, 'scripts');

  // Compile TypeScript provisioning scripts to JS using tsc
  // We compile them individually since they're not part of the main workspace build
  exec(
    `npx tsc --outDir "${provisionScriptsDir}" --rootDir "${path.join(rootDir, 'scripts', 'postgres')}" --module Node16 --moduleResolution Node16 --target ES2024 --esModuleInterop --skipLibCheck --declaration false --sourceMap false "${path.join(rootDir, 'scripts', 'postgres', 'provision.ts')}" "${path.join(rootDir, 'scripts', 'postgres', 'detect.ts')}" "${path.join(rootDir, 'scripts', 'postgres', 'service.ts')}" "${path.join(rootDir, 'scripts', 'postgres', 'database.ts')}" "${path.join(rootDir, 'scripts', 'postgres', 'version.ts')}"`,
  );
  console.log('Provisioning scripts compiled.');

  console.log('Compiling Windows Service scripts...');
  const windowsScriptsDir = path.join(buildDir, 'application', 'scripts', 'windows');
  exec(
    `npx tsc --outDir "${windowsScriptsDir}" --rootDir "${path.join(rootDir, 'scripts', 'windows')}" --module Node16 --moduleResolution Node16 --target ES2024 --esModuleInterop --skipLibCheck --declaration false --sourceMap false "${path.join(rootDir, 'scripts', 'windows', 'service.ts')}" "${path.join(rootDir, 'scripts', 'windows', 'install-service.ts')}" "${path.join(rootDir, 'scripts', 'windows', 'uninstall-service.ts')}"`,
  );
  console.log('Windows Service scripts compiled.');

  // 10. Create start.bat
  console.log('Creating start.bat...');
  const startBat = `@echo off
set NODE_ENV=production
set UIAP_DATA_DIR=%~dp0data
set PORT=3000

echo [UIAP] Starting UIAP Edge API on port %PORT%...
echo [UIAP] Data directory: %UIAP_DATA_DIR%
echo [UIAP] Logs will be written to data\\logs\\uiap-edge.log

:: Start node and redirect both stdout and stderr to the log file
runtime\\node.exe application\\apps\\edge-api\\dist\\index.js >> data\\logs\\uiap-edge.log 2>&1`;
  fs.writeFileSync(path.join(buildDir, 'start.bat'), startBat);

  console.log('\n✅ Packaging complete!');
  console.log(`UIAP Application: ${buildDir}`);
  console.log(`UIAP Database:    ${dbBuildDir}`);
}

run().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
