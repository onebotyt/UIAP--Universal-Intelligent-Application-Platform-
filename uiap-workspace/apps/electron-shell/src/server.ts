import { ChildProcess, fork } from 'child_process';
import * as path from 'path';

let serverProcess: ChildProcess | null = null;
const API_PORT = 3000;

export async function startServer(databaseUrl: string): Promise<string> {
  console.log('[Edge API] Starting Node.js Server...');
  
  return new Promise((resolve, reject) => {
    try {
      // In production, we run the compiled JS of the edge-api
      // For development in the workspace, we might need ts-node or just use the dist output
      // Let's assume we are running the compiled dist/index.js
      const edgeApiPath = path.join(__dirname, '../../edge-api/dist/index.js');
      
      serverProcess = fork(edgeApiPath, [], {
        env: {
          ...process.env,
          PORT: API_PORT.toString(),
          DATABASE_URL: databaseUrl,
          UIAP_MODULES_DIR: path.join(__dirname, '../../../modules_data')
        },
        stdio: 'inherit' // pipe logs to the electron console
      });

      // Wait a moment for the server to start (in a real scenario, we'd wait for a specific stdout log)
      setTimeout(() => {
        resolve(`http://localhost:${API_PORT}`);
      }, 3000);
      
    } catch (e) {
      reject(e);
    }
  });
}

export async function stopServer(): Promise<void> {
  if (serverProcess) {
    console.log('[Edge API] Stopping Node.js Server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}
