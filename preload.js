const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveProject: (data) => ipcRenderer.invoke('save-project', data),
    loadProject: () => ipcRenderer.invoke('load-project'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    getDirectoryTree: (path) => ipcRenderer.invoke('get-directory-tree', path),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    writeFile: (args) => ipcRenderer.invoke('write-file', args),
});

window.addEventListener('DOMContentLoaded', () => {
    console.log("VisualMenu Desktop Bridge Active - Native File IO Enabled");
});
