#!/bin/bash
# Post-install setup for MDTXT.
# Runs as root after dpkg installs the package.

INSTALL_DIR="/opt/MDTXT"
BINARY="$INSTALL_DIR/mdtxt"
SANDBOX="$INSTALL_DIR/chrome-sandbox"
WRAPPER="/usr/bin/mdtxt"
DESKTOP_FILE="/usr/share/applications/mdtxt.desktop"

# 1. Set SUID root on chrome-sandbox so the Chromium sandbox works.
#    MDTXT detects this helper at startup and runs fully sandboxed; it only
#    falls back to --no-sandbox when no sandbox mechanism exists on the
#    system (and logs a warning when it does).
if [ -f "$SANDBOX" ]; then
    chown root:root "$SANDBOX" || true
    chmod 4755 "$SANDBOX" || true
fi

# 2. Clean up artifacts from older versions that force-enabled --no-sandbox:
#    replace the legacy /usr/bin/mdtxt wrapper script with a plain symlink.
if [ -f "$WRAPPER" ] && [ ! -L "$WRAPPER" ]; then
    if grep -q -- '--no-sandbox' "$WRAPPER" 2>/dev/null; then
        rm -f "$WRAPPER"
        ln -s "$BINARY" "$WRAPPER" || true
    fi
fi

# 3. Strip a previously patched-in '--no-sandbox' from the desktop entry
#    (idempotent — only runs when the flag is present).
if [ -f "$DESKTOP_FILE" ] && grep -q -- '--no-sandbox' "$DESKTOP_FILE"; then
    sed -i 's| --no-sandbox||g' "$DESKTOP_FILE" || true
fi

exit 0
