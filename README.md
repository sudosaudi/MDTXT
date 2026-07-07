# MDTXT

**A minimalist desktop file browser — browse folders and preview `.md` and `.txt` files side-by-side.**

MDTXT is a frameless desktop application built with Electron and React. Open any folder, navigate its contents in a sidebar, and instantly preview Markdown or plain text files in a clean reading pane. Fully offline, no accounts, no API keys. Supports Linux and Windows.

## Features

- **Choose Folder button** — large, prominent CTA in the sidebar; always one click away
- **Folder browser** — pick any directory and see all `.md` and `.txt` files in a sidebar with recursive scanning
- **Recent folders (Library)** — quick access to the last 5 folders you opened, in a collapsible sidebar section with a clear option
- **Fresh start every launch** — opens to a clean empty state instead of auto-restoring the last folder
- **Light & dark themes** — system theme detection on first launch, with a one-click toggle that persists
- **Source Serif 4 typography** — a single, readable font used everywhere for a consistent look
- **Sidebar search & filter** — instantly filter the file list by filename or relative path as you type, with `Esc` to clear
- **Visual depth in sidebar** — thin indent guides and progressive text opacity make nested folder hierarchies easy to scan
- **GFM Markdown rendering** — full GitHub-Flavored Markdown support (tables, task lists, strikethrough, autolinks)
- **Syntax highlighting** — code blocks highlighted with highlight.js across dozens of languages, with copy button and language label
- **Plain text viewer** — `.txt` files displayed with line numbers
- **Yellow text highlighting** — select any text in a preview to highlight it, click to remove; highlights persist across app restarts
- **PDF export** — export any open Markdown or plain-text file to a styled A4 PDF via a title-bar button; uses `marked` + `highlight.js` for rendering
- **Drag-and-drop** — drop a folder or file anywhere on the window to open it; dropping a file auto-selects it after the parent folder loads
- **Word count & reading time** — status bar at the bottom of the preview pane shows word count and estimated reading time
- **Larger / smaller font** — scale the preview pane for comfortable reading
- **Keyboard navigation** — browse files with arrow keys and Enter
- **Frameless UI** — custom title bar with minimize, maximize, and close controls
- **Toast notifications** — unobtrusive feedback messages
- **Auto-update** — silently checks for new releases on startup
- **Fully offline** — no network access, no telemetry, no env vars or API keys required

## Download & Install

