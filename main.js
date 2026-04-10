const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        backgroundColor: '#050608',
        icon: path.join(__dirname, 'visualmenu_app_icon_1775778092613.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Remove default menu bar for a cleaner look
    Menu.setApplicationMenu(null);

    win.loadFile('index.html');

    // Optional: Open DevTools on start if needed during early builds
    // win.webContents.openDevTools();
}

// IPC Handlers for Native File Operations
ipcMain.handle('save-project', async (event, projectData) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save VisualMenu Project',
        defaultPath: 'MyProject.vmproj',
        filters: [{ name: 'VisualMenu Project', extensions: ['vmproj'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(projectData, null, 4));
        return { success: true, path: filePath };
    }
    return { success: false };
});

ipcMain.handle('load-project', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Open VisualMenu Project',
        filters: [{ name: 'VisualMenu Project', extensions: ['vmproj'] }],
        properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
        const content = fs.readFileSync(filePaths[0], 'utf-8');
        return JSON.parse(content);
    }
    return null;
});

// NEW: Source Folder Selection
ipcMain.handle('select-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Select Source Root Folder',
        properties: ['openDirectory']
    });
    return filePaths[0] || null;
});

// NEW: Recursive Directory Tree (Scanning for .java, .gd, .cs)
ipcMain.handle('get-directory-tree', async (event, dirPath) => {
    function scanDir(dir, base) {
        const results = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            if (item === 'node_modules' || item === '.git' || item === 'build' || item === 'dist') continue;
            
            const fullPath = path.join(dir, item);
            const relPath = path.relative(base, fullPath);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                const children = scanDir(fullPath, base);
                if (children.length > 0) {
                    results.push({ name: item, path: fullPath, rel: relPath, type: 'dir', children });
                }
            } else {
                const ext = path.extname(item).toLowerCase();
                if (['.java', '.gd', '.cs'].includes(ext)) {
                    results.push({ name: item, path: fullPath, rel: relPath, type: 'file' });
                }
            }
        }
        return results;
    }
    
    try {
        return scanDir(dirPath, dirPath);
    } catch (e) {
        console.error("Tree Scan Error:", e);
        return [];
    }
});

// NEW: Native Read File
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        return null;
    }
});

// NEW: Native Write File (Sync to Source)
ipcMain.handle('write-file', async (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    } catch (e) {
        console.error("Write File Error:", e);
        return false;
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
