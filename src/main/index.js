import { sanitizeErrorMessage, isPathInsideRoot, hasAllowedExtension, isImageFile } from './utils.js'

const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const { pathToFileURL } = require('url')
const { autoUpdater } = require('electron-updater')
const hljs = require('highlight.js')
const sanitizeHtml = require('sanitize-html')

// Enable the Chromium sandbox whenever the platform can actually support it,
// and only then. Requesting the sandbox when the kernel/helper cannot provide
// it makes Electron abort on startup (this is why --no-sandbox was previously
// forced globally). Order of preference on Linux:
//   1. unprivileged user namespaces (and not AppArmor-restricted, e.g. Ubuntu 24.04)
//   2. SUID-root chrome-sandbox helper next to the executable
// Otherwise degrade gracefully to --no-sandbox with a warning.
function canEnableSandbox() {
  if (process.platform !== 'linux') return true
  try {
    const usernsPath = '/proc/sys/kernel/unprivileged_userns_clone'
    const usernsOk = !fs.existsSync(usernsPath) || fs.readFileSync(usernsPath, 'utf8').trim() === '1'
    const aaPath = '/proc/sys/kernel/apparmor_restrict_unprivileged_userns'
    const aaRestricted = fs.existsSync(aaPath) && fs.readFileSync(aaPath, 'utf8').trim() === '1'
    if (usernsOk && !aaRestricted) return true
  } catch (e) {
    // fall through to the SUID helper check
  }
  try {
    const helper = path.join(path.dirname(process.execPath), 'chrome-sandbox')
    const st = fs.statSync(helper)
    return st.uid === 0 && (st.mode & 0o4000) !== 0
  } catch (e) {
    return false
  }
}

