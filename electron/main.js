// DesignShop — Electron shell.
// Provides the portable build and the NSIS installer for Windows plus
// AppImage / deb / rpm / tar.gz for Linux and Arch. The Rust (Tauri) shell in
// src-tauri provides the same app with a native webview — both share src/.
import { app, BrowserWindow, dialog, ipcMain, shell, Menu, clipboard, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !!process.env.VITE_DEV_SERVER_URL;
const APP_NAME = 'DesignShop';

app.setName(APP_NAME);
// Portable builds keep their data next to the executable.
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'DesignShop-Data'));
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1080,
    minHeight: 660,
    backgroundColor: '#0a0b10',
    show: false,
    title: APP_NAME,
    autoHideMenuBar: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // keep external links out of the app shell
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

const menuTemplate = (t = (k) => k) => [
  {
    label: t('menu.file'),
    submenu: [
      { label: t('menu.file.new'), accelerator: 'CmdOrCtrl+N', click: () => send('menu:new-design') },
      { label: t('menu.file.open'), accelerator: 'CmdOrCtrl+O', click: () => send('menu:open-file') },
      { type: 'separator' },
      { label: t('menu.file.save'), accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
      { label: t('menu.file.quickExport'), accelerator: 'CmdOrCtrl+Shift+E', click: () => send('menu:quick-export') },
      { label: t('menu.file.export'), accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:export') },
      { label: t('menu.file.exportSocial'), click: () => send('menu:export-social') },
      { type: 'separator' },
      { label: t('menu.file.quit'), role: 'quit' },
    ],
  },
  {
    label: t('menu.edit'),
    submenu: [
      { label: t('menu.edit.undo'), accelerator: 'CmdOrCtrl+Z', click: () => send('menu:undo') },
      { label: t('menu.edit.redo'), accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('menu:redo') },
      { type: 'separator' },
      { label: t('menu.edit.cut'), accelerator: 'CmdOrCtrl+X', click: () => send('menu:cut') },
      { label: t('menu.edit.copy'), accelerator: 'CmdOrCtrl+C', click: () => send('menu:copy') },
      { label: t('menu.edit.paste'), accelerator: 'CmdOrCtrl+V', click: () => send('menu:paste') },
      { label: t('menu.edit.duplicate'), accelerator: 'CmdOrCtrl+J', click: () => send('menu:duplicate') },
      { type: 'separator' },
      { label: t('menu.edit.preferences'), accelerator: 'CmdOrCtrl+,', click: () => send('menu:preferences') },
      { label: t('menu.edit.keyboard'), accelerator: 'CmdOrCtrl+/', click: () => send('menu:shortcuts') },
    ],
  },
  {
    label: t('menu.layer'),
    submenu: [
      { label: t('menu.layer.new'), accelerator: 'CmdOrCtrl+Shift+N', click: () => send('menu:new-layer') },
      { label: t('menu.layer.newText'), accelerator: 'T', click: () => send('menu:new-text') },
      { label: t('menu.layer.duplicate'), click: () => send('menu:duplicate') },
      { label: t('menu.layer.delete'), click: () => send('menu:delete-layer') },
      { label: t('menu.layer.mergeDown'), accelerator: 'CmdOrCtrl+E', click: () => send('menu:merge-down') },
      { label: t('menu.layer.flatten'), accelerator: 'CmdOrCtrl+Shift+F', click: () => send('menu:flatten') },
    ],
  },
  {
    label: t('menu.view'),
    submenu: [
      { label: t('menu.view.zoomIn'), accelerator: 'CmdOrCtrl+=', click: () => send('menu:zoom-in') },
      { label: t('menu.view.zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => send('menu:zoom-out') },
      { label: t('menu.view.fit'), accelerator: 'CmdOrCtrl+0', click: () => send('menu:fit') },
      { type: 'separator' },
      { label: t('menu.view.fullscreen'), accelerator: 'F11', role: 'togglefullscreen' },
      { label: t('menu.view.language'), click: () => send('menu:language') },
      { type: 'separator' },
      { label: t('menu.view.theme'), submenu: [
        { label: t('menu.view.themeDark'), click: () => send('menu:theme', 'dark') },
        { label: t('menu.view.themeLight'), click: () => send('menu:theme', 'light') },
        { label: t('menu.view.themeMidnight'), click: () => send('menu:theme', 'midnight') },
      ] },
    ],
  },
  {
    label: t('menu.help'),
    submenu: [
      { label: t('menu.help.shortcuts'), click: () => send('menu:shortcuts') },
      { label: t('menu.help.tour'), click: () => send('menu:tour') },
      { label: t('menu.help.docs'), click: () => shell.openExternal('https://github.com/Manixpcshot/DesignShop#readme') },
      { type: 'separator' },
      { label: t('menu.help.about'), click: () => send('menu:about') },
    ],
  },
];

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function buildMenu(labels) {
  const template = menuTemplate(labels);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------- IPC
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);

ipcMain.handle('dialog:saveBinary', async (_e, { fileName, base64, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save',
    defaultPath: path.join(app.getPath('pictures'), fileName || 'design.png'),
    filters: filters?.length ? filters : [{ name: 'All files', extensions: ['*'] }],
  });
  if (canceled || !filePath) return { canceled: true, path: null };
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return { canceled: false, path: filePath };
  } catch (err) {
    return { canceled: true, path: null, error: String(err) };
  }
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open',
    properties: ['openFile'],
    filters: [
      { name: 'Images & designs', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'dshop'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
      { name: 'DesignShop design', extensions: ['dshop'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePaths?.[0]) return null;
  const p = filePaths[0];
  const ext = path.extname(p).toLowerCase();
  const mime =
    ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : ext === '.bmp' ? 'image/bmp'
    : ext === '.dshop' ? 'application/json'
    : 'image/jpeg';
  return { fileName: path.basename(p), path: p, base64: fs.readFileSync(p).toString('base64'), mime };
});

ipcMain.handle('shell:reveal', (_e, p) => {
  if (p && fs.existsSync(p)) shell.showItemInFolder(p);
  return true;
});

ipcMain.handle('clipboard:copyPng', (_e, base64) => {
  const img = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'));
  clipboard.writeImage(img);
  return true;
});

ipcMain.handle('app:autosave', (_e, { fileName, text }) => {
  try {
    const dir = path.join(app.getPath('userData'), 'autosave');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, fileName || 'autosave.dshop');
    fs.writeFileSync(file, text, 'utf8');
    return file;
  } catch (err) {
    return null;
  }
});

ipcMain.handle('menu:setLanguage', (_e, labels) => {
  if (labels && typeof labels === 'object') buildMenu((k) => labels[k] || k);
  return true;
});


// ---------------------------------------------------------------- auto update
// The renderer decides *whether* an update exists (it talks to the GitHub
// API); the main process only performs the privileged part — download the
// installer, put it somewhere the user can find, and hand control over.
ipcMain.handle('update:install', async (_e, { url, version } = {}) => {
  if (!url) return { ok: false, error: 'no-url' };
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return { ok: false, error: `download failed (${res.status})` };
    const buf = Buffer.from(await res.arrayBuffer());
    const name = decodeURIComponent(String(url).split('/').pop() || `DesignShop-${version}`);
    const dir = path.join(app.getPath('downloads'), 'DesignShop');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    fs.writeFileSync(file, buf);

    if (process.platform === 'linux' && name.endsWith('.AppImage')) {
      fs.chmodSync(file, 0o755);
    }
    // Reveal the download and let the user run the installer. Replacing a
    // running binary in place is not safe on any platform, so we never do it.
    shell.showItemInFolder(file);
    await dialog.showMessageBox({
      type: 'info',
      title: `DesignShop ${version || ''}`.trim(),
      message: 'The new version has been downloaded.',
      detail: `Saved to:\n${file}\n\nClose DesignShop and open that file to finish updating.`,
      buttons: ['OK'],
    });
    return { ok: true, path: file };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('shell:openExternal', async (_e, url) => {
  if (!/^https?:\/\//i.test(String(url || ''))) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
  return true;
});

// ------------------------------------------------------------------ lifecycle
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    buildMenu();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
