import fs from 'fs';
import { app, shell, BrowserWindow, protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import path, { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { initDatabase } from './database/database';
import { registerIpcHandlers } from './ipc';
import { ServiceManager } from './services/service-manager';
import { loadEnv, startEnvWatcher } from './env';

// Register custom media protocol as privileged before app is ready
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true
    }
  }
]);

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 768,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'DocuForge - Automated Video Studio',
    backgroundColor: '#0B0D10',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

// Ensure only one instance of PsychoNiche Generator runs to prevent disk cache locks
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ghibliforge.generator');

  // Handle media:// requests with robust streaming and instant image buffer delivery
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url);
      let filePath = '';
      if (url.searchParams.has('path')) {
        filePath = decodeURIComponent(url.searchParams.get('path')!);
      } else {
        filePath = decodeURIComponent(url.pathname);
        if (process.platform === 'win32' && filePath.startsWith('/')) {
          filePath = filePath.slice(1);
        }
      }
      if (filePath.includes('?')) {
        filePath = filePath.split('?')[0];
      }
      // Clean up any Windows forward slash anomalies
      filePath = path.normalize(filePath);

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.ass': 'text/plain; charset=utf-8',
        '.srt': 'text/plain; charset=utf-8',
        '.json': 'application/json; charset=utf-8'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // For image assets, serve directly from buffer with explicit headers for 100% reliable instant preview
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
        const buf = fs.readFileSync(filePath);
        return new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': buf.byteLength.toString(),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }

      // For audio, video and other media, stream via Chromium fetch
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.error('[Protocol media] Error serving file:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Load environment variables (.env.local / .env)
  loadEnv();
  startEnvWatcher();

  // Initialize SQLite database
  initDatabase();

  // Initialize cloud voice engine & AI services
  ServiceManager.startServices(app.getAppPath()).catch((err) => {
    console.error('[Main] Error launching AI sidecar services:', err);
  });

  const mainWindow = createWindow();
  registerIpcHandlers(mainWindow);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  ServiceManager.stopServices();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