const SANDBOX_ENABLED = canEnableSandbox()
if (!SANDBOX_ENABLED) {
  console.warn('[mdtxt] Chromium sandbox unavailable on this system; falling back to --no-sandbox')
  app.commandLine.appendSwitch('no-sandbox')
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_SCAN_DEPTH = 10
const MAX_FILES = 5000
const SCAN_IGNORE_DIRS = new Set(['.git', 'node_modules', '.svn', '.hg', '.cache'])
const MAX_HIGHLIGHTS_PER_FILE = 10000
const MAX_RECENT_FOLDERS = 5

let mainWindow = null
let currentRootPath = null
let currentRootReal = null

// Sets the security root used to scope all file access. Also caches the
// canonical (symlink-resolved) path so checks can defeat symlink escapes.
function setSecurityRoot(folderPath) {
  currentRootPath = folderPath ? path.resolve(folderPath) : null
  try {
    currentRootReal = currentRootPath ? fs.realpathSync(currentRootPath) : null
  } catch (e) {
    currentRootReal = currentRootPath
  }
}

// Symlink-safe containment check: resolves the target to its real path before
// comparing against the real root. Requires the target to exist on disk.
function isPathInsideRootReal(targetPath) {
  if (!currentRootReal || typeof targetPath !== 'string' || !targetPath) return false
  try {
    return isPathInsideRoot(fs.realpathSync(targetPath), currentRootReal)
  } catch (e) {
    return false
  }
}

function getHighlightsFile() {
  return path.join(app.getPath('userData'), 'highlights.json')
}

function getStateFile() {
  return path.join(app.getPath('userData'), 'app-state.json')
}

async function readJsonFile(file, fallback) {
  try {
    const raw = await fsp.readFile(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch (e) {
    return fallback
  }
}

// All JSON store writes go through a single promise chain and are atomic
// (temp file + rename), so a crash mid-write can never corrupt a store.
let writeChain = Promise.resolve()
function writeJsonAtomic(file, data) {
  writeChain = writeChain.then(async () => {
    const tmp = file + '.tmp'
    await fsp.mkdir(path.dirname(file), { recursive: true })
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
    await fsp.rename(tmp, file)
  }).catch((e) => {
    console.error('[mdtxt] failed to write store:', file, e && e.message)
  })
  return writeChain
}

async function readHighlightsStore() {
  return readJsonFile(getHighlightsFile(), {})
}

async function readState() {
  const parsed = await readJsonFile(getStateFile(), {})
  return {
    recentFolders: Array.isArray(parsed.recentFolders) ? parsed.recentFolders : [],
    theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : null
  }
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
      sandbox: SANDBOX_ENABLED,
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
  // electron-updater can only self-update AppImage builds on Linux. .deb
  // installs must update through the package manager / releases page, so
  // don't show update UI that would only fail at quitAndInstall time.
  if (process.platform === 'linux' && !process.env.APPIMAGE) return

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
    if (mainWindow) {
      mainWindow.webContents.send('update:error', {
        message: sanitizeErrorMessage(err)
      })
    }
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
      if (!isPathInsideRootReal(filePath)) {
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

  // Headless smoke test hook (used by CI / manual verification):
  // MDTXT_SMOKE_TEST=1 electron . — boots the real app, verifies the
  // renderer came up with the preload bridge intact, prints the sandbox
  // decision, and exits.
  if (process.env.MDTXT_SMOKE_TEST === '1') {
    setTimeout(async () => {
      try {
        const js = (expr) => mainWindow.webContents.executeJavaScript(expr)
        const apiOk = await js('Boolean(window.electronAPI)')
        console.log(`[smoke] sandboxEnabled=${SANDBOX_ENABLED} preloadApi=${apiOk} windows=${BrowserWindow.getAllWindows().length}`)

        // Optional end-to-end IPC pass against a prepared folder
        // (MDTXT_SMOKE_FOLDER=/path/to/notes).
        const folder = process.env.MDTXT_SMOKE_FOLDER
        if (folder) {
          const q = JSON.stringify
          const scan = await js(`window.electronAPI.scanFolder(${q(folder)})`)
          console.log(`[smoke] scan files=${scan.files ? scan.files.length : -1} error=${scan.error || 'none'}`)

          const notePath = path.join(folder, 'note.md')
          const read = await js(`window.electronAPI.readFile(${q(notePath)})`)
          console.log(`[smoke] readFile bytes=${read.content ? read.content.length : 0} error=${read.error || 'none'}`)

          const evilRead = await js(`window.electronAPI.readFile(${q(path.join(folder, 'evil.md'))})`)
          console.log(`[smoke] symlinkEscapeBlocked=${evilRead.error ? 'yes' : 'NO!'} (${evilRead.error || 'read succeeded'})`)

          const statDir = await js(`window.electronAPI.statPath(${q(folder)})`)
          const statFile = await js(`window.electronAPI.statPath(${q(notePath)})`)
          console.log(`[smoke] stat dir=${statDir.isDirectory} file=${statFile.isFile}`)

          const hl = [{ id: 'smoke1', prefix: '', text: 'smoke', suffix: '', createdAt: 0 }]
          const saved = await js('window.electronAPI.saveHighlights(' + q(notePath) + ', ' + JSON.stringify(hl) + ')')
          const loaded = await js('window.electronAPI.loadHighlights(' + q(notePath) + ')')
          console.log(`[smoke] highlights saved=${saved.ok} loaded=${loaded.length}`)
          await js('window.electronAPI.saveHighlights(' + q(notePath) + ', [])') // leave no residue

          const theme = await js('window.electronAPI.getTheme()')
          const themeOk = theme === null || theme === 'light' || theme === 'dark'
          console.log(`[smoke] themeRead=${themeOk ? 'ok' : 'bad'} (${theme})`)
        }
      } catch (e) {
        console.log('[smoke] FAILED:', e && e.message)
        app.exit(1)
        return
      }
      app.exit(0)
    }, 5000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

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
    setSecurityRoot(result.filePaths[0])
  }
  // Cancelling the dialog intentionally leaves the current security root
  // untouched, so the currently open folder keeps working.
  return result
})

// Lightweight stat probe used by the renderer (e.g. drag-and-drop) to tell
// files from folders without triggering a full recursive scan.
ipcMain.handle('fs:stat', async (_event, targetPath) => {
  try {
    if (typeof targetPath !== 'string' || !targetPath) {
      return { error: 'invalid path' }
    }
    const st = await fsp.stat(targetPath)
    return { isDirectory: st.isDirectory(), isFile: st.isFile() }
  } catch (e) {
    return { error: 'not found' }
  }
})

ipcMain.handle('fs:scanFolder', async (event, folderPath) => {
  try {
    if (typeof folderPath !== 'string' || !folderPath) {
      return { error: 'invalid path' }
    }
    const resolvedRoot = path.resolve(folderPath)
    let rootStat
    try {
      rootStat = await fsp.stat(resolvedRoot)
    } catch (e) {
      return { error: 'folder not found' }
    }
    if (!rootStat.isDirectory()) {
      return { error: 'not a directory' }
    }
    setSecurityRoot(resolvedRoot)

    const files = []

    // Async all the way down so the main process (and the whole app, window
    // controls included) stays responsive while large folders are scanned.
    async function scanDir(dirPath, basePath, currentDepth) {
      if (currentDepth > MAX_SCAN_DEPTH) return
      if (files.length >= MAX_FILES) return

      let entries
      try {
        entries = await fsp.readdir(dirPath, { withFileTypes: true })
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
          await scanDir(fullPath, basePath, currentDepth + 1)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (ext !== '.md' && ext !== '.txt') continue

          let stat
          try {
            stat = await fsp.stat(fullPath)
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

    await scanDir(resolvedRoot, resolvedRoot, 0)
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
    if (!isPathInsideRootReal(filePath)) {
      return { error: 'file is outside the open folder' }
    }
    if (!hasAllowedExtension(filePath)) {
      return { error: 'unsupported file type' }
    }
    const stat = await fsp.stat(filePath)
    if (!stat.isFile()) {
      return { error: 'not a regular file' }
    }
    if (stat.size > MAX_FILE_BYTES) {
      return { error: `file too large (max ${MAX_FILE_BYTES} bytes)` }
    }
    const content = await fsp.readFile(filePath, 'utf-8')
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

ipcMain.handle('highlights:load', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !filePath) return []
  if (!isPathInsideRootReal(filePath)) return []
  if (!hasAllowedExtension(filePath)) return []
  const store = await readHighlightsStore()
  return Array.isArray(store[filePath]) ? store[filePath] : []
})

ipcMain.handle('highlights:save', async (_event, filePath, highlights) => {
  if (typeof filePath !== 'string' || !filePath) {
    return { ok: false, error: 'invalid filePath' }
  }
  if (!isPathInsideRootReal(filePath)) {
    return { ok: false, error: 'file is outside the open folder' }
  }
  if (!hasAllowedExtension(filePath)) {
    return { ok: false, error: 'unsupported file type' }
  }
  if (!Array.isArray(highlights)) {
    return { ok: false, error: 'invalid highlights' }
  }
  if (highlights.length > MAX_HIGHLIGHTS_PER_FILE) {
    return { ok: false, error: 'too many highlights' }
  }
  const store = await readHighlightsStore()
  if (highlights.length === 0) {
    delete store[filePath]
  } else {
    store[filePath] = highlights
  }
  await writeJsonAtomic(getHighlightsFile(), store)
  return { ok: true }
})

ipcMain.handle('store:getRecentFolders', async () => {
  const state = await readState()
  return state.recentFolders
})

ipcMain.handle('store:addRecentFolder', async (_event, folderPath) => {
  if (typeof folderPath !== 'string' || !folderPath) return []
  const state = await readState()
  const resolved = path.resolve(folderPath)
  state.recentFolders = state.recentFolders.filter((p) => path.resolve(p) !== resolved)
  state.recentFolders.unshift(resolved)
  if (state.recentFolders.length > MAX_RECENT_FOLDERS) {
    state.recentFolders = state.recentFolders.slice(0, MAX_RECENT_FOLDERS)
  }
  await writeJsonAtomic(getStateFile(), state)
  return state.recentFolders
})

ipcMain.handle('store:clearRecentFolders', async () => {
  const state = await readState()
  state.recentFolders = []
  await writeJsonAtomic(getStateFile(), state)
  return state.recentFolders
})

ipcMain.handle('store:getTheme', async () => {
  const state = await readState()
  return state.theme
})

ipcMain.handle('store:setTheme', async (_event, theme) => {
  const state = await readState()
  state.theme = theme === 'light' || theme === 'dark' ? theme : null
  await writeJsonAtomic(getStateFile(), state)
  return { ok: true, theme: state.theme }
})

ipcMain.handle('update:install', () => {
  if (!app.isPackaged) return
  try {
    autoUpdater.quitAndInstall(false, true)
  } catch (e) {
    if (mainWindow) {
      mainWindow.webContents.send('update:error', {
        message: sanitizeErrorMessage(e)
      })
    }
  }
})

ipcMain.handle('file:exportPdf', async (event, filePath) => {
  try {
    if (typeof filePath !== 'string' || !filePath) {
      return { ok: false, error: 'invalid path' }
    }
    if (!isPathInsideRootReal(filePath)) {
      return { ok: false, error: 'file is outside the open folder' }
    }
    if (!hasAllowedExtension(filePath)) {
      return { ok: false, error: 'unsupported file type' }
    }
    const stat = await fsp.stat(filePath)
    if (!stat.isFile()) {
      return { ok: false, error: 'not a regular file' }
    }
    if (stat.size > MAX_FILE_BYTES) {
      return { ok: false, error: 'file too large' }
    }

    const content = await fsp.readFile(filePath, 'utf-8')
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
      // marked v18: syntax highlighting lives in the marked-highlight
      // extension (the old setOptions({ highlight }) API was removed).
      // A fresh Marked instance per export avoids accumulating extensions.
      const { Marked } = await import('marked')
      const { markedHighlight } = await import('marked-highlight')
      const md = new Marked(
        markedHighlight({
          langPrefix: 'hljs language-',
          highlight(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
              try {
                return hljs.highlight(code, { language: lang }).value
              } catch (e) {}
            }
            return code
          }
        }),
        { gfm: true, breaks: false }
      )
      const rawHtml = md.parse(content, { async: false })
      // Raw HTML in the source is stripped (matching the preview, which uses
      // react-markdown without rehype-raw) so a malicious file cannot inject
      // markup/script into the export window.
      bodyHtml = sanitizeHtml(rawHtml, {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
          'blockquote', 'code', 'pre', 'span', 'strong', 'em', 'del',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'img', 'input'
        ],
        allowedAttributes: {
          a: ['href'],
          span: ['class'],
          code: ['class'],
          pre: ['class'],
          img: ['src', 'alt'],
          input: ['type', 'checked', 'disabled'],
          th: ['align'],
          td: ['align']
        },
        allowedSchemes: ['http', 'https'],
        disallowedTagsMode: 'discard'
      })
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
        sandbox: SANDBOX_ENABLED,
        webSecurity: true
      }
    })

    let pdfData
    try {
      await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlDoc))
      pdfData = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true
      })
    } finally {
      // Always destroy the hidden window, even if rendering fails.
      pdfWin.destroy()
    }

    await fsp.mkdir(path.dirname(saveResult.filePath), { recursive: true })
    await fsp.writeFile(saveResult.filePath, pdfData)

    return { ok: true, path: saveResult.filePath }
  } catch (error) {
    return { ok: false, error: sanitizeErrorMessage(error) }
  }
})
