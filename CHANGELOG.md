# Changelog

All notable changes to MDTXT are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.2] - 2026-07-21

### Fixed
- Inline `code` in Markdown rendered as a full block element (react-markdown v9 removed the `inline` prop; block rendering now correctly overrides `pre`, inline styling handled in CSS)
- Copy button on highlighted code blocks copied "[object Object]" — code text is now extracted recursively from the highlighted element tree
- PDF export had no syntax highlighting: `marked.setOptions({ highlight })` was silently removed in marked v18; now uses the `marked-highlight` extension
- Cancelling the folder dialog cleared the security root, breaking images and file reads for the currently open folder
- An active auto-update notification permanently suppressed all normal toasts for the rest of the session; they now coexist
- `sanitizeErrorMessage` regex was double-escaped and stripped uppercase letters and digits from error messages
- JetBrains Mono font import lost in the v1.4.0 theme rewrite — code blocks and the text viewer fell back to generic monospace on machines without the font installed
- Light theme kept the dark `github-dark` syntax palette; added light hljs overrides
- Hidden PDF export window leaked when rendering failed (now destroyed in `finally`)
- Dropping a folder on the window scanned it twice; added a lightweight `fs:stat` IPC probe instead
- Word count no longer counts Markdown syntax (code fences, URLs, heading/emphasis markers are stripped first)
- Rapid successive toasts could be cut off early (hide timers now reset)

### Security
- Chromium sandbox is now enabled whenever the system supports it (user namespaces or SUID `chrome-sandbox` helper), replacing the blanket `--no-sandbox` switch that silently cancelled `sandbox: true`. Falls back gracefully with a warning instead of crashing on systems without sandbox support
- `local-files://` protocol and all file-access IPC handlers now resolve symlinks (`realpath`) before root-containment checks, closing a symlink-escape arbitrary file read
- PDF export sanitizes rendered HTML with `sanitize-html` (raw HTML/JS in a source file can no longer execute in the export window); matches the preview's no-raw-HTML behavior
- Auto-update errors forwarded to the renderer are now sanitized

### Changed
- All main-process file I/O is async (`fs/promises`) — window controls and the app no longer freeze during folder scans
- Highlights are painted with the CSS Custom Highlight API instead of injecting `<mark>` elements into React's DOM (removes a whole class of DOM-conflict crashes and the strip/re-apply churn on every render)
- Renderer state split into three focused contexts (`UIContext`, `FilesContext`, `HighlightsContext`) — a toast or search keystroke no longer re-renders the entire markdown tree
- Theme management consolidated into context (no more window-wide custom events); theme choice is cached in `localStorage` so returning users get no dark flash on launch
- Keyboard navigation no longer hijacks arrows/Enter from the preview pane or text inputs; the preview pane is focusable and scrolls natively
- JSON stores (`app-state.json`, `highlights.json`) are written atomically (temp file + rename) through a serialized write queue
- Auto-update is disabled on `.deb` installs (electron-updater only supports AppImage on Linux); update UI no longer promises an install it can't perform
- `afterInstall.sh` now only SUIDs `chrome-sandbox` and cleans up legacy `--no-sandbox` artifacts from older installs

### Removed
- Dead `store:getLastOpenedFolder` / `store:setLastOpenedFolder` IPC channels (auto-restore was removed in 1.4.0)
- Unused `pngjs` dev dependency

### Added
- Unit test suite (`vitest`, 23 tests) covering path/extension validators, error sanitization, and the text/word-count utilities — run with `npm test`
- `MDTXT_SMOKE_TEST=1 electron .` headless smoke-test hook: boots the real app, reports the sandbox decision, and verifies the preload bridge


## [1.4.1] - 2026-07-07

### Added
- PDF export: export any open Markdown or plain-text file to a styled A4 PDF via a new title-bar button; uses `marked` + `highlight.js` for rendering
- Drag-and-drop: drop a folder or file anywhere on the window to open it; dropping a file auto-selects it after the parent folder loads
- Word count and estimated reading time displayed in a status bar at the bottom of the preview pane
- `LICENSE` (ISC), `CHANGELOG.md`, and `SECURITY.md` added to the repository
- Linux CI pipeline (GitHub Actions) that builds `.deb` and `.AppImage` artifacts with asar version/author verification

### Changed
- Version bumped to 1.4.1
- Added `marked` as a dependency (for PDF export Markdown-to-HTML conversion)
- PreviewPane layout restructured to support the bottom status bar

## [1.4.0] - 2026-06-08

### Added
- Light and dark theme system with system preference detection and one-click toggle in the sidebar
- Unified Source Serif 4 typography across the app
- Prominent "Choose Folder" button at the top of the sidebar
- Library section with collapsible recent folders and clear option
- "Larger font" / "Smaller font" zoom controls with tooltips
- New IPC channels: `store:clearRecentFolders`, `store:getTheme`, `store:setTheme`

### Changed
- Sidebar redesigned with prominent button and collapsible Library
- Title bar zoom controls replaced with +/- icons
- CSP updated to allow Google Fonts (`style-src`, `font-src`, `connect-src`)
- Tailwind config extended with theme tokens and font families
- Main CSS uses CSS custom properties for both themes
- README updated with v1.4.0 features
- Repo moved from `aalrehan/MDTXT` to `sudosaudi/MDTXT`
- Author metadata changed to `sudosaudi <sudosaudi@users.noreply.github.com>`

### Removed
- Auto-restore last-opened-folder on launch (app now starts fresh)
- `getLastOpenedFolder` IPC handler
- `hasRestoredRef` from AppContext
- Title bar folder icon

## [1.3.2] - 2026-06-04

### Fixed
- Black screen on startup caused by `showToast` temporal dead zone in the auto-restore useEffect closure

## [1.3.1] - 2026-06-03

### Added
- Auto-update support via `electron-updater` and GitHub Releases
- Sticky toast notification when update is ready, with a Restart button
- New IPC channels: `update:available`, `update:downloaded`, `update:install`

## [1.3.0] - 2026-06-03

### Added
- Recent folders MRU list (max 5) shown in the empty state
- "Remember last folder" auto-restore on startup (later removed in 1.4.0)
- Sidebar search and filter (filename or relative path, X-clear, Esc-clear)
- Indent guides and progressive text opacity in the sidebar
- UI consolidation: removed duplicate "Choose Folder" buttons

## [1.2.1] - 2026-06-02

### Changed
- Replaced personal email in `package.json` with GitHub noreply address
- Re-published to clear the previous artifact metadata

## [1.2.0] - 2026-06-02

### Added
- Yellow text highlighting feature with persistent sidecar storage (`highlights.json` in userData)

### Security
- Path scoping with `isPathInsideRoot` validator
- 5 MB `MAX_FILE_BYTES` read limit on file reads
- 10-depth `MAX_SCAN_DEPTH` folder scan limit
- 5000-file scan limit
- Symlink and hidden-directory skip during scans
- Strict CSP in renderer (`default-src 'self'`, no inline scripts)
- `BrowserWindow.sandbox: true`, `webSecurity: true`
- `will-navigate` prevention + `setWindowOpenHandler(deny)`
- Sanitized error messages (no stack traces to renderer)
- Extension allow-list on file reads and highlight load/save
- Highlight count cap of 10,000 per file

## [1.1.0] - 2026-05-18

### Added
- Renamed project from `md-txt-browser` to `MDTXT`
- NSIS installer for Windows
- Cross-platform path handling (Windows backslash and POSIX slash)
- `build/icon.ico` for Windows
- Proper app icon
- Initial public release on GitHub
