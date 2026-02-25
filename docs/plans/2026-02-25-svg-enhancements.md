# SVG Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three features: show output format in the "Optimized" overlay label, SVG resize (change width/height attributes to match the selected size), and SVG Make Responsive (remove fixed dimensions so the SVG scales to its container).

**Architecture:** SVG resize and Make Responsive are both post-SVGO string transformations applied in `processor.ts`. A new `svgResponsive` flag is added to `OptimizeSettings` and threaded through the full stack. The overlay label change is purely frontend — `optimizedFormat` is added to `ImageState` and passed down to `ImagePreview`.

**Tech Stack:** TypeScript, React, Tauri sidecar (Node.js), SVGO

---

### Task 1: Add `svgResponsive` to types and `optimizedFormat` to ImageState

**Files:**
- Modify: `sidecar/src/types.ts`
- Modify: `src/hooks/useImageProcessor.ts`
- Modify: `src/App.tsx`

**Step 1: Add `svgResponsive` to `OptimizeSettings` in types.ts**

In `sidecar/src/types.ts`, add `svgResponsive: boolean` to `OptimizeSettings`:

```typescript
export interface OptimizeSettings {
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'svg' | 'same';
  quality: number;
  width: number | null;
  height: number | null;
  maintainAspectRatio: boolean;
  maxFileSize: number | null;
  svgMode: 'safe' | 'standard' | null;
  svgResponsive: boolean;
}
```

**Step 2: Add `optimizedFormat` to `ProcessResult` in useImageProcessor.ts**

In `src/hooks/useImageProcessor.ts`, add `optimizedFormat` to `ProcessResult` and populate it:

```typescript
export interface ProcessResult {
  optimizedPath: string;
  optimizedSize: number;
  optimizedWidth: number;
  optimizedHeight: number;
  optimizedFormat: string;
}
```

In the `optimize` callback where it returns the result:
```typescript
return {
  optimizedPath: response.outputPath || outputPath,
  optimizedSize: response.outputSize || 0,
  optimizedWidth: response.width || 0,
  optimizedHeight: response.height || 0,
  optimizedFormat: response.format || '',
};
```

**Step 3: Add `optimizedFormat` to `ImageState` in App.tsx and update `defaultSettings`**

In `src/App.tsx`:

Add `optimizedFormat: string | null` to the `ImageState` interface:
```typescript
interface ImageState {
  path: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  format: string;
  optimizedPath: string | null;
  optimizedSize: number | null;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  optimizedFormat: string | null;
  status: 'pending' | 'processing' | 'done';
}
```

Update `defaultSettings` to include `svgResponsive: false`:
```typescript
const defaultSettings = {
  format: "same" as const,
  quality: 92,
  width: null,
  height: null,
  maintainAspectRatio: true,
  maxFileSize: null,
  svgMode: null,
  svgResponsive: false,
};
```

In `loadImages`, add `optimizedFormat: null` to the initial push:
```typescript
newImages.push({
  ...info,
  optimizedPath: null,
  optimizedSize: null,
  optimizedWidth: null,
  optimizedHeight: null,
  optimizedFormat: null,
  status: 'pending',
});
```

In `optimizeImage`, store `optimizedFormat` from the result:
```typescript
setImages(prev => prev.map((im, i) =>
  i === index ? {
    ...im,
    optimizedPath: result.optimizedPath,
    optimizedSize: result.optimizedSize,
    optimizedWidth: result.optimizedWidth,
    optimizedHeight: result.optimizedHeight,
    optimizedFormat: result.optimizedFormat,
    status: 'done',
  } : im
));
```

**Step 4: Fix the `defaultSettings` in `useImageProcessor.ts`**

In `src/hooks/useImageProcessor.ts`, add `svgResponsive: false` to the local `defaultSettings` object (used for the info ping):
```typescript
const defaultSettings: OptimizeSettings = {
  format: 'same',
  quality: 92,
  width: null,
  height: null,
  maintainAspectRatio: true,
  maxFileSize: null,
  svgMode: null,
  svgResponsive: false,
};
```

**Step 5: Commit**
```bash
git add sidecar/src/types.ts src/hooks/useImageProcessor.ts src/App.tsx
git commit -m "feat: add svgResponsive to settings and optimizedFormat to image state"
```

---

### Task 2: Show "Optimized PNG" in the overlay label

**Files:**
- Modify: `src/components/ImagePreview.tsx`
- Modify: `src/App.tsx` (pass new prop)

**Step 1: Add `optimizedFormat` prop to `ImagePreview`**

