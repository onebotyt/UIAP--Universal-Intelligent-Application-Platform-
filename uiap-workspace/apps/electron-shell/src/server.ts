import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as http from 'http';

let serverProcess: ChildProcess | null = null;
const API_PORT = 3000;

export async function startServer(databaseUrl: string): Promise<string> {
  console.log('[Edge API] Starting Node.js Server...');

  return new Promise((resolve, reject) => {
    try {
      const edgeApiPath = path.join(__dirname, '../../edge-api/dist/index.js');

      serverProcess = fork(edgeApiPath, [], {
        env: {
          ...process.env,
          PORT: API_PORT.toString(),
          DATABASE_URL: databaseUrl,
          UIAP_MODULES_DIR: path.join(__dirname, '../../../modules_data'),
        },
        stdio: 'inherit',
      });

      const serverUrl = `http://localhost:${API_PORT}`;
      
      const checkServer = () => {
        http.get(`${serverUrl}/api/health/live`, (res) => {
          if (res.statusCode === 200) {
            resolve(serverUrl);
          } else {
            setTimeout(checkServer, 1000);
          }
        }).on('error', () => {
          setTimeout(checkServer, 1000);
        });
      };

      // Start polling
      checkServer();

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
