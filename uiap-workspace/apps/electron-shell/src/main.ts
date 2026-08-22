import { app, BrowserWindow, Tray, Menu, nativeImage, shell } from 'electron';
import * as path from 'path';
import { startPostgres, stopPostgres } from './postgres';
import { startServer, stopServer } from './server';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let serverUrl: string | null = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

async function startBackgroundServices() {
  try {
    const dbUrl = await startPostgres();
    serverUrl = await startServer(dbUrl);
    console.log('[Electron] Background services started.');
  } catch (err) {
    console.error('[Electron] Failed to start services:', err);
  }
}

async function stopBackgroundServices() {
  await stopServer();
  await stopPostgres();
  console.log('[Electron] Background services stopped.');
}

function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'UIAP Edge Server',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (serverUrl) {
    if (!app.isPackaged) {
      // Development mode: load Vite dev server for hot-reloading
      console.log('[Electron] Running in dev mode. Attempting to connect to Vite dev server...');
      mainWindow.loadURL('http://localhost:5174').catch(() => {
        // Fallback to 5173 if 5174 isn't used
        mainWindow!.loadURL('http://localhost:5173').catch(() => {
          console.log('[Electron] Vite dev server not found, falling back to static serverUrl');
          mainWindow!.loadURL(serverUrl!);
        });
      });
    } else {
      // Production mode: load static files from the Node.js Edge API
      mainWindow.loadURL(serverUrl);
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../public/loading.html')).catch(() => {});
  }

  // Prevent app from closing when X is clicked.
  mainWindow.on('close', (event: any) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      console.log('[Electron] Window hidden. Background services are still running.');
    }
    // If isQuitting is true, we let it close naturally.
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a default electron icon if no icon provided
  // In a real app we'd load a 16x16 .png or .ico
  // For the demo we use the nativeImage empty but we give it a tooltip
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const icon = nativeImage.createEmpty(); // fallback
  tray = new Tray(icon);

  tray.setToolTip('UIAP Edge Server');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        createWindow();
      },
    },
    {
      label: 'Open in Browser',
      click: () => {
        if (serverUrl) {
          shell.openExternal(serverUrl);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Restart Server',
      click: async () => {
        console.log('[Electron] Restarting services...');
        await stopBackgroundServices();
        await startBackgroundServices();
        if (mainWindow && serverUrl) {
          mainWindow.loadURL(serverUrl);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit / Shutdown Server',
      click: async () => {
        isQuitting = true;
        console.log('[Electron] Shutting down UIAP...');
        await stopBackgroundServices();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    createWindow();
  });
}

app.on('second-instance', () => {
  createWindow();
});

app.whenReady().then(async () => {
  createTray();
  await startBackgroundServices();
  createWindow();
});

// On Mac, recreate window if app is clicked in dock
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// This intercepts Cmd+Q or Alt+F4 if they manage to trigger quitting bypassing the X button logic
// Normally 'window-all-closed' is the event, but we prevented 'close' on the window.
// If the app is quitting for any reason (e.g. system shutdown), we need to ensure background processes die.
app.on('before-quit', async (event: any) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    await stopBackgroundServices();
    app.quit();
  }
});
