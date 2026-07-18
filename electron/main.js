
const { app, BrowserWindow, shell, ipcMain, dialog, Menu, MenuItem, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { GoogleGenAI } = require('@google/genai');

let mainWindow = null;
let serverProcess = null;

function startBackendServer() {
  if (!app.isPackaged) return; // In dev, concurrently starts the server

  const serverPath = path.join(__dirname, '../dist/server.cjs');
  console.log('Loading backend server from:', serverPath);

  try {
    if (fs.existsSync(serverPath)) {
      // Use require to start the server directly in the main process.
      // This is more reliable than fork in many packaged environments.
      require(serverPath);
      console.log('Backend server initialized successfully.');
    } else {
      console.error('Backend server file not found at:', serverPath);
    }
  } catch (err) {
    console.error('Error initializing backend server:', err);
  }
}

function stopBackendServer() {
  // When using require, the server runs in the main process.
  // Express doesn't have a simple global "stop" unless we store the server instance.
  // Since the whole app is quitting, the process exit will clean it up.
}

// License file path
const getLicensePath = () => path.join(app.getPath('userData'), 'license.json');

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Frameless for custom title bar
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false, 
      contextIsolation: true,
      webSecurity: false,
      spellcheck: true
    },
    backgroundColor: '#111827'
  });

  // Start maximized
  mainWindow.maximize();

  // --- SPELL CHECK CONTEXT MENU ---
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      params.dictionarySuggestions.forEach(suggestion => {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        }));
      });
      menu.append(new MenuItem({ type: 'separator' }));
    }
    menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
    menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
    menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    menu.popup();
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// --- IPC HANDLERS ---
let isDirty = false;

ipcMain.on('update-dirty-status', (event, dirty) => {
    isDirty = dirty;
});

ipcMain.handle('call-ai', async (event, params, headers) => {
    try {
        const settingsKey = headers['x-gemini-api-key'];
        const apiKey = (settingsKey && settingsKey !== 'undefined') ? settingsKey : process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("Gemini API Key is missing. Please provide it in settings or environment.");
        }

        const genAI = new GoogleGenAI({ 
            apiKey: apiKey,
            httpOptions: { apiVersion: 'v1beta' }
        });
        const { model: modelName, contents, config } = params;

        // Model mapping logic (keep in sync with server.ts)
        const modelMap = {
            'gemini-2.0-flash': 'gemini-3.5-flash',
            'gemini-1.5-flash': 'gemini-3.5-flash',
            'gemini-1.5-pro': 'gemini-3.1-pro-preview'
        };

        const mappedModel = modelMap[modelName] || 'gemini-3.5-flash';
        
        const response = await genAI.models.generateContent({
            model: mappedModel,
            contents: contents,
            config: config
        });

        return {
            text: response.text || "",
            candidates: response.candidates
        };
    } catch (error) {
        console.error('IPC AI Call Failed:', error);
        
        // Check for quota exceeded (429) errors
        const isQuotaExceeded = 
            error.message?.includes("429") || 
            error.message?.includes("RESOURCE_EXHAUSTED") ||
            (error.status === 429);

        if (isQuotaExceeded) {
            throw new Error("Quota Exceeded: You've reached the limit for the free Gemini API tier. Please wait a minute before trying again, or provide your own Gemini API key in settings for higher limits.");
        }

        throw error;
    }
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
});
ipcMain.on('window-close', async () => {
    if (mainWindow) {
        if (isDirty) {
            mainWindow.webContents.send('request-close-confirmation');
        } else {
            mainWindow.destroy();
        }
    }
});

ipcMain.on('force-close-app', () => {
    if (mainWindow) {
        mainWindow.destroy();
    }
});

/**
 * AUTOMATED VERSION CHECK
 */
ipcMain.handle('check-for-updates', async () => {
    return new Promise((resolve) => {
        const request = net.request({
            method: 'GET',
            protocol: 'https:',
            hostname: 'api.github.com',
            path: '/repos/tastypooh-sketch/novelis/releases/latest',
            headers: {
                'User-Agent': 'Novelis-Desktop-App'
            }
        });
        
        request.on('response', (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                if (response.statusCode !== 200) {
                    resolve({ error: `GitHub API returned ${response.statusCode}` });
                    return;
                }

                try {
                    const release = JSON.parse(data);
                    const currentVersion = app.getVersion();
                    const latestVersion = release.tag_name.replace(/^v/, '');
                    const cleanCurrent = currentVersion.replace(/^v/, '');

                    resolve({
                        currentVersion: cleanCurrent,
                        latestVersion: latestVersion,
                        releaseNotes: release.body,
                        updateUrl: 'https://app.lemonsqueezy.com/my-orders',
                        isNewer: latestVersion !== cleanCurrent 
                    });
                } catch (e) {
                    resolve({ error: 'Failed to parse GitHub response' });
                }
            });
        });
        
        request.on('error', (err) => {
            resolve({ error: 'Network error checking for updates' });
        });
        
        request.end();
    });
});

