const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { autoUpdater } = require('electron-updater')
const hljs = require('highlight.js')

app.commandLine.appendSwitch('no-sandbox')

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_SCAN_DEPTH = 10
const SCAN_IGNORE_DIRS = new Set(['.git', 'node_modules', '.svn', '.hg', '.cache'])

let mainWindow = null
let currentRootPath = null

function getHighlightsFile() {
  return path.join(app.getPath('userData'), 'highlights.json')
}

function readHighlightsStore() {
  try {
    const file = getHighlightsFile()
    if (!fs.existsSync(file)) return {}
    const raw = fs.readFileSync(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    return {}
  }
}

function writeHighlightsStore(store) {
  try {
    const file = getHighlightsFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8')
    return true
  } catch (e) {
    return false
  }
}

const MAX_RECENT_FOLDERS = 5

function getStateFile() {
  return path.join(app.getPath('userData'), 'app-state.json')
}

function readState() {
  try {
    const file = getStateFile()
    if (!fs.existsSync(file)) return { recentFolders: [], lastOpenedFolder: null, theme: null }
    const raw = fs.readFileSync(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      recentFolders: Array.isArray(parsed.recentFolders) ? parsed.recentFolders : [],
      lastOpenedFolder: typeof parsed.lastOpenedFolder === 'string' ? parsed.lastOpenedFolder : null,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : null
    }
  } catch (e) {
    return { recentFolders: [], lastOpenedFolder: null, theme: null }
  }
}

function writeState(state) {
  try {
    const file = getStateFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8')
    return true
  } catch (e) {
    return false
  }
}

function sanitizeErrorMessage(err) {
  if (!err || typeof err.message !== 'string') return 'operation failed'
  return err.message.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200)
}

function isPathInsideRoot(targetPath, rootPath) {
  if (!rootPath || !targetPath) return false
  const resolvedRoot = path.resolve(rootPath)
  const resolvedTarget = path.resolve(targetPath)
  if (resolvedTarget === resolvedRoot) return true
  const rel = path.relative(resolvedRoot, resolvedTarget)
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function hasAllowedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.md' || ext === '.txt'
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f12',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  if (process.platform !== 'darwin' && process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.on('will-navigate', (e) => e.preventDefault())
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version
      })
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err && err.message ? err.message : err)
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)
}

app.whenReady().then(() => {
  protocol.handle('local-files', (request) => {
    try {
      const rawPath = request.url.replace('local-files://', '')
      const filePath = decodeURIComponent(rawPath)
      if (!isPathInsideRoot(filePath, currentRootPath)) {
        return new Response('forbidden', { status: 403 })
      }
      if (!hasAllowedExtension(filePath) && !isImageFile(filePath)) {
        return new Response('forbidden', { status: 403 })
      }
      const fileUrl = pathToFileURL(filePath).href
      return net.fetch(fileUrl)
    } catch (e) {
      return new Response('bad request', { status: 400 })
    }
  })

  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'].includes(ext)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled && result.filePaths[0]) {
    currentRootPath = path.resolve(result.filePaths[0])
  } else {
    currentRootPath = null
  }
  return result
})

