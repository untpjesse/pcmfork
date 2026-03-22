import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Attempt to load the native J2534 addon
let j2534Native = null;
try {
  // In production, the .node file might be in a different relative path depending on packaging.
  // For development with node-gyp, it's usually in build/Release/
  j2534Native = require('./build/Release/j2534_native.node');
  console.log('Successfully loaded native J2534 addon.');
} catch (err) {
  console.warn('Failed to load native J2534 addon. This is expected if not built or not on Windows.', err.message);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    title: "PCM Hammer"
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  // Register IPC handlers for J2534 native functions
  ipcMain.handle('j2534:scanDevices', () => {
    if (j2534Native && j2534Native.scanDevices) {
      return j2534Native.scanDevices();
    }
    return []; // Fallback
  });

  ipcMain.handle('j2534:loadDLL', (event, dllPath) => {
    if (j2534Native && j2534Native.loadDLL) {
      return j2534Native.loadDLL(dllPath);
    }
    return false;
  });

  ipcMain.handle('j2534:passThruOpen', () => {
    if (j2534Native && j2534Native.passThruOpen) {
      return j2534Native.passThruOpen();
    }
    return { status: 1, deviceId: 0 }; // STATUS_ERR_NOT_SUPPORTED
  });

  ipcMain.handle('j2534:passThruClose', (event, deviceId) => {
    if (j2534Native && j2534Native.passThruClose) {
      return j2534Native.passThruClose(deviceId);
    }
    return 1;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
