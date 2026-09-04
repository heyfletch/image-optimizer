#!/bin/bash
# Create small .app wrappers for Finder toolbar buttons
# These can be dragged to the Finder toolbar for quick access
#
# Built with osacompile so each bundle carries Apple's native applet stub
# (arm64 + x86_64). A plain shell script in Contents/MacOS has no Mach-O
# header, so LaunchServices assumes Intel and demands Rosetta.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APPS_DIR="$SCRIPT_DIR/toolbar-apps"
ICONS_DIR="$SCRIPT_DIR/icons"

mkdir -p "$APPS_DIR"

# Build Contents/Resources/applet.icns from icons/<name>.png. The icon lives in
# the bundle, not in a resource-fork "Icon\r" file, so it survives git and any
# regeneration.
install_icon() {
  local name="$1"
  local app_dir="$2"
  local png="$ICONS_DIR/${name}.png"

  [ -f "$png" ] || { echo "  no icon: $png"; return 0; }

  local work
  work="$(mktemp -d)/icon.iconset"
  mkdir -p "$work"

  local s
  for s in 16 32 128 256 512; do
    sips -z $s $s "$png" --out "$work/icon_${s}x${s}.png" >/dev/null 2>&1
    sips -z $((s * 2)) $((s * 2)) "$png" --out "$work/icon_${s}x${s}@2x.png" >/dev/null 2>&1
  done

  iconutil -c icns "$work" -o "$app_dir/Contents/Resources/applet.icns"
  rm -rf "$(dirname "$work")"
}

create_app() {
  local name="$1"
  local script="$2"
  local app_dir="$APPS_DIR/${name}.app"

  echo "Creating toolbar app: $name"

  rm -rf "$app_dir"

  # 'on open' handles the files Finder hands over on a toolbar click or drop -
  # no Automation permission needed. 'on run' is the fallback for a bare launch
  # and asks Finder for its selection, which does prompt for Automation once.
  osacompile -o "$app_dir" -e "
on process(theFiles)
  repeat with f in theFiles
    do shell script quoted form of \"$script\" & \" \" & quoted form of POSIX path of f
  end repeat
end process

on open theFiles
  process(theFiles)
end open

on run
  tell application \"Finder\" to set sel to selection as alias list
  if sel is {} then return
  process(sel)
end run
"

  local id
  id="com.image-optimizer.$(echo "$name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
  local plist="$app_dir/Contents/Info.plist"
  set_key() {
    /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$plist" >/dev/null 2>&1 \
      || /usr/libexec/PlistBuddy -c "Set :$1 $2" "$plist" >/dev/null
  }
  set_key CFBundleName "$name"
  set_key CFBundleDisplayName "$name"
  set_key CFBundleIdentifier "$id"
  set_key NSAppleEventsUsageDescription "Image Optimizer needs to control Finder to read your selected files."

  # Declare image document handling so Finder passes the selection on a
  # toolbar click instead of just launching the app
  /usr/libexec/PlistBuddy -c "Delete :CFBundleDocumentTypes" "$plist" >/dev/null 2>&1 || true
  /usr/libexec/PlistBuddy \
    -c "Add :CFBundleDocumentTypes array" \
    -c "Add :CFBundleDocumentTypes:0 dict" \
    -c "Add :CFBundleDocumentTypes:0:CFBundleTypeName string Image" \
    -c "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Viewer" \
    -c "Add :CFBundleDocumentTypes:0:LSHandlerRank string Alternate" \
    -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" \
    -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string public.image" \
    -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:1 string public.svg-image" \
    "$plist" >/dev/null

  install_icon "$name" "$app_dir"

  # Re-sign ad hoc so macOS trusts the modified bundle
  codesign --force --deep --sign - "$app_dir" 2>/dev/null || true
}

# Build sidecar first
echo "Building sidecar..."
cd "$SCRIPT_DIR/../sidecar"
npx tsc
cd "$SCRIPT_DIR"

# Make action scripts executable
chmod +x "$SCRIPT_DIR"/*.sh

# Create toolbar apps
create_app "Optimize" "$SCRIPT_DIR/optimize.sh"
create_app "WebP" "$SCRIPT_DIR/to-webp.sh"
create_app "AVIF" "$SCRIPT_DIR/to-avif.sh"
create_app "JPEG" "$SCRIPT_DIR/to-jpg.sh"
create_app "2400px" "$SCRIPT_DIR/to-2400px.sh"
create_app "1200px" "$SCRIPT_DIR/to-1200px.sh"
create_app "512px" "$SCRIPT_DIR/to-512px.sh"

echo ""
echo "Toolbar apps created in: $APPS_DIR"
echo ""
echo "To add to Finder toolbar:"
echo "  1. Open Finder"
echo "  2. View → Customize Toolbar..."
echo "  3. Drag an app from $APPS_DIR into the toolbar"
echo ""
echo "Or just drag the .app directly to the Finder toolbar while holding Cmd."