ipcMain.handle('fs:scanFolder', async (event, folderPath) => {
  try {
    if (typeof folderPath !== 'string' || !folderPath) {
      return { error: 'invalid path' }
    }
    const resolvedRoot = path.resolve(folderPath)
    let stat
    try {
      stat = fs.statSync(resolvedRoot)
    } catch (e) {
      return { error: 'folder not found' }
    }
    if (!stat.isDirectory()) {
      return { error: 'not a directory' }
    }
    currentRootPath = resolvedRoot

    const files = []
    const MAX_FILES = 5000

    function scanDir(dirPath, basePath, currentDepth) {
      if (currentDepth > MAX_SCAN_DEPTH) return
      if (files.length >= MAX_FILES) return

      let entries
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true })
      } catch (e) {
        return
      }

      for (const entry of entries) {
        if (files.length >= MAX_FILES) return
        if (entry.isSymbolicLink()) continue
        if (entry.name.startsWith('.')) continue
        if (SCAN_IGNORE_DIRS.has(entry.name)) continue

        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          scanDir(fullPath, basePath, currentDepth + 1)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (ext !== '.md' && ext !== '.txt') continue

          let stat
          try {
            stat = fs.statSync(fullPath)
          } catch (e) {
            continue
          }
          if (stat.size > MAX_FILE_BYTES) continue

          const relativePath = path.relative(basePath, fullPath)
          const depth = relativePath.split(path.sep).length - 1
          files.push({
            name: path.basename(entry.name, ext),
            path: fullPath,
            relativePath,
            extension: ext,
            depth,
            size: stat.size
          })
        }
      }
    }

    scanDir(resolvedRoot, resolvedRoot, 0)
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    return { files }
  } catch (error) {
    return { error: sanitizeErrorMessage(error) }
  }
})

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    if (typeof filePath !== 'string' || !filePath) {
      return { error: 'invalid path' }
    }
    if (!isPathInsideRoot(filePath, currentRootPath)) {
      return { error: 'file is outside the open folder' }
    }
    if (!hasAllowedExtension(filePath)) {
      return { error: 'unsupported file type' }
    }
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) {
      return { error: 'not a regular file' }
    }
    if (stat.size > MAX_FILE_BYTES) {
      return { error: `file too large (max ${MAX_FILE_BYTES} bytes)` }
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return { content }
  } catch (error) {
    return { error: sanitizeErrorMessage(error) }
  }
})

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('highlights:load', (_event, filePath) => {
  if (typeof filePath !== 'string' || !filePath) return []
  if (!isPathInsideRoot(filePath, currentRootPath)) return []
  if (!hasAllowedExtension(filePath)) return []
  const store = readHighlightsStore()
  return Array.isArray(store[filePath]) ? store[filePath] : []
})

ipcMain.handle('highlights:save', (_event, filePath, highlights) => {
  if (typeof filePath !== 'string' || !filePath) {
    return { ok: false, error: 'invalid filePath' }
  }
  if (!isPathInsideRoot(filePath, currentRootPath)) {
    return { ok: false, error: 'file is outside the open folder' }
  }
  if (!hasAllowedExtension(filePath)) {
    return { ok: false, error: 'unsupported file type' }
  }
  if (!Array.isArray(highlights)) {
    return { ok: false, error: 'invalid highlights' }
  }
  if (highlights.length > 10000) {
    return { ok: false, error: 'too many highlights' }
  }
  const store = readHighlightsStore()
  if (highlights.length === 0) {
    delete store[filePath]
  } else {
    store[filePath] = highlights
  }
  const ok = writeHighlightsStore(store)
  return { ok }
})

ipcMain.handle('store:getRecentFolders', () => {
  const state = readState()
  return state.recentFolders
})

ipcMain.handle('store:addRecentFolder', (_event, folderPath) => {
  if (typeof folderPath !== 'string' || !folderPath) return []
  const state = readState()
  const resolved = path.resolve(folderPath)
  state.recentFolders = state.recentFolders.filter((p) => path.resolve(p) !== resolved)
  state.recentFolders.unshift(resolved)
  if (state.recentFolders.length > MAX_RECENT_FOLDERS) {
    state.recentFolders = state.recentFolders.slice(0, MAX_RECENT_FOLDERS)
  }
  writeState(state)
  return state.recentFolders
})

ipcMain.handle('store:getLastOpenedFolder', () => {
  const state = readState()
  return state.lastOpenedFolder
})

ipcMain.handle('store:setLastOpenedFolder', (_event, folderPath) => {
  if (typeof folderPath !== 'string') return { ok: false }
  const state = readState()
  state.lastOpenedFolder = folderPath ? path.resolve(folderPath) : null
  writeState(state)
  return { ok: true }
})

ipcMain.handle('store:clearRecentFolders', () => {
  const state = readState()
  state.recentFolders = []
  writeState(state)
  return state.recentFolders
})

ipcMain.handle('store:getTheme', () => {
  const state = readState()
  return state.theme
})

ipcMain.handle('store:setTheme', (_event, theme) => {
  const state = readState()
  state.theme = theme === 'light' || theme === 'dark' ? theme : null
  writeState(state)
  return { ok: true, theme: state.theme }
})