In `src/components/ImagePreview.tsx`, add `optimizedFormat: string | null` to `ImagePreviewProps`:

```typescript
interface ImagePreviewProps {
  originalPath: string;
  optimizedPath: string | null;
  originalSize: number;
  optimizedSize: number | null;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  optimizedFormat: string | null;
  filename: string;
}
```

Update the destructuring in the function signature to include `optimizedFormat`.

**Step 2: Update the label logic**

Replace line 57:
```typescript
const label = isOriginal ? 'Original' : 'Optimized';
```
With:
```typescript
const label = isOriginal
  ? 'Original'
  : `Optimized ${(optimizedFormat || '').toUpperCase()}`.trim();
```

**Step 3: Pass `optimizedFormat` from App.tsx**

In `src/App.tsx`, in the `<ImagePreview>` JSX (around line 185-195), add:
```tsx
optimizedFormat={selectedImage.optimizedFormat}
```

**Step 4: Verify it works**
Run `npm run tauri dev` and optimize an image. The overlay should show "Optimized PNG", "Optimized WEBP", etc.

**Step 5: Commit**
```bash
git add src/components/ImagePreview.tsx src/App.tsx
git commit -m "feat: show output format in Optimized overlay label"
```

---

### Task 3: SVG resize — backend

**Files:**
- Modify: `sidecar/src/formats/svg.ts`
- Modify: `sidecar/src/processor.ts`

**Step 1: Add `resizeSvg` function to `svg.ts`**

In `sidecar/src/formats/svg.ts`, add this function after the existing code:

```typescript
export function resizeSvg(
  svgContent: string,
  targetWidth: number,
  originalWidth: number,
  originalHeight: number
): { content: string; width: number; height: number } {
  const scale = targetWidth / originalWidth;
  const newWidth = Math.round(targetWidth);
  const newHeight = Math.round(originalHeight * scale);

  // Replace or inject width attribute on the <svg> element
  let result = svgContent;

  if (/(<svg[^>]*)\swidth="[^"]*"/.test(result)) {
    result = result.replace(/(<svg[^>]*)\swidth="[^"]*"/, `$1 width="${newWidth}"`);
  } else {
    result = result.replace(/(<svg)(\s|>)/, `$1 width="${newWidth}"$2`);
  }

  if (/(<svg[^>]*)\sheight="[^"]*"/.test(result)) {
    result = result.replace(/(<svg[^>]*)\sheight="[^"]*"/, `$1 height="${newHeight}"`);
  } else {
    result = result.replace(/(<svg)(\s|>)/, `$1 height="${newHeight}"$2`);
  }

  return { content: result, width: newWidth, height: newHeight };
}
```

**Step 2: Add `makeSvgResponsive` function to `svg.ts`**

```typescript
export function makeSvgResponsive(
  svgContent: string,
  fallbackWidth: number,
  fallbackHeight: number
): string {
  let result = svgContent;

  // Ensure viewBox exists before removing width/height
  if (!/viewBox=/i.test(result)) {
    result = result.replace(
      /(<svg)(\s|>)/,
      `$1 viewBox="0 0 ${fallbackWidth} ${fallbackHeight}"$2`
    );
  }

  // Remove width and height attributes from the <svg> element only
  result = result.replace(/(<svg[^>]*)\swidth="[^"]*"/, '$1');
  result = result.replace(/(<svg[^>]*)\sheight="[^"]*"/, '$1');

  return result;
}
```

**Step 3: Update the SVG handling block in `processor.ts`**

Import the two new functions at the top:
```typescript
import { optimizeSvg, resizeSvg, makeSvgResponsive } from './formats/svg.js';
```

Replace the current SVG handling block (starting at `if (targetFormat === 'svg') {`) with:

```typescript
if (targetFormat === 'svg') {
  const svgContent = fs.readFileSync(workingPath, 'utf8');
  let optimized = optimizeSvg(svgContent, settings.svgMode || 'standard');

  let finalWidth = info.width;
  let finalHeight = info.height;

  // Resize SVG if a target width is set
  if (settings.width && info.width > 0) {
    const resized = resizeSvg(optimized, settings.width, info.width, info.height);
    optimized = resized.content;
    finalWidth = resized.width;
    finalHeight = resized.height;
  }

  // Make responsive: remove fixed width/height, keep viewBox
  if (settings.svgResponsive) {
    optimized = makeSvgResponsive(optimized, finalWidth, finalHeight);
    // Responsive SVGs have no fixed pixel size; report pre-responsive dimensions
  }

  fs.writeFileSync(outputPath, optimized);
  const outputStats = fs.statSync(outputPath);
  return {
    id: '', success: true, outputPath,
    inputSize: info.size, outputSize: outputStats.size,
    width: finalWidth, height: finalHeight, format: 'svg',
  };
}
```

