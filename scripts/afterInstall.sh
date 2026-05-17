#!/bin/bash
# Post-install setup for MDTXT Electron app.
# Runs as root after dpkg installs the package.

INSTALL_DIR="/opt/MDTXT"
BINARY="$INSTALL_DIR/mdtxt"
SANDBOX="$INSTALL_DIR/chrome-sandbox"
WRAPPER="/usr/bin/mdtxt"
DESKTOP_FILE="/usr/share/applications/mdtxt.desktop"

# 1. Set SUID on chrome-sandbox so the Chromium sandbox works properly
if [ -f "$SANDBOX" ]; then
    chown root:root "$SANDBOX" || true
    chmod 4755 "$SANDBOX" || true
fi

# 2. Replace the /usr/bin/mdtxt symlink with a wrapper that always passes
#    --no-sandbox, so both terminal and app-menu launches work without
#    requiring chrome-sandbox SUID to be preserved across reinstalls.
if [ -f "$BINARY" ]; then
    rm -f "$WRAPPER"
    cat > "$WRAPPER" << 'WRAPEOF'
#!/bin/bash
exec /opt/MDTXT/mdtxt --no-sandbox "$@"
WRAPEOF
    chmod +x "$WRAPPER"
fi

# 3. Patch the desktop file to include --no-sandbox in the Exec line
#    (idempotent — skips if already present)
if [ -f "$DESKTOP_FILE" ] && ! grep -q -- '--no-sandbox' "$DESKTOP_FILE"; then
    sed -i 's|^\(Exec=[^ ]*\)\( .*\)\?$|\1 --no-sandbox\2|' "$DESKTOP_FILE" || true
fi

exit 0
