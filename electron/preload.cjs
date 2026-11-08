// DesignShop Electron preload — the only bridge between the UI and the shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('designshop', {
  isDesktop: true,
  platformLabel: 'Electron',
  version: () => ipcRenderer.invoke('app:version'),
  platform: () => ipcRenderer.invoke('app:platform'),
  saveBinary: (payload) => ipcRenderer.invoke('dialog:saveBinary', payload),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  revealPath: (p) => ipcRenderer.invoke('shell:reveal', p),
  copyPng: (base64) => ipcRenderer.invoke('clipboard:copyPng', base64),
  autosave: (payload) => ipcRenderer.invoke('app:autosave', payload),
  setMenuLanguage: (labels) => ipcRenderer.invoke('menu:setLanguage', labels),
  installUpdate: (payload) => ipcRenderer.invoke('update:install', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onMenu: (handler) => {
    const channels = [
      'menu:new-design',
      'menu:open-file',
      'menu:save',
      'menu:quick-export',
      'menu:export',
      'menu:export-social',
      'menu:undo',
      'menu:redo',
      'menu:cut',
      'menu:copy',
      'menu:paste',
      'menu:duplicate',
      'menu:preferences',
      'menu:shortcuts',
      'menu:new-layer',
      'menu:new-text',
      'menu:delete-layer',
      'menu:merge-down',
      'menu:flatten',
      'menu:zoom-in',
      'menu:zoom-out',
      'menu:fit',
      'menu:language',
      'menu:theme',
      'menu:tour',
      'menu:about',
    ];
    for (const ch of channels) {
      ipcRenderer.on(ch, (_event, payload) => handler(ch.replace('menu:', ''), payload));
    }
  },
});