**Step 4: Commit**
```bash
git add sidecar/src/formats/svg.ts sidecar/src/processor.ts
git commit -m "feat: add SVG resize and make-responsive transformations"
```

---

### Task 4: SVG resize — frontend (show dimensions for SVG output)

**Files:**
- Modify: `src/components/SettingsPanel.tsx`

**Step 1: Update `showDimensions` logic**

In `src/components/SettingsPanel.tsx`, replace:
```typescript
const showDimensions = !isSvgOutput;
```
With:
```typescript
const showDimensions = !(isSvgOutput && settings.svgResponsive);
```

This shows dimension controls for SVG output unless Make Responsive is enabled.

**Step 2: Verify SVG dimensions are now visible**
Run `npm run tauri dev`, load an SVG, keep format as SVG — the dimension preset buttons (2400, 1200, 512, Original) should now appear.

**Step 3: Commit**
```bash
git add src/components/SettingsPanel.tsx
git commit -m "feat: show dimension controls for SVG output"
```

---

### Task 5: SVG Make Responsive — frontend toggle

**Files:**
- Modify: `src/components/SvgModeSelector.tsx`
- Modify: `src/components/SettingsPanel.tsx`

**Step 1: Add Make Responsive toggle to `SvgModeSelector.tsx`**

Add a `svgResponsive` prop and `onResponsiveChange` callback. Replace the entire component:

```typescript
interface SvgModeSelectorProps {
  value: string | null;
  onChange: (mode: string) => void;
  svgResponsive: boolean;
  onResponsiveChange: (responsive: boolean) => void;
}

export function SvgModeSelector({ value, onChange, svgResponsive, onResponsiveChange }: SvgModeSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">SVG Optimization Level</label>
        <div className="space-y-1">
          {SVG_MODES.map(({ value: mode, label, desc }) => (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                value === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className="ml-2 text-gray-400">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">SVG Options</label>
        <button
          onClick={() => onResponsiveChange(!svgResponsive)}
          className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
            svgResponsive
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <span className="font-medium">Make Responsive</span>
          <span className="ml-2 text-gray-400">Removes fixed size, scales to container</span>
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Wire up `svgResponsive` in `SettingsPanel.tsx`**

Update the `<SvgModeSelector>` usage to pass the new props:
```tsx
{showSvgMode && (
  <SvgModeSelector
    value={settings.svgMode}
    onChange={(svgMode) => update({ svgMode: svgMode as OptimizeSettings['svgMode'] })}
    svgResponsive={settings.svgResponsive}
    onResponsiveChange={(svgResponsive) => update({ svgResponsive })}
  />
)}
```

**Step 3: Reset `svgResponsive` when switching away from SVG format**

In `src/App.tsx`, in the `useEffect` that auto-switches format (around line 49), reset `svgResponsive` when leaving SVG:
```typescript
useEffect(() => {
  if (!selectedImage) return;
  if (selectedImage.format === 'svg' && settings.format !== 'svg') {
    setSettings({ ...settings, format: 'svg', svgMode: settings.svgMode || 'standard' });
  } else if (selectedImage.format !== 'svg' && settings.format === 'svg') {
    setSettings({ ...settings, format: 'same', svgResponsive: false });
  }
}, [selectedImage?.format]);
```

**Step 4: Verify end-to-end**
1. Load an SVG
2. Keep format as SVG
3. Enable "Make Responsive" — dimension controls should disappear
4. Click Optimize — open the output SVG in a browser, resize the window — SVG should scale to fill

**Step 5: Commit**
```bash
git add src/components/SvgModeSelector.tsx src/components/SettingsPanel.tsx src/App.tsx
git commit -m "feat: add Make Responsive toggle for SVG output"
```

---

### Task 6: Final verification

1. Load a JPEG, optimize as PNG → overlay shows "Optimized PNG"
2. Load a JPEG, optimize as WebP → overlay shows "Optimized WEBP"
3. Load an SVG with `width="800" height="600"`, select 2400px, optimize → output SVG has `width="2400" height="1800"`
4. Load an SVG, enable Make Responsive, optimize → output SVG has no `width`/`height` but has `viewBox`, scales in browser
5. Load an SVG, select 2400px, enable Make Responsive → dimension controls hidden; output SVG is responsive
6. TypeScript compiles with no errors: `npm run build`