ipcMain.handle('update:install', () => {
  if (app.isPackaged) {
    autoUpdater.quitAndInstall()
  }
})

ipcMain.handle('file:exportPdf', async (event, filePath) => {
  try {
    if (typeof filePath !== 'string' || !filePath) {
      return { ok: false, error: 'invalid path' }
    }
    if (!isPathInsideRoot(filePath, currentRootPath)) {
      return { ok: false, error: 'file is outside the open folder' }
    }
    if (!hasAllowedExtension(filePath)) {
      return { ok: false, error: 'unsupported file type' }
    }
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) {
      return { ok: false, error: 'not a regular file' }
    }
    if (stat.size > MAX_FILE_BYTES) {
      return { ok: false, error: 'file too large' }
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath).toLowerCase()
    const baseName = path.basename(filePath, ext)
    const dirName = path.dirname(filePath)

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Export PDF',
      defaultPath: path.join(dirName, baseName + '.pdf'),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })

    if (saveResult.canceled || !saveResult.filePath) {
      return { ok: false, error: 'canceled' }
    }

    let bodyHtml
    if (ext === '.md') {
      const { marked } = await import('marked')
      marked.setOptions({
        gfm: true,
        breaks: false,
        highlight: function (code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value
            } catch (e) {}
          }
          return hljs.highlightAuto(code).value
        }
      })
      bodyHtml = marked(content)
    } else {
      bodyHtml = '<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: \'JetBrains Mono\', monospace; font-size: 10pt; line-height: 1.5;">' +
        content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</pre>'
    }

    const css = `
      @page { margin: 20mm; size: A4; }
      body {
        font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1a1a1a;
        max-width: 100%;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Source Serif 4', Georgia, serif;
        font-weight: 600;
        margin-top: 1.2em;
        margin-bottom: 0.6em;
        color: #1a1a1a;
      }
      h1 { font-size: 1.8em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.25em; }
      p { margin: 0.8em 0; }
      a { color: #2563eb; text-decoration: underline; }
      code {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 9pt;
        background: #f3f4f6;
        padding: 1px 4px;
        border-radius: 3px;
      }
      pre {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px 16px;
        overflow-x: auto;
        font-size: 9pt;
        line-height: 1.5;
        page-break-inside: avoid;
      }
      pre code {
        background: transparent;
        padding: 0;
        border-radius: 0;
      }
      blockquote {
        border-left: 3px solid #d1d5db;
        margin: 1em 0;
        padding: 0.5em 0 0.5em 1em;
        color: #4b5563;
        font-style: italic;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 8px 12px;
        text-align: left;
      }
      th {
        background: #f9fafb;
        font-weight: 600;
      }
      tr:nth-child(even) td { background: #f9fafb; }
      img {
        max-width: 100%;
        border-radius: 4px;
        margin: 0.5em 0;
      }
      hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 1.5em 0;
      }
      ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
      li { margin: 0.3em 0; }
      .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #d73a49; }
      .hljs-string, .hljs-attr { color: #032f62; }
      .hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
      .hljs-number, .hljs-literal { color: #005cc5; }
      .hljs-function .hljs-title, .hljs-title.function_ { color: #6f42c1; }
      .hljs-type, .hljs-class .hljs-title { color: #6f42c1; }
      .hljs-meta { color: #005cc5; }
      .hljs-variable, .hljs-template-variable { color: #e36209; }
      .hljs-bullet { color: #005cc5; }
      .hljs-addition { color: #22863a; background: #f0fff4; }
      .hljs-deletion { color: #b31d28; background: #ffeef0; }
    `

    const htmlDoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${css}</style></head><body>${bodyHtml}</body></html>`

    const pdfWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1100,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    })

    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlDoc))

    const pdfData = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true
    })

    pdfWin.destroy()

    fs.mkdirSync(path.dirname(saveResult.filePath), { recursive: true })
    fs.writeFileSync(saveResult.filePath, pdfData)

    return { ok: true, path: saveResult.filePath }
  } catch (error) {
    return { ok: false, error: sanitizeErrorMessage(error) }
  }
})
