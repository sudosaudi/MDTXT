# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.4.x   | :white_check_mark: |
| 1.3.x   | :x:                |
| 1.2.x   | :x:                |
| 1.1.x   | :x:                |
| < 1.1.0 | :x:                |

Only the latest minor release receives security fixes. Older versions
will be evaluated case-by-case.

## Reporting a Vulnerability

If you discover a security vulnerability in MDTXT, please report it
privately by emailing **sudosaudi@users.noreply.github.com** (a
forwarding address that reaches the maintainer). Do not file a public
GitHub issue for security bugs.

Please include:

- A description of the vulnerability
- Steps to reproduce or a proof-of-concept
- The version affected
- Any suggested fix (optional)

You should receive an acknowledgement within 7 days. A fix or
mitigation will be released as a patch version (e.g. 1.4.1) once
verified.

## Security Model

MDTXT is a local file browser. It does not transmit any user data
off the device. The security model assumes:

- The user is opening folders they trust (not adversarial paths)
- The system has a standard Electron environment
- The bundled `chrome-sandbox` is SUID root, or `--no-sandbox` is used

## Mitigations in Place

- **Path scoping**: `isPathInsideRoot` validator ensures all file
  reads stay within the user-selected root.
- **Size limits**: `MAX_FILE_BYTES = 5 * 1024 * 1024` on file reads.
- **Scan limits**: `MAX_SCAN_DEPTH = 10`, `MAX_FILES = 5000`, hidden
  directories and symlinks are skipped, `SCAN_IGNORE_DIRS` filters
  noisy VCS and build folders.
- **Sandboxed renderer**: `BrowserWindow.sandbox: true`,
  `webSecurity: true`, `contextIsolation: true`.
- **Strict CSP**: `default-src 'self'`, no inline scripts, only
  `local-files:` images, `https://fonts.googleapis.com` and
  `https://fonts.gstatic.com` allowed for the Source Serif 4 font.
- **Navigation lockdown**: `will-navigate` and `setWindowOpenHandler`
  prevent any out-of-app navigation.
- **Local-only content**: the custom `local-files://` protocol is
  registration-validated and rejects any path outside the active root.
- **Sanitized errors**: error messages are scrubbed of control
  characters and capped at 200 characters before reaching the renderer.

## Known Framework Caveats

MDTXT is built on Electron 30, which has known upstream CVEs in the
browser-process layer. These are mitigated by the app-layer controls
listed above. A future major version will upgrade to a current
Electron release to fully resolve the framework-level advisories.

## Auto-Update Security

MDTXT uses `electron-updater` to pull updates from GitHub Releases.
Every update is verified via SHA-512 hash from `latest.yml` /
`latest-linux.yml` before installation. We do not currently run
code-signing on Linux (no infrastructure for it); Windows users may
see "Unknown publisher" on first run.

## Cryptography

MDTXT does not implement or use cryptography. There are no
self-signed certificates, no password storage, and no network
endpoints that accept credentials.
