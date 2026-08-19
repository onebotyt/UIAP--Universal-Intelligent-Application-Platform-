import { Service } from 'node-windows';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiapRoot = path.resolve(__dirname, '../../../');
const serviceScript = path.join(__dirname, 'service.js');

// Verify service script exists
if (!fs.existsSync(serviceScript)) {
  console.error(`[UIAP Installer] Service script not found at ${serviceScript}`);
  process.exit(1);
}

// Ensure logs directory exists
const logsDir = path.join(uiapRoot, 'data', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create the Windows Service configuration
const svc = new Service({
  name: 'UIAP-Edge',
  description: 'UIAP Local Edge Application',
  script: serviceScript,
  nodeOptions: [
    '--enable-source-maps'
  ],
  stopparentfirst: true, // Sends Ctrl+C instead of TaskKill for graceful shutdown
  wait: 2,               // Wait 2 seconds between restarts
  grow: 0.25,            // Increase wait time by 25% if failures continue
  maxRestarts: 10,       // Max restarts in 60s
  env: [
    {
      name: 'UIAP_DATA_DIR',
      value: path.join(uiapRoot, 'data')
    },
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

svc.on('install', () => {
  console.log('[UIAP Installer] Service installed successfully.');
  
  // 1. Configure the dependency on UIAP-PostgreSQL so they start in correct order
  console.log('[UIAP Installer] Configuring service dependency on UIAP-PostgreSQL...');
  exec('sc config uiapedge depend= UIAP-PostgreSQL', (error, stdout, stderr) => {
    if (error) {
      console.warn(`[UIAP Installer] Warning: Could not configure service dependency: ${stderr}`);
    } else {
      console.log('[UIAP Installer] Service dependency configured successfully.');
    }
    
    // 2. Add Firewall rule to allow port 3000
    console.log('[UIAP Installer] Adding Windows Firewall rule for UIAP Edge...');
    const ruleCmd = `netsh advfirewall firewall add rule name="UIAP Edge" dir=in action=allow protocol=TCP localport=3000`;
    exec(ruleCmd, (fwError, fwStdout, fwStderr) => {
      if (fwError) {
         console.warn(`[UIAP Installer] Warning: Could not add firewall rule (ensure you run as Administrator): ${fwStderr}`);
      } else {
         console.log('[UIAP Installer] Firewall rule added.');
      }
      
      // 3. Start the service
      console.log('[UIAP Installer] Starting UIAP-Edge service...');
      svc.start();
    });
  });
});

svc.on('alreadyinstalled', () => {
  console.log('[UIAP Installer] Service is already installed.');
  console.log('[UIAP Installer] Starting service...');
  svc.start();
});

svc.on('start', () => {
  console.log('[UIAP Installer] UIAP-Edge service started.');
});

// Install the script as a service
console.log('[UIAP Installer] Installing UIAP-Edge Windows Service...');
svc.install();