> **Always download the latest version directly from the official GitHub releases page:**
> **[github.com/sudosaudi/MDTXT/releases/latest](https://github.com/sudosaudi/MDTXT/releases/latest)**
>
> Do not install MDTXT from any other source. Each release on that page ships pre-built, signed installers for Linux and Windows.

### Linux

#### Option 1 — `.deb` package (Ubuntu / Debian)

1. Download `mdtxt_1.4.1_amd64.deb` from the [latest release page](https://github.com/sudosaudi/MDTXT/releases/latest).
2. Install it:

   ```bash
   sudo dpkg -i mdtxt_1.4.1_amd64.deb
   ```

Launch from your app menu or run `mdtxt` in the terminal.

#### Option 2 — `.AppImage` (any Linux distro)

1. Download `MDTXT-1.4.1.AppImage` from the [latest release page](https://github.com/sudosaudi/MDTXT/releases/latest).
2. Make it executable and run it:

   ```bash
   chmod +x MDTXT-1.4.1.AppImage
   ./MDTXT-1.4.1.AppImage
   ```

### Windows

#### NSIS Installer (.exe)

1. Download `MDTXT-Setup-1.4.1.exe` from the [latest release page](https://github.com/sudosaudi/MDTXT/releases/latest).
2. Run the installer and follow the setup wizard. The app will be available in your Start Menu.

## Development Setup

**Requirements:** Node.js 18+, npm

```bash
git clone https://github.com/sudosaudi/MDTXT.git
cd MDTXT
npm install
npm run dev
```

> **Note:** On Linux systems where `chrome-sandbox` is not SUID root, you may need to run with `--no-sandbox`. The built app handles this automatically via the post-install script.

## Building

Build distributable packages:

```bash
# Linux (.deb + AppImage)
npm run build:linux

# Windows (NSIS installer)
npm run build:win
```

Output is written to the `dist/` directory.

## Architecture

```
src/
├── main/              Electron main process — window management, IPC handlers, file system access
│   └── index.js       Main entry: BrowserWindow, IPC channel registration, theme persistence
├── preload/           Context bridge — exposes IPC channels to the renderer
│   └── index.js       Defines window.electronAPI (dialog, fs, window controls, highlights, theme)
└── renderer/          React frontend
    ├── App.jsx        Root component, theme class application
    ├── main.jsx       React entry point
    ├── index.html     HTML shell
    ├── components/
    │   ├── MainLayout.jsx           Top-level layout with sidebar + preview
    │   ├── Sidebar.jsx              Choose Folder button, Library section, file list, theme toggle
    │   ├── FileItem.jsx             Individual file entry in the sidebar
    │   ├── PreviewPane.jsx          File content viewer (delegates to MD or TXT) with word count status bar
    │   ├── MarkdownRenderer.jsx     react-markdown with remark-gfm + rehype-highlight
    │   ├── PlainTextViewer.jsx      Monospace text display with line numbers
    │   ├── HighlightableViewer.jsx  DOM-text-walking overlay that applies <mark> tags
    │   ├── HighlightToolbar.jsx     Floating add/remove highlight button
    │   ├── TitleBar.jsx             Frameless window title bar with font size controls and PDF export
    │   ├── EmptyState.jsx           Prompt shown when no folder is open
    │   ├── DropZone.jsx             Drag-and-drop overlay for opening folders/files
    │   └── Toast.jsx                Animated notification component
    ├── context/
    │   └── AppContext.jsx           Global state: selected file, folder path, zoom level, highlights, theme
    └── assets/
        └── main.css                 Theme tokens, Tailwind directives, custom styles
scripts/
└── afterInstall.sh    Post-install script for .deb — patches --no-sandbox into desktop entry
```

### IPC Channels

The main and renderer processes communicate through these IPC channels:

| Channel | Direction | Description |
|---|---|---|
| `dialog:openFolder` | Renderer → Main | Opens a native folder picker dialog |
| `fs:scanFolder` | Renderer → Main | Recursively scans a directory for `.md`/`.txt` files |
| `fs:readFile` | Renderer → Main | Reads a file's contents from disk |
| `window:minimize` | Renderer → Main | Minimizes the window |
| `window:maximize` | Renderer → Main | Toggles maximize/restore |
| `window:close` | Renderer → Main | Closes the window |
| `highlights:load` | Renderer → Main | Returns the saved highlights for a given file path |
| `highlights:save` | Renderer → Main | Persists the highlights list for a given file path |
| `store:getRecentFolders` | Renderer → Main | Returns the list of recently opened folders (max 5) |
| `store:addRecentFolder` | Renderer → Main | Adds a folder to the top of the recent folders list |
| `store:clearRecentFolders` | Renderer → Main | Empties the recent folders list |
| `store:getLastOpenedFolder` | Renderer → Main | Returns the last opened folder path |
| `store:setLastOpenedFolder` | Renderer → Main | Persists the last opened folder path |
| `store:getTheme` | Renderer → Main | Returns the saved theme preference (`light`, `dark`, or `null` for system) |
| `store:setTheme` | Renderer → Main | Persists the user's theme override |
| `file:exportPdf` | Renderer → Main | Exports the current file to a styled A4 PDF via a native save dialog |

## Tech Stack

- **Electron 30** — desktop runtime
- **React 18** — UI framework
- **Tailwind CSS 3** — utility-first styling with custom theme tokens
- **electron-vite** — Vite-powered build tooling for Electron
- **electron-builder** — packaging and distribution
- **react-markdown + remark-gfm** — Markdown parsing and rendering
- **marked** — Markdown-to-HTML conversion for PDF export
- **rehype-highlight + highlight.js** — code block syntax highlighting
- **Source Serif 4** — primary typography
- **JetBrains Mono** — code and `.txt` viewer typography
- **Framer Motion** — animations and transitions
- **Lucide React** — icon set

## Known Limitations & Ideas

- No folder tree — files are displayed in a flat list (with visual indent guides to show nesting)
- No TypeScript
- No file watching (auto-reload on external changes)
- No multi-file selection or batch operations
- No macOS build (untested)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

[ISC](https://opensource.org/licenses/ISC)
