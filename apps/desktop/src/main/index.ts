import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import { runMigrations } from './db.js';
import { registerIpc } from './ipc.js';

function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 760,
    webPreferences: {
      preload: join(app.getAppPath(), 'dist/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(join(app.getAppPath(), 'dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  try {
    runMigrations();
    registerIpc();
    createWindow();
  } catch (error) {
    void dialog.showErrorBox('Ошибка БД/подключения', String(error));
    app.quit();
  }
});
