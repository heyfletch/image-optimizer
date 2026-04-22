#!/bin/bash
# Create small .app wrappers for Finder toolbar buttons
# These can be dragged to the Finder toolbar for quick access

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APPS_DIR="$SCRIPT_DIR/toolbar-apps"

mkdir -p "$APPS_DIR"

create_app() {
  local name="$1"
  local script="$2"
  local app_dir="$APPS_DIR/${name}.app"

  echo "Creating toolbar app: $name"

  mkdir -p "$app_dir/Contents/MacOS"
  mkdir -p "$app_dir/Contents/Resources"

  # Create Info.plist
  cat > "$app_dir/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$name</string>
    <key>CFBundleDisplayName</key>
    <string>$name</string>
    <key>CFBundleIdentifier</key>
    <string>com.image-optimizer.$(echo "$name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>run</string>
    <key>NSAppleEventsUsageDescription</key>
    <string>Image Optimizer needs to display notifications.</string>
</dict>
</plist>
PLIST

  # Create executable that passes Finder selection to the shell script
  cat > "$app_dir/Contents/MacOS/run" << SCRIPT
#!/bin/bash
# Get selected files from Finder via AppleScript
files=\$(osascript -e '
  tell application "Finder"
    set selectedItems to selection
    set filePaths to {}
    repeat with anItem in selectedItems
      set end of filePaths to POSIX path of (anItem as alias)
    end repeat
    set AppleScript'\''s text item delimiters to "
"
    return filePaths as text
  end tell
')

if [ -z "\$files" ]; then
  exit 0
fi

# Convert newline-separated list to arguments
while IFS= read -r file; do
  "$script" "\$file"
done <<< "\$files"
SCRIPT

  chmod +x "$app_dir/Contents/MacOS/run"
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
create_app "To WebP" "$SCRIPT_DIR/to-webp.sh"
create_app "To JPEG" "$SCRIPT_DIR/to-jpg.sh"
create_app "To 2400px" "$SCRIPT_DIR/to-2400px.sh"
create_app "To 1200px" "$SCRIPT_DIR/to-1200px.sh"
create_app "To 512px" "$SCRIPT_DIR/to-512px.sh"

echo ""
echo "Toolbar apps created in: $APPS_DIR"
echo ""
echo "To add to Finder toolbar:"
echo "  1. Open Finder"
echo "  2. View → Customize Toolbar..."
echo "  3. Drag an app from $APPS_DIR into the toolbar"
echo ""
echo "Or just drag the .app directly to the Finder toolbar while holding Cmd."
