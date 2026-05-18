# MDTXT

A minimalist desktop app for Linux that lets you browse folders and preview `.md` (Markdown) and `.txt` (plain text) files side-by-side. Built with Electron + React.

## Features

- Browse any folder and see all `.md` and `.txt` files in a sidebar
- Markdown rendering with GitHub-flavored Markdown (tables, checkboxes, etc.)
- Syntax highlighting in code blocks
- Plain text viewer with line numbers
- Zoom in/out controls
- Keyboard navigation (arrow keys + Enter)
- Custom dark UI with minimize/maximize/close window controls

## Download & Install (Linux)

**[⬇ Download latest release](https://github.com/aalrehan/md-txt-browser/releases/latest)**

### Option 1 — .deb package (Ubuntu / Debian)

```bash
sudo dpkg -i mdtxt_1.1.0_amd64.deb
```

Launch from your app menu or run `mdtxt` in the terminal.

### Option 2 — AppImage (any Linux distro)

```bash
chmod +x MDTXT-1.1.0.AppImage
./MDTXT-1.1.0.AppImage
```

## Development Setup

**Requirements:** Node.js 18+, npm

```bash
git clone https://github.com/aalrehan/md-txt-browser.git
cd md-txt-browser
npm install
npm run dev
```

> **Note for Linux:** The app uses `NO_SANDBOX=1` in the dev script to bypass the Chromium sandbox (required on systems where `chrome-sandbox` is not SUID root). This is already set in `package.json` — no manual steps needed.

## Building

Build distributable packages for Linux:

```bash
npm run build:linux
```

Output goes to `dist/` — produces both a `.deb` and an `.AppImage`.

## Project Structure

```
src/
├── main/           # Electron main process (file system, IPC, window)
├── preload/        # IPC bridge between main and renderer
└── renderer/
    ├── components/ # React UI components
    ├── context/    # Global state (AppContext)
    └── assets/     # CSS
scripts/
└── afterInstall.sh # Patches --no-sandbox into the desktop entry post-install
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Electron 30 |
| UI | React 18 + Tailwind CSS |
| Build | electron-vite + electron-builder |
| Markdown | react-markdown + remark-gfm |
| Syntax highlighting | rehype-highlight + highlight.js |
| Animations | Framer Motion |
| Icons | Lucide React |

## Known Limitations / Ideas for Improvement

- Linux only (no macOS/Windows support yet)
- No search or filter for large file lists
- No folder tree — all files are shown in a flat list
- No light theme
- No TypeScript
- File watching (auto-reload when files change on disk)

Contributions are welcome — feel free to open issues or pull requests.

## License

ISC
