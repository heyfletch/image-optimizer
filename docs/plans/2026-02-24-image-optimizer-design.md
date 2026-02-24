# Image Optimizer — Design Document

**Date**: 2026-02-24
**Status**: Approved

## Overview

A native Mac image optimization app built with Tauri v2. Drop images in, preview optimized results, drag them out to WordPress or save to disk. Preserves color fidelity as the top priority, replicating the behavior of the existing [image-helper.sh](https://github.com/heyfletch/mactools/blob/main/image-helper.sh) bash script.

## Architecture

**Stack**: Tauri v2 (Rust shell) + React (Vite + Tailwind CSS) frontend + Node.js sidecar (Sharp + SVGO)

```
┌─────────────────────────────────────────────┐
│              Tauri v2 Shell                  │
│  ┌───────────────────┐  ┌────────────────┐  │
│  │   React Frontend   │  │  Node Sidecar  │  │
│  │   (Vite + Tailwind)│  │  (Sharp/SVGO)  │  │
│  │                    │  │                │  │
│  │  - Drag-drop zone  │  │  - JPEG: mozjpeg│  │
│  │  - Preview/toggle  │<->  - PNG: optipng │  │
│  │  - Settings UI     │  │  - WebP: sharp  │  │
│  │  - Sliders/inputs  │  │  - AVIF: sharp  │  │
│  │                    │  │  - SVG: SVGO    │  │
│  └───────────────────┘  └────────────────┘  │
│                                             │
│  Tauri APIs:                                │
│  - Native drag-out (file promises)          │
│  - File system access                       │
│  - Shell commands (CLI fallback)            │
│  - Window management                        │
└─────────────────────────────────────────────┘

External (phase 2):
  - Automator Quick Actions -> invoke sidecar
  - Finder Toolbar shortcuts -> invoke sidecar
```

**Data flow**:
1. User drops image(s) -> Tauri receives file paths
2. Frontend sends paths + settings to Node sidecar via Tauri command
3. Sidecar processes images, writes to temp directory
4. Frontend displays optimized preview from temp file
5. User chooses action: drag out, save to folder, or replace original

## Supported Formats

**Input**: JPEG, PNG, WebP, AVIF, SVG, HEIC/HEIF
**Output**: JPEG, PNG, WebP, AVIF, SVG (no HEIC output — HEIC defaults to JPEG)

## UI Layout

```
┌──────────────────────────────────────────────────────┐
│  Image Optimizer                            -  []  x │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────┐  ┌────────────────────┐  │
│  │                        │  │  Format             │  │
│  │                        │  │  [JPEG] [PNG] [WebP]│  │
│  │                        │  │  [AVIF] [SVG] [Same]│  │
│  │      Image Preview     │  │                     │  │
│  │    (click to toggle    │  ├─────────────────────┤  │
│  │   original/optimized)  │  │  Dimensions         │  │
│  │                        │  │  W: [====|===] 1200 │  │
│  │                        │  │  H: auto (locked)   │  │
│  │  ┌──────────────────┐  │  │  Lock aspect: on    │  │
│  │  │ Original  428 KB │  │  │  Presets:           │  │
│  │  └──────────────────┘  │  │  [2400] [1200] [512]│  │
│  │                        │  ├─────────────────────┤  │
│  └────────────────────────┘  │  Quality       [92] │  │
│                              │  [====|=======]     │  │
│  click-to-edit-filename.jpg  ├─────────────────────┤  │
│                              │  Max file size       │  │
│                              │  [400] KB            │  │
│                              ├─────────────────────┤  │
│                              │  SVG Mode (if SVG)   │  │
│                              │  o Safe              │  │
│                              │  o Bricks Safe       │  │
│                              │  o Efficient         │  │
│                              ├─────────────────────┤  │
│                              │                     │  │
│                              │  [ Optimize ]       │  │
│                              │                     │  │
│                              └─────────────────────┘  │
│                                                      │
│  Status: Ready - Drag image here or click to browse  │
└──────────────────────────────────────────────────────┘
```

### Key Interactions

- **Drop zone**: The entire left panel. Accepts single or multiple images. When empty, shows a large drop prompt.
- **Format selector**: Pill buttons. "Same" keeps original format (default). SVG mode options only appear when input is SVG.
- **Dimension controls**: Width slider + manual input field. Height auto-calculates when aspect ratio locked (default). Preset buttons (2400/1200/512) set width in one click. No upscaling — images smaller than target stay at original size.
- **Quality slider**: 1-100, defaults to 92. Manual input field next to slider. Hidden for PNG (lossless optimization).
- **Max file size**: Optional. When set, iteratively reduces quality via binary search until file fits under limit (max 5 iterations, warns if quality drops below 30).
- **Toggle preview**: Click the image to flip between original and optimized. Overlay label shows which you're viewing + file size.
- **Filename**: Displayed below preview, click to edit. Auto-sanitized (commas and underscores removed).
- **Multi-image**: Thumbnail strip below preview. Click any to see its preview. "Optimize All" processes batch with current settings (same settings for all).

## Image Processing Pipeline

### Per-Format Settings (Color Fidelity Priority)

| Format | Engine | Key Settings | Color Fidelity |
|--------|--------|-------------|----------------|
| JPEG | Sharp (mozjpeg) | quality: 92, `mozjpeg: true` | Preserves chroma subsampling |
| PNG | Sharp | `palette: false`, compression level 9, no dithering | Lossless — colors unchanged |
| WebP | Sharp (libwebp) | quality: 85, `smartSubsample: false`, `sharpYuv: true` | Preserves chroma accuracy |
| AVIF | Sharp (libavif) | quality: 50, `chromaSubsampling: '4:4:4'` | Full chroma preserved |
| SVG | SVGO | Three preset configs (see below) | N/A (vector) |
| HEIC (input) | Sharp | Decoded, then processed as target format (default: JPEG) | Preserved through decode |

### Resize Behavior

- `resize({ width, fit: 'inside' })` — only downscales, never upscales
- Aspect ratio locked by default
- When unlocked: `fit: 'cover'` with `position: 'center'` for cropping

### Max File Size Enforcement

1. Process with user's quality setting
2. Check output size against limit
3. If over: binary search on quality until under limit
4. Cap at 5 iterations
5. Warn if target requires quality below 30

### SVG Optimization Presets

| Preset | Removes | Preserves |
|--------|---------|-----------|
| **Safe** | Metadata, comments, editor cruft, empty attributes | All classes, IDs, viewBox, dimensions, structure |
| **Bricks Safe** | Safe + merges paths where possible, removes unused defs | Classes/IDs that Bricks Builder targets, data attributes, viewBox |
| **Efficient** | Aggressive — minifies paths, removes IDs/classes not in `<style>`, collapses groups, rounds coordinates | Only inline styles and structural elements needed for display |

### CLI Fallback

- On first launch, Sharp processes a test JPEG and compares output metrics
- If Sharp's mozjpeg mode is unavailable, fall back to CLI `djpeg | cjpeg`
- Automatic and invisible to the user

## Output & Actions

**Post-optimization actions (preview first, then act):**

1. **Drag out** — native drag from preview to WordPress, Finder, or any drop target (Tauri file promise API)
2. **Save to folder** — remembers last-used folder. Dropdown for "Save As..." one-off location
3. **Replace original** — overwrites source file. Original moved to Trash (recoverable)
4. **Copy to clipboard** — copies optimized image data

**Filename behavior:**
- Auto-sanitized: commas and underscores removed
- Click-to-edit before saving
- Format conversion: `photo.png` -> `photo.webp`

## Finder Integration (Phase 2)

### Quick Actions (right-click menu)

Right-click image(s) in Finder -> Quick Actions:
- **Optimize** — default preset (same format, quality 92, no resize)
- **To WebP** / **To JPG** — format conversion with defaults
- **To 2400px** / **To 1200px** / **To 512px** — resize with optimization

Invoke the Node sidecar in headless mode. Optimized file saved next to original. Original moved to Trash.

### Finder Toolbar Buttons

Small `.app` bundles (Automator or Swift wrapper) that:
1. Accept selected file(s) in Finder
2. Pass to sidecar with preset
3. Show macOS notification on completion ("Optimized photo.jpg — 428 KB -> 112 KB")

Toolbar button presets are configurable in the main app's settings.

## Settings (Persisted)

| Setting | Default | Notes |
|---------|---------|-------|
| Output quality | JPEG: 92, WebP: 85, AVIF: 50 | Per-format defaults |
| Max file size | Off | Remembers last value when enabled |
| Output folder | None (preview first) | Remembers last-used folder |
| Resize presets | 2400, 1200, 512 | Editable — add/remove/reorder |
| Default format | Same as input | Can change to always convert |
| Aspect ratio lock | On | |
| Filename sanitization | On (remove commas, underscores) | Can toggle off |
| SVG default mode | Safe | |

**Default optimization preset** (used by Quick Actions and Finder toolbar):
- Keep original format (except HEIC -> JPEG)
- Quality 92
- No resize
- Max file size: user's setting or off
- Filename sanitized

**Storage**: `~/Library/Application Support/com.image-optimizer/settings.json`

## Future Considerations

- Per-image settings override (Approach C from brainstorming) if batch workflow needs it
- Web app version: React UI is 100% reusable, swap Tauri APIs for browser/server equivalents
- Additional Finder toolbar buttons as needed
