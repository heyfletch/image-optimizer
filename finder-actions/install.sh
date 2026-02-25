#!/bin/bash
# Install Image Optimizer Quick Actions for Finder
# Creates Automator Quick Actions that appear in Finder's right-click menu

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICES_DIR="$HOME/Library/Services"

# Ensure sidecar is built
echo "Building sidecar..."
cd "$PROJECT_DIR/sidecar"
npx tsc

# Make scripts executable
chmod +x "$SCRIPT_DIR"/*.sh

# Create Quick Actions using osacompile
create_quick_action() {
  local name="$1"
  local script="$2"
  local workflow_dir="$SERVICES_DIR/${name}.workflow"

  echo "Creating Quick Action: $name"

  # Create the workflow directory structure
  mkdir -p "$workflow_dir/Contents"

  # Create the Info.plist
  cat > "$workflow_dir/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSServices</key>
	<array>
		<dict>
			<key>NSMenuItem</key>
			<dict>
				<key>default</key>
				<string>WORKFLOW_NAME</string>
			</dict>
			<key>NSMessage</key>
			<string>runWorkflowAsService</string>
		</dict>
	</array>
</dict>
</plist>
PLIST
  sed -i '' "s/WORKFLOW_NAME/$name/" "$workflow_dir/Contents/Info.plist"

  # Create the document.wflow
  cat > "$workflow_dir/Contents/document.wflow" << WFLOW
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>523</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<false/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.path</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>1.0.2</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMBundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>AMCategory</key>
				<string>AMCategoryUtilities</string>
				<key>AMIconName</key>
				<string>Automator</string>
				<key>AMKeywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
				</array>
				<key>AMName</key>
				<string>Run Shell Script</string>
				<key>AMParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>$script "\$@"</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.path</string>
					</array>
				</dict>
				<key>AMTag</key>
				<string>AMTagUtilities</string>
			</dict>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>/System/Library/CoreServices/Finder.app</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject</string>
		<key>presentationMode</key>
		<integer>0</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>uniqueID</key>
		<string>$(uuidgen)</string>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
WFLOW
}

# Create all Quick Actions
create_quick_action "Optimize Image" "$SCRIPT_DIR/optimize.sh"
create_quick_action "Image to WebP" "$SCRIPT_DIR/to-webp.sh"
create_quick_action "Image to JPEG" "$SCRIPT_DIR/to-jpg.sh"
create_quick_action "Image to 2400px" "$SCRIPT_DIR/to-2400px.sh"
create_quick_action "Image to 1200px" "$SCRIPT_DIR/to-1200px.sh"
create_quick_action "Image to 512px" "$SCRIPT_DIR/to-512px.sh"

echo ""
echo "Quick Actions installed to: $SERVICES_DIR"
echo ""
echo "To use: Right-click any image in Finder → Quick Actions → [action name]"
echo ""
echo "To remove: Delete the .workflow folders from ~/Library/Services/"
