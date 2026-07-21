const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  statPath: (targetPath) => ipcRenderer.invoke('fs:stat', targetPath),
  scanFolder: (folderPath) => ipcRenderer.invoke('fs:scanFolder', folderPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  exportPdf: (filePath) => ipcRenderer.invoke('file:exportPdf', filePath),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  loadHighlights: (filePath) => ipcRenderer.invoke('highlights:load', filePath),
  saveHighlights: (filePath, highlights) => ipcRenderer.invoke('highlights:save', filePath, highlights),
  getRecentFolders: () => ipcRenderer.invoke('store:getRecentFolders'),
  addRecentFolder: (folderPath) => ipcRenderer.invoke('store:addRecentFolder', folderPath),
  clearRecentFolders: () => ipcRenderer.invoke('store:clearRecentFolders'),
  getTheme: () => ipcRenderer.invoke('store:getTheme'),
  setTheme: (theme) => ipcRenderer.invoke('store:setTheme', theme),
  onUpdateAvailable: (callback) => {
    const sub1 = ipcRenderer.on('update:available', (_e, data) => callback({ type: 'available', ...data }))
    const sub2 = ipcRenderer.on('update:downloaded', (_e, data) => callback({ type: 'downloaded', ...data }))
    const sub3 = ipcRenderer.on('update:error', (_e, data) => callback({ type: 'error', ...data }))
    return () => { sub1(); sub2(); sub3() }
  },
  installUpdate: () => ipcRenderer.invoke('update:install')
})