// 1. Export Zip (Save As Dialog)
ipcMain.handle('save-file', async (event, { name, content }) => {
    if (!mainWindow) return false;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: name,
      filters: [{ name: 'Zip Files', extensions: ['zip'] }]
    });
    if (canceled || !filePath) return false;
    try {
      fs.writeFileSync(filePath, Buffer.from(content));
      return true;
    } catch (e) {
      console.error('Failed to save file:', e);
      return false;
    }
});

// 2. Select Directory
ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'] 
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
});

// 3. Write ZIP to Folder (Direct Write with Archiving)
ipcMain.handle('write-zip-to-folder', async (event, folderPath, fileName, content) => {
    try {
      if (!folderPath || !fileName || !content) {
        console.error('Missing parameters for write-zip-to-folder');
        return false;
      }

      // ARCHIVE EXISTING ZIPS IN ROOT (Spec 2)
      const cumulativePath = path.join(folderPath, 'Cumulative Saves');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const files = fs.readdirSync(folderPath);
      
      // Filter for existing session zips in the root (excluding the one we are about to write)
      // We also catch any .zip files to be safe
      const existingZips = files.filter(f => f.endsWith('.zip') && f !== fileName);
      
      if (existingZips.length > 0) {
        if (!fs.existsSync(cumulativePath)) {
          fs.mkdirSync(cumulativePath, { recursive: true });
        }
        
        for (const f of existingZips) {
          const oldPath = path.join(folderPath, f);
          const newPath = path.join(cumulativePath, f);
          try {
            // Check if destination already exists, if so append timestamp to avoid collision
            let finalNewPath = newPath;
            if (fs.existsSync(newPath)) {
                const ext = path.extname(f);
                const base = path.basename(f, ext);
                finalNewPath = path.join(cumulativePath, `${base}_${Date.now()}${ext}`);
            }
            fs.renameSync(oldPath, finalNewPath);
          } catch (renameErr) {
            console.error(`Failed to move ${f} to archive:`, renameErr);
          }
        }
      }

      const filePath = path.join(folderPath, fileName);
      const buffer = Buffer.from(content);
      
      if (buffer.length === 0) {
          console.error("Attempting to save a 0-byte ZIP file. Aborting.");
          return false;
      }

      fs.writeFileSync(filePath, buffer);
      console.log(`Successfully saved project to: ${filePath} (${buffer.length} bytes)`);
      return true;
    } catch (e) {
      console.error('Failed to write zip file:', e);
      return false;
    }
});

// Write History Version
ipcMain.handle('write-history-version', async (event, folderPath, fileName, content) => {
    try {
      if (!folderPath) return false;
      const historyDir = path.join(folderPath, 'Cumulative Saves');
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }
      const filePath = path.join(historyDir, fileName);
      fs.writeFileSync(filePath, content || '', 'utf8');
      return true;
    } catch (e) {
      console.error('Failed to write history file:', e);
      return false;
    }
});

// Read History List (for Version History Modal)
ipcMain.handle('read-history-list', async (event, folderPath, prefix) => {
    try {
      if (!folderPath) return [];
      const historyDir = path.join(folderPath, 'Cumulative Saves');
      if (!fs.existsSync(historyDir)) return [];
      const files = fs.readdirSync(historyDir);
      const list = [];
      for (const f of files) {
        if (f.startsWith(prefix) && f.endsWith('.rtf')) {
          const filePath = path.join(historyDir, f);
          const stats = fs.statSync(filePath);
          list.push({
            name: f,
            mtimeMs: stats.mtimeMs
          });
        }
      }
      return list;
    } catch (e) {
      console.error('Failed to read history files list:', e);
      return [];
    }
});

// Read History File Content (for Version History Modal Preview)
ipcMain.handle('read-history-file', async (event, folderPath, fileName) => {
    try {
      if (!folderPath) return null;
      const filePath = path.join(folderPath, 'Cumulative Saves', fileName);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.error('Failed to read history file content:', e);
      return null;
    }
});

