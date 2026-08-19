import { Service } from 'node-windows';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceScript = path.join(__dirname, 'service.js');

if (!fs.existsSync(serviceScript)) {
  console.log('[UIAP Uninstaller] Service script not found, assuming already removed.');
  process.exit(0);
}

// Ensure processes are aggressively killed during uninstall
function killLingeringProcesses() {
  console.log('[UIAP Uninstaller] Cleaning up lingering processes...');
  exec('taskkill /F /IM postgres.exe /T', () => {});
  exec('taskkill /F /IM pg_ctl.exe /T', () => {});
  exec('taskkill /F /IM node.exe /T', () => {});
}

const svc = new Service({
  name: 'UIAP-Edge',
  description: 'UIAP Local Edge Application',
  script: serviceScript,
});

svc.on('uninstall', () => {
  console.log('[UIAP Uninstaller] Service uninstalled completely.');
  
  // Remove Firewall rule
  console.log('[UIAP Uninstaller] Removing Windows Firewall rule...');
  const ruleCmd = `netsh advfirewall firewall delete rule name="UIAP Edge"`;
  exec(ruleCmd, (error, stdout, stderr) => {
    if (error) {
      console.warn(`[UIAP Uninstaller] Warning: Could not remove firewall rule: ${stderr}`);
    } else {
      console.log('[UIAP Uninstaller] Firewall rule removed.');
    }
  });
});

svc.on('stop', () => {
    console.log('[UIAP Uninstaller] Service stopped.');
});

console.log('[UIAP Uninstaller] Stopping and uninstalling UIAP-Edge service...');
svc.uninstall();

// Also stop the database service directly using sc
console.log('[UIAP Uninstaller] Stopping UIAP-PostgreSQL service...');
exec('sc stop UIAP-PostgreSQL', () => {
    console.log('[UIAP Uninstaller] Uninstalling UIAP-PostgreSQL service...');
    exec('sc delete UIAP-PostgreSQL', () => {
        killLingeringProcesses();
    });
});
