# Image Optimizer

A macOS desktop app for optimizing and converting images. Built with Tauri, React, and a Node.js sidecar for image processing.

Supports JPEG, PNG, WebP, AVIF, HEIC, and SVG. Drag and drop images, adjust settings, and export optimized files.

## Features

- **Format conversion** — Convert between JPEG, PNG, WebP, AVIF, and SVG
- **Quality control** — Adjustable quality slider for lossy formats
- **Resize** — Preset widths (2400, 1200, 512) or custom values
- **SVG optimization** — Standard, Safe, or None optimization levels via SVGO
- **SVG resize** — Change SVG dimensions while preserving the viewBox coordinate system
- **SVG Make Responsive** — Strip fixed dimensions so SVGs scale to their container
- **Batch processing** — Drop multiple images and optimize them all
- **Drag to export** — Drag optimized images directly out of the app
- **Finder integration** — Right-click Quick Actions and toolbar buttons

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

## Install & Run

```bash
# Install frontend dependencies
npm install

# Install sidecar dependencies
cd sidecar && npm install && cd ..

# Build the sidecar
cd sidecar && npx tsc && cd ..

# Run the app in development mode
npm run tauri dev
```

## Build for Production

```bash
npm run tauri build
```

The built `.app` will be in `src-tauri/target/release/bundle/macos/`. To install:

```bash
cp -r "src-tauri/target/release/bundle/macos/Image Optimizer.app" /Applications/
```

On first launch, right-click the app in Applications and choose **Open** (bypasses Gatekeeper for unsigned apps).

**Note:** The app requires Node.js on the system (installed via [nvm](https://github.com/nvm-sh/nvm) or Homebrew). The sidecar and its dependencies are bundled inside the `.app`, but Node.js itself must be available.

## Finder Quick Actions

Right-click any image in Finder to optimize, convert, or resize without opening the app.

### Install Quick Actions

```bash
cd finder-actions && ./install.sh
```

This creates Automator workflows in `~/Library/Services/`:
- **Optimize Image** — Optimize in place (same format)
- **Image to WebP** — Convert to WebP
- **Image to JPEG** — Convert to JPEG
- **Image to 2400px** — Resize to 2400px wide
- **Image to 1200px** — Resize to 1200px wide
- **Image to 512px** — Resize to 512px wide

On macOS 26, the installer opens each workflow in Automator briefly to register it — this is required (writing the workflow files alone is not enough). The script handles this automatically, but do not interact with your Mac while it runs.

If any action is missing after install, right-click an image → **Quick Actions** → **Customize…** and toggle the missing items on.

### Install Toolbar Apps (optional)

Draggable buttons for the Finder toolbar that process whichever files are selected.

```bash
cd finder-actions && ./create-toolbar-apps.sh && open toolbar-apps
```

Then hold **Cmd** and drag any `.app` from the opened `toolbar-apps/` Finder window into the Finder toolbar.

### Uninstall

```bash
# Remove Quick Actions
rm -rf ~/Library/Services/Optimize\ Image.workflow
rm -rf ~/Library/Services/Image\ to\ *.workflow

# Remove toolbar apps
rm -rf finder-actions/toolbar-apps/
```

## Project Structure

```
image-optimizer/
  src/                  # React frontend (UI)
    components/         # React components
    hooks/              # Custom React hooks
    lib/                # IPC communication with sidecar
  src-tauri/            # Tauri/Rust shell
  sidecar/              # Node.js image processing backend
    src/
      formats/          # Format-specific optimizers (jpeg, png, webp, avif, svg)
      processor.ts      # Main processing pipeline
      resize.ts         # Resize logic
      ipc.ts            # stdin/stdout JSON communication
      index.ts          # Entry point (IPC mode + CLI mode)
  finder-actions/       # macOS Finder integration scripts
```

The Tauri app spawns the sidecar as a child process and communicates via JSON over stdin/stdout. The sidecar uses [Sharp](https://sharp.pixelplumbing.com/) for raster processing and [SVGO](https://svgo.dev/) for SVG optimization.

## Development

```bash
# Run the app (hot-reloads frontend, restarts sidecar on change)
npm run tauri dev

# After changing sidecar TypeScript, rebuild it
cd sidecar && npx tsc

# Type-check the frontend
npm run build

# Run sidecar tests
cd sidecar && npx vitest
```

The frontend hot-reloads automatically. The sidecar does **not** — restart `npm run tauri dev` after changing sidecar code.

### CLI Mode

The sidecar can be used standalone from the terminal:

```bash
node sidecar/dist/index.js --optimize --input photo.jpg --output photo-opt.jpg --quality 85
node sidecar/dist/index.js --optimize --input photo.jpg --output photo.webp --format webp
node sidecar/dist/index.js --optimize --input photo.jpg --output photo-sm.jpg --width 1200
node sidecar/dist/index.js --info --input photo.jpg
```