// 4. Scan for Latest ZIP (Spec 1)
ipcMain.handle('scan-for-latest-zip', async (event, folderPath) => {
    try {
        if (!folderPath || !fs.existsSync(folderPath)) return null;
        
        // Use fs.promises for non-blocking I/O
        const files = await fs.promises.readdir(folderPath);
        // Improved regex to match various timestamp formats including the new ProjectName_YYYYMMDD_HHMMSS.zip
        const regex = /(_\d{8}_\d{6}|_\d{2}_[A-Za-z]{3}_\d{2}_\d{2}|\s\d{2}-[A-Za-z]{3}-\d{2}\s\d{2}_\d{2})\.zip$/;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const zipFiles = [];
        for (const f of files) {
            if (f.endsWith('.zip')) {
                try {
                    const filePath = path.join(folderPath, f);
                    const stats = await fs.promises.stat(filePath);
                    let date = stats.mtime;

                    // Try to parse date from filename for better precision than mtime
                    const match = f.match(/_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.zip$/);
                    if (match) {
                        const [_, y, m, d, hh, mm, ss] = match;
                        date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
                    } else {
                        // Fallback to older formats
                        const oldMatch = f.match(/_(\d{2})_([A-Za-z]{3})_(\d{2})_(\d{2})\.zip$/);
                        if (oldMatch) {
                             const [ , dd, mmm, hh, mm] = oldMatch;
                             const monthIndex = months.findIndex(m => m.toLowerCase() === mmm.toLowerCase());
                             if (monthIndex !== -1) {
                                 const now = new Date();
                                 date = new Date(now.getFullYear(), monthIndex, parseInt(dd), parseInt(hh), parseInt(mm));
                                 if (date > now) { date.setFullYear(date.getFullYear() - 1); }
                             }
                        }
                    }
                    zipFiles.push({ name: f, path: filePath, date: date });
                } catch (statErr) {
                    console.error(`Failed to stat ${f}:`, statErr);
                }
            }
        }

        zipFiles.sort((a, b) => b.date.getTime() - a.date.getTime());

        if (zipFiles.length > 0) {
            const latest = zipFiles[0];
            const stats = await fs.promises.stat(latest.path);
            if (stats.size > 200 * 1024 * 1024) { // 200MB limit for safe IPC
                throw new Error("Project file is too large to load (max 200MB).");
            }
            if (stats.size === 0) {
                console.warn(`Latest zip ${latest.name} is 0 bytes. Searching for previous valid zip.`);
                // Optionally find next valid one, but for now just skip
                const validZips = zipFiles.filter(z => fs.statSync(z.path).size > 0);
                if (validZips.length === 0) return null;
                const nextLatest = validZips[0];
                const content = await fs.promises.readFile(nextLatest.path);
                return { name: nextLatest.name, path: nextLatest.path, date: nextLatest.date.getTime(), content: content };
            }

            const content = await fs.promises.readFile(latest.path);
            return { name: latest.name, path: latest.path, date: latest.date.getTime(), content: content };
        }
        return null;
    } catch (e) {
        console.error("Scan failed:", e);
        return null;
    }
});

// 5. Open File Dialog (General)
ipcMain.handle('open-file-dialog', async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Zip Files', extensions: ['zip'] }]
    });
    if (canceled || filePaths.length === 0) return null;
    try {
        const content = fs.readFileSync(filePaths[0]);
        return { name: path.basename(filePaths[0]), content: content };
    } catch (e) {
        console.error("Read failed", e);
        return null;
    }
});

// 6. LICENSE ACTIVATION (LEMON SQUEEZY)
// Removed "DEV-MODE" bypass for public repository security.
ipcMain.handle('activate-license', async (event, licenseKey) => {
    try {
        const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                license_key: licenseKey,
                instance_name: 'Novelis_Desktop',
            })
        });

        const data = await response.json();

        if (data.activated) {
            fs.writeFileSync(getLicensePath(), JSON.stringify({
                key: licenseKey,
                activated: true,
                meta: data
            }));
            return { success: true };
        } else {
            return { success: false, error: data.error || 'Activation failed.' };
        }
    } catch (error) {
        console.error("Activation Error:", error);
        return { success: false, error: 'Network error occurred.' };
    }
});

// 7. CHECK LICENSE (OFFLINE FRIENDLY)
ipcMain.handle('check-license', async () => {
    if (!app.isPackaged) return true;

    try {
        const licensePath = getLicensePath();
        if (fs.existsSync(licensePath)) {
            const data = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
            if (data.activated && data.key) {
                return true; 
            }
        }
        return false;
    } catch (e) {
        return false;
    }
});

// 8. OPEN PATH
ipcMain.handle('open-path', async (event, path) => {
    try {
        await shell.openPath(path);
        return true;
    } catch (e) {
        console.error("Failed to open path:", e);
        return false;
    }
});

// 9. SHOW MESSAGE BOX
ipcMain.handle('show-message-box', async (event, options) => {
    if (!mainWindow) return { response: 1 };
    return await dialog.showMessageBox(mainWindow, options);
});

app.whenReady().then(() => {
  startBackendServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  stopBackendServer();
});
