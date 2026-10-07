const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('opticsDesktop', Object.freeze({
  setup: details => ipcRenderer.invoke('setup-owner', details),
  setupComplete: () => ipcRenderer.invoke('setup-complete'),
  backup: token => ipcRenderer.invoke('backup', token),
  restore: token => ipcRenderer.invoke('restore', token),
}));

