# Image Optimizer Roadmap

## Multi-Select Thumbnails
- Shift+click two thumbnails to select that range
- Cmd+click to select individual thumbnails
- Drag selected thumbnails to drag-and-drop all selected optimized images

## Social Media Dimension Presets
- Facebook Post: 1200x630
- Facebook Cover: 820x312
- LinkedIn Banner: 1584x396
- LinkedIn Post: 1200x627
- Instagram Square: 1080x1080
- Instagram Story: 1080x1920
- Twitter Header: 1500x500
- YouTube Thumbnail: 1280x720
- Selecting a preset resizes and crops to those exact dimensions
- Default crop position: center

## Focal Area Crop Controls
- Arrow grid UI to set crop focal point (top, center, bottom, left, right, and corners)
- Determines which area of the image is preserved when cropping to social media presets

## Custom Focal Area
- Percentage-based offset for crop position (e.g., 10% from top, 22px from side)
- Pixel or percentage units
- Live preview of crop area

## Editable Filename
- FilenameEditor component exists but is not yet wired into the UI
- Click-to-edit the output filename before optimizing
- "Clean" button to sanitize filenames (replace spaces/special chars with hyphens)

## Lossless Toggle
- Add a lossless encoding toggle for WebP and AVIF formats
- When enabled, passes `lossless: true` to Sharp and disables the quality slider
- Best for screenshots, graphics, and text-heavy images
- Not applicable to JPEG (inherently lossy) or PNG (always lossless)
- Note: lossless re-encoding of photos can produce larger files than the original

## Settings Page
- Dedicated settings view to adjust defaults:
  - Default output format
  - Default quality
  - Default resize width
  - Default max file size
  - Output filename pattern (e.g., `{name}-optimized.{ext}`, `{name}-{width}.{ext}`)
- Persist all defaults across sessions
