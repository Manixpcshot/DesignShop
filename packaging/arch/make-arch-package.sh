#!/usr/bin/env bash
# Builds an Arch / Manjaro installable bundle from an unpacked Electron build.
# Produces: DesignShop-<ver>-arch.tar.gz containing
#   pkg/            the file tree that gets installed
#   PKGBUILD        `cd designshop-bin && makepkg -si`
#
# Usage: packaging/arch/make-arch-package.sh <version> <release-dir>
set -euo pipefail

VER="${1:?version required}"
OUT="${2:-release}"
ROOT="$(cd "$(dirname "$0")/../../" && pwd)"
WORK="$(mktemp -d)"
PKG="$WORK/pkg"

if [ ! -d "$OUT/linux-unpacked" ]; then
  echo "error: $OUT/linux-unpacked not found - run electron-builder --linux dir first" >&2
  exit 1
fi

mkdir -p "$PKG/opt/designshop" "$PKG/usr/bin" \
         "$PKG/usr/share/applications" "$PKG/usr/share/icons/hicolor/512x512/apps"

cp -R "$OUT/linux-unpacked/." "$PKG/opt/designshop/"
chmod +x "$PKG/opt/designshop/designshop" 2>/dev/null || true
chmod +x "$PKG/opt/designshop/chrome-sandbox" 2>/dev/null || true

cat > "$PKG/usr/bin/designshop" <<'LAUNCH'
#!/bin/sh
exec /opt/designshop/designshop "$@"
LAUNCH
chmod +x "$PKG/usr/bin/designshop"

cp "$ROOT/build/icon.png" "$PKG/usr/share/icons/hicolor/512x512/apps/designshop.png"

cat > "$PKG/usr/share/applications/designshop.desktop" <<'DESK'
[Desktop Entry]
Name=DesignShop
GenericName=Photo & Thumbnail Editor
Comment=Design thumbnails and social graphics
Exec=designshop %U
Icon=designshop
Terminal=false
Type=Application
Categories=Graphics;2DGraphics;Photography;
MimeType=image/png;image/jpeg;image/webp;application/x-designshop;
Keywords=design;photo;editor;thumbnail;graphics;
StartupWMClass=DesignShop
DESK

cat > "$WORK/PKGBUILD" <<PKGBUILD
# Maintainer: DesignShop <hello@designshop.app>
pkgname=designshop-bin
pkgver=${VER}
pkgrel=1
pkgdesc="Friendly Photoshop-class editor for thumbnails and social graphics"
arch=('x86_64')
url="https://github.com/Manixpcshot/DesignShop"
license=('MIT')
depends=('gtk3' 'nss' 'libxss' 'libxtst' 'at-spi2-core' 'libnotify' 'libsecret' 'xdg-utils')
options=('!strip' '!emptydirs')
source=()
sha256sums=()

package() {
  cp -R "\$startdir/pkg/." "\$pkgdir/"
}

post_install() {
  update-desktop-database -q 2>/dev/null || true
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
}
PKGBUILD

cat > "$WORK/INSTALL-NOTES.txt" <<NOTES
DesignShop ${VER} for Arch / Manjaro
====================================

1. extract:   tar xf DesignShop-${VER}-arch.tar.gz
2. install:   cd designshop-bin && makepkg -si
3. run:       designshop

Or copy the files manually:
   sudo cp -R pkg/. /

The prebuilt payload lives in pkg/opt/designshop (Electron app),
with launchers in pkg/usr/bin and pkg/usr/share.
NOTES

tar -C "$WORK" -czf "$OUT/DesignShop-${VER}-arch.tar.gz" PKGBUILD INSTALL-NOTES.txt pkg
rm -rf "$WORK"
echo "wrote $OUT/DesignShop-${VER}-arch.tar.gz"
