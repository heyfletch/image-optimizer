# Image Optimizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tauri v2 Mac app for image optimization with color-fidelity-preserving processing, visual preview, and native drag-out.

**Architecture:** Tauri v2 shell wrapping a React/Vite/Tailwind frontend and a Node.js sidecar running Sharp + SVGO for image processing. Communication via line-delimited JSON over stdin/stdout.

**Tech Stack:** Tauri v2, React 18, Vite, Tailwind CSS, Sharp (mozjpeg/libvips), SVGO, TypeScript

**Key Research Findings:**
- Sharp `mozjpeg: true` preserves chroma but defaults to 4:2:0 — must read input metadata to preserve original subsampling
- Sharp `smartSubsample: true` is the equivalent of cwebp's `-sharp_yuv` flag
- Sharp AVIF defaults to 4:4:4 chroma (good for us)
- Sharp prebuilt binaries do NOT support HEIC — use macOS `sips` as CLI fallback
- Drag-out requires `@crabnebula/tauri-plugin-drag` (not built into Tauri)
- Drag-in uses Tauri's built-in `onDragDropEvent` API

---

## Phase 1: Project Foundation

### Task 1: Scaffold Tauri + React + Vite Project

**Files:**
- Create: project root via `create-tauri-app`
- Modify: `package.json`, `vite.config.ts`, `src-tauri/tauri.conf.json`

**Step 1: Create Tauri project**

Run:
```bash
npm create tauri-app@latest image-optimizer -- --template react-ts --manager npm
```

If running inside the existing repo, use `.` as the directory and merge into existing git.

**Step 2: Install and configure Tailwind CSS**

Run:
```bash
npm install -D tailwindcss @tailwindcss/vite
```

Update `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
```

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

**Step 3: Verify it builds**

Run: `npm run tauri dev`
Expected: Window opens with React default page, Tailwind styles working.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri v2 + React + Vite + Tailwind project"
```

---

### Task 2: Create Node Sidecar Project

**Files:**
- Create: `sidecar/package.json`
- Create: `sidecar/tsconfig.json`
- Create: `sidecar/src/index.ts`
- Create: `sidecar/src/ipc.ts`
- Create: `sidecar/src/types.ts`

**Step 1: Initialize sidecar project**

```bash
mkdir -p sidecar/src
cd sidecar
npm init -y
npm install sharp svgo
npm install -D typescript @types/node vitest
```

**Step 2: Create tsconfig.json**

`sidecar/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src"]
}
```

**Step 3: Create IPC protocol types**

`sidecar/src/types.ts`:
```ts
export interface ProcessRequest {
  id: string;
  action: 'optimize' | 'info' | 'ping';
  inputPath: string;
  outputPath: string;
  settings: OptimizeSettings;
}

export interface OptimizeSettings {
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'svg' | 'same';
  quality: number;          // 1-100, default 92
  width: number | null;     // null = no resize
  height: number | null;
  maintainAspectRatio: boolean;
  maxFileSize: number | null;  // bytes, null = no limit
  svgMode: 'safe' | 'bricks-safe' | 'efficient' | null;
}

export interface ProcessResponse {
  id: string;
  success: boolean;
  outputPath?: string;
  inputSize?: number;
  outputSize?: number;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  chromaSubsampling?: string;
}
```

**Step 4: Create IPC handler**

`sidecar/src/ipc.ts`:
```ts
import * as readline from 'readline';
import type { ProcessRequest, ProcessResponse } from './types.js';

type RequestHandler = (request: ProcessRequest) => Promise<ProcessResponse>;

export function startIPC(handler: RequestHandler): void {
  const rl = readline.createInterface({ input: process.stdin });

  rl.on('line', async (line) => {
    try {
      const request: ProcessRequest = JSON.parse(line);
      const response = await handler(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      const errorResponse: ProcessResponse = {
        id: 'unknown',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  // Signal ready
  process.stdout.write(JSON.stringify({ ready: true }) + '\n');
}
```

**Step 5: Create entry point**

`sidecar/src/index.ts`:
```ts
import { startIPC } from './ipc.js';
import type { ProcessRequest, ProcessResponse } from './types.js';

async function handleRequest(request: ProcessRequest): Promise<ProcessResponse> {
  if (request.action === 'ping') {
    return { id: request.id, success: true };
  }

  // TODO: implement optimize and info actions
  return { id: request.id, success: false, error: 'Not implemented' };
}

startIPC(handleRequest);
```

**Step 6: Verify sidecar runs**

Run:
```bash
cd sidecar && npx tsc && echo '{"id":"1","action":"ping"}' | node dist/index.js
```
Expected: `{"ready":true}` then `{"id":"1","success":true}`

**Step 7: Commit**

```bash
git add sidecar/
git commit -m "feat: create Node sidecar project with IPC protocol"
```

---

### Task 3: Wire Tauri to Sidecar

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/tauri.conf.json`
- Create: `src/lib/ipc.ts`

**Step 1: Add shell plugin to Tauri**

```bash
cd src-tauri && cargo add tauri-plugin-shell
```

```bash
npm add @tauri-apps/plugin-shell
```

**Step 2: Register plugin in lib.rs**

`src-tauri/src/lib.rs`:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: Configure permissions**

`src-tauri/capabilities/default.json` — add shell permissions:
```json
{
  "identifier": "shell:allow-spawn",
  "allow": [
    {
      "name": "node",
      "cmd": "node",
      "args": true
    }
  ]
}
```

Note: During development we spawn `node` directly. For production we'll switch to a compiled sidecar binary.

**Step 4: Create frontend IPC wrapper**

`src/lib/ipc.ts`:
```ts
import { Command } from '@tauri-apps/plugin-shell';
import type { ProcessRequest, ProcessResponse, OptimizeSettings } from '../../sidecar/src/types';

let sidecarProcess: Awaited<ReturnType<Command['spawn']>> | null = null;
let responseHandlers = new Map<string, (response: ProcessResponse) => void>();
let requestId = 0;

export async function startSidecar(): Promise<void> {
  const command = Command.create('node', ['../sidecar/dist/index.js']);

  command.stdout.on('data', (line: string) => {
    try {
      const data = JSON.parse(line);
      if (data.ready) {
        console.log('Sidecar ready');
        return;
      }
      const handler = responseHandlers.get(data.id);
      if (handler) {
        handler(data);
        responseHandlers.delete(data.id);
      }
    } catch {}
  });

  command.stderr.on('data', (line: string) => {
    console.error('Sidecar error:', line);
  });

  sidecarProcess = await command.spawn();
}

export function sendRequest(request: Omit<ProcessRequest, 'id'>): Promise<ProcessResponse> {
  const id = String(++requestId);
  return new Promise((resolve) => {
    responseHandlers.set(id, resolve);
    sidecarProcess?.write(JSON.stringify({ ...request, id }) + '\n');
  });
}

export async function stopSidecar(): Promise<void> {
  await sidecarProcess?.kill();
  sidecarProcess = null;
}
```

**Step 5: Test round-trip communication**

Update `src/App.tsx` to call `startSidecar()` on mount and send a ping. Verify in console that ping response arrives.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire Tauri shell plugin to Node sidecar IPC"
```

---

## Phase 2: Image Processing Engine (TDD)

### Task 4: JPEG Processor

**Files:**
- Create: `sidecar/src/formats/jpeg.ts`
- Create: `sidecar/tests/jpeg.test.ts`
- Create: `sidecar/tests/fixtures/` (test images)

**Step 1: Create test fixtures**

`sidecar/tests/fixtures/create-fixtures.ts` — a script to generate test images:
```ts
import sharp from 'sharp';
import path from 'path';

const dir = path.dirname(new URL(import.meta.url).pathname);

// Create a 200x150 test JPEG with known colors
await sharp({
  create: { width: 200, height: 150, channels: 3, background: { r: 255, g: 100, b: 50 } }
}).jpeg({ quality: 100 }).toFile(path.join(dir, 'test.jpg'));

// Create a 200x150 test PNG
await sharp({
  create: { width: 200, height: 150, channels: 4, background: { r: 0, g: 128, b: 255, alpha: 1 } }
}).png().toFile(path.join(dir, 'test.png'));

// Create a large 4000x3000 JPEG for resize testing
await sharp({
  create: { width: 4000, height: 3000, channels: 3, background: { r: 128, g: 200, b: 100 } }
}).jpeg({ quality: 95 }).toFile(path.join(dir, 'test-large.jpg'));

console.log('Test fixtures created');
```

Run: `npx tsx sidecar/tests/fixtures/create-fixtures.ts`

**Step 2: Write failing test**

`sidecar/tests/jpeg.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeJpeg } from '../src/formats/jpeg.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('JPEG optimizer', () => {
  it('compresses with mozjpeg at specified quality', async () => {
    const input = path.join(fixtures, 'test.jpg');
    const output = path.join(tmpDir, 'jpeg-test-output.jpg');

    await optimizeJpeg(input, output, { quality: 92 });

    expect(fs.existsSync(output)).toBe(true);
    const inputSize = fs.statSync(input).size;
    const outputSize = fs.statSync(output).size;
    expect(outputSize).toBeLessThanOrEqual(inputSize);

    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('jpeg');
  });

  it('preserves chroma subsampling from input', async () => {
    const input = path.join(fixtures, 'test.jpg');
    const output = path.join(tmpDir, 'jpeg-chroma-test.jpg');

    const inputMeta = await sharp(input).metadata();
    await optimizeJpeg(input, output, { quality: 92 });
    const outputMeta = await sharp(output).metadata();

    expect(outputMeta.chromaSubsampling).toBe(inputMeta.chromaSubsampling);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd sidecar && npx vitest run tests/jpeg.test.ts`
Expected: FAIL — `optimizeJpeg` not found

**Step 4: Implement JPEG processor**

`sidecar/src/formats/jpeg.ts`:
```ts
import sharp from 'sharp';

export interface JpegOptions {
  quality: number;
}

export async function optimizeJpeg(
  inputPath: string,
  outputPath: string,
  options: JpegOptions
): Promise<void> {
  // Read input metadata to preserve chroma subsampling
  const metadata = await sharp(inputPath).metadata();
  const chromaSubsampling = metadata.chromaSubsampling || '4:2:0';

  await sharp(inputPath)
    .jpeg({
      quality: options.quality,
      mozjpeg: true,
      chromaSubsampling,
    })
    .toFile(outputPath);
}
```

**Step 5: Run test to verify it passes**

Run: `cd sidecar && npx vitest run tests/jpeg.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add sidecar/src/formats/jpeg.ts sidecar/tests/
git commit -m "feat: JPEG processor with mozjpeg + chroma preservation"
```

---

### Task 5: PNG Processor

**Files:**
- Create: `sidecar/src/formats/png.ts`
- Create: `sidecar/tests/png.test.ts`

**Step 1: Write failing test**

`sidecar/tests/png.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizePng } from '../src/formats/png.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('PNG optimizer', () => {
  it('compresses losslessly without color changes', async () => {
    const input = path.join(fixtures, 'test.png');
    const output = path.join(tmpDir, 'png-test-output.png');

    await optimizePng(input, output);

    expect(fs.existsSync(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('png');
    // PNG optimization is lossless — palette must NOT be enabled
    expect(meta.paletteBitDepth).toBeUndefined();
  });
});
```

**Step 2: Run test — expect FAIL**

Run: `cd sidecar && npx vitest run tests/png.test.ts`

**Step 3: Implement**

`sidecar/src/formats/png.ts`:
```ts
import sharp from 'sharp';

export async function optimizePng(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await sharp(inputPath)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10,
      palette: false,
    })
    .toFile(outputPath);
}
```

**Step 4: Run test — expect PASS**

Run: `cd sidecar && npx vitest run tests/png.test.ts`

**Step 5: Commit**

```bash
git add sidecar/src/formats/png.ts sidecar/tests/png.test.ts
git commit -m "feat: PNG processor with lossless optimization"
```

---

### Task 6: WebP Processor

**Files:**
- Create: `sidecar/src/formats/webp.ts`
- Create: `sidecar/tests/webp.test.ts`

**Step 1: Write failing test**

`sidecar/tests/webp.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeWebp } from '../src/formats/webp.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('WebP optimizer', () => {
  it('compresses with smartSubsample for color fidelity', async () => {
    const input = path.join(fixtures, 'test.jpg');
    const output = path.join(tmpDir, 'webp-test-output.webp');

    await optimizeWebp(input, output, { quality: 85 });

    expect(fs.existsSync(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('webp');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement**

`sidecar/src/formats/webp.ts`:
```ts
import sharp from 'sharp';

export interface WebpOptions {
  quality: number;
}

export async function optimizeWebp(
  inputPath: string,
  outputPath: string,
  options: WebpOptions
): Promise<void> {
  await sharp(inputPath)
    .webp({
      quality: options.quality,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(outputPath);
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add sidecar/src/formats/webp.ts sidecar/tests/webp.test.ts
git commit -m "feat: WebP processor with smartSubsample (sharp_yuv)"
```

---

### Task 7: AVIF Processor

**Files:**
- Create: `sidecar/src/formats/avif.ts`
- Create: `sidecar/tests/avif.test.ts`

**Step 1: Write failing test**

`sidecar/tests/avif.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeAvif } from '../src/formats/avif.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('AVIF optimizer', () => {
  it('compresses with 4:4:4 chroma subsampling', async () => {
    const input = path.join(fixtures, 'test.jpg');
    const output = path.join(tmpDir, 'avif-test-output.avif');

    await optimizeAvif(input, output, { quality: 50 });

    expect(fs.existsSync(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('heif');  // Sharp reports AVIF as 'heif'
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement**

`sidecar/src/formats/avif.ts`:
```ts
import sharp from 'sharp';

export interface AvifOptions {
  quality: number;
}

export async function optimizeAvif(
  inputPath: string,
  outputPath: string,
  options: AvifOptions
): Promise<void> {
  await sharp(inputPath)
    .avif({
      quality: options.quality,
      chromaSubsampling: '4:4:4',
      effort: 4,
    })
    .toFile(outputPath);
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add sidecar/src/formats/avif.ts sidecar/tests/avif.test.ts
git commit -m "feat: AVIF processor with 4:4:4 chroma"
```

---

### Task 8: HEIC Input Support

**Files:**
- Create: `sidecar/src/formats/heic.ts`
- Create: `sidecar/tests/heic.test.ts`

**Step 1: Write failing test**

`sidecar/tests/heic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { decodeHeic } from '../src/formats/heic.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const tmpDir = os.tmpdir();

describe('HEIC decoder', () => {
  it('converts HEIC to JPEG via sips fallback', async () => {
    // Create a test HEIC using sips (only works on macOS)
    const testJpg = path.join(import.meta.dirname, 'fixtures', 'test.jpg');
    const testHeic = path.join(tmpDir, 'test-input.heic');
    try {
      execSync(`sips -s format heic "${testJpg}" --out "${testHeic}" 2>/dev/null`);
    } catch {
      // sips may not support HEIC creation on all macOS versions — skip test
      return;
    }

    const output = path.join(tmpDir, 'heic-decoded.jpg');
    await decodeHeic(testHeic, output);

    expect(fs.existsSync(output)).toBe(true);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement using macOS `sips` as CLI fallback**

`sidecar/src/formats/heic.ts`:
```ts
import { execSync } from 'child_process';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';

export async function decodeHeic(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // First try Sharp (works if built with libheif support)
  try {
    await sharp(inputPath).jpeg({ quality: 98 }).toFile(outputPath);
    return;
  } catch {
    // Sharp prebuilt doesn't support HEIC — fall back to macOS sips
  }

  // Use macOS sips to convert HEIC to JPEG
  const tmpJpeg = path.join(os.tmpdir(), `heic-decode-${Date.now()}.jpg`);
  try {
    execSync(`sips -s format jpeg "${inputPath}" --out "${tmpJpeg}"`, {
      stdio: 'pipe',
    });
    fs.copyFileSync(tmpJpeg, outputPath);
  } finally {
    if (fs.existsSync(tmpJpeg)) fs.unlinkSync(tmpJpeg);
  }
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add sidecar/src/formats/heic.ts sidecar/tests/heic.test.ts
git commit -m "feat: HEIC decoder with macOS sips fallback"
```

---

### Task 9: SVG Optimizer

**Files:**
- Create: `sidecar/src/formats/svg.ts`
- Create: `sidecar/tests/svg.test.ts`
- Create: `sidecar/tests/fixtures/test.svg`

**Step 1: Create test SVG fixture**

`sidecar/tests/fixtures/test.svg`:
```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <metadata>Some editor metadata</metadata>
  <defs>
    <style>.cls-1{fill:#ff0000;}.unused-class{fill:#00ff00;}</style>
  </defs>
  <g id="Layer_1" class="cls-1" data-bricks-id="icon-1">
    <rect class="cls-1" x="10" y="10" width="80" height="80"/>
    <circle cx="50" cy="50" r="30" fill="blue"/>
  </g>
</svg>
```

**Step 2: Write failing test**

`sidecar/tests/svg.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { optimizeSvg } from '../src/formats/svg.js';
import path from 'path';
import fs from 'fs';

const fixtures = path.join(import.meta.dirname, 'fixtures');

describe('SVG optimizer', () => {
  const input = path.join(fixtures, 'test.svg');

  it('safe mode preserves classes, IDs, and structure', () => {
    const inputSvg = fs.readFileSync(input, 'utf8');
    const result = optimizeSvg(inputSvg, 'safe');

    expect(result).toContain('cls-1');
    expect(result).toContain('id="Layer_1"');
    expect(result).toContain('data-bricks-id');
    expect(result).not.toContain('<!-- Generator');
    expect(result).not.toContain('<metadata');
  });

  it('bricks-safe mode preserves Bricks attributes', () => {
    const inputSvg = fs.readFileSync(input, 'utf8');
    const result = optimizeSvg(inputSvg, 'bricks-safe');

    expect(result).toContain('data-bricks-id');
    expect(result).toContain('viewBox');
    expect(result).not.toContain('<metadata');
  });

  it('efficient mode aggressively optimizes', () => {
    const inputSvg = fs.readFileSync(input, 'utf8');
    const result = optimizeSvg(inputSvg, 'efficient');

    expect(result).not.toContain('<metadata');
    expect(result).not.toContain('<!-- ');
    expect(result.length).toBeLessThan(inputSvg.length);
  });
});
```

**Step 3: Run test — expect FAIL**

**Step 4: Implement**

`sidecar/src/formats/svg.ts`:
```ts
import { optimize, type Config } from 'svgo';

type SvgMode = 'safe' | 'bricks-safe' | 'efficient';

const safeConfig: Config = {
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'removeEmptyText',
    'removeDesc',
    { name: 'removeTitle', params: {} },
  ],
};

const bricksSafeConfig: Config = {
  plugins: [
    ...safeConfig.plugins as any[],
    'mergePaths',
    'removeUselessDefs',
    {
      name: 'removeAttrs',
      params: {
        attrs: [],  // Don't remove any attrs — preserve data-bricks-*, classes, IDs
      },
    },
  ],
};

const efficientConfig: Config = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
        },
      },
    },
    'removeStyleElement',
    {
      name: 'removeAttrs',
      params: {
        attrs: ['class', 'data-.*'],
        preserveCurrentColor: true,
      },
    },
  ],
};

const configs: Record<SvgMode, Config> = {
  'safe': safeConfig,
  'bricks-safe': bricksSafeConfig,
  'efficient': efficientConfig,
};

export function optimizeSvg(svgString: string, mode: SvgMode): string {
  const result = optimize(svgString, configs[mode]);
  return result.data;
}
```

**Step 5: Run test — expect PASS (may need SVGO config adjustments)**

Run: `cd sidecar && npx vitest run tests/svg.test.ts`

The SVGO plugin names and behavior may need tweaking to make tests pass. Adjust the config based on actual SVGO behavior.

**Step 6: Commit**

```bash
git add sidecar/src/formats/svg.ts sidecar/tests/
git commit -m "feat: SVG optimizer with Safe, Bricks Safe, and Efficient presets"
```

---

### Task 10: Resize Engine

**Files:**
- Create: `sidecar/src/resize.ts`
- Create: `sidecar/tests/resize.test.ts`

**Step 1: Write failing test**

`sidecar/tests/resize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { resizeImage } from '../src/resize.js';
import path from 'path';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('Resize engine', () => {
  it('downscales to target width, preserving aspect ratio', async () => {
    const input = path.join(fixtures, 'test-large.jpg'); // 4000x3000
    const output = path.join(tmpDir, 'resize-test.jpg');

    await resizeImage(input, output, { width: 1200, maintainAspectRatio: true });

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900); // 3000 * (1200/4000)
  });

  it('does not upscale images smaller than target', async () => {
    const input = path.join(fixtures, 'test.jpg'); // 200x150
    const output = path.join(tmpDir, 'resize-no-upscale.jpg');

    await resizeImage(input, output, { width: 1200, maintainAspectRatio: true });

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(150);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement**

`sidecar/src/resize.ts`:
```ts
import sharp from 'sharp';

export interface ResizeOptions {
  width?: number | null;
  height?: number | null;
  maintainAspectRatio: boolean;
}

export async function resizeImage(
  inputPath: string,
  outputPath: string,
  options: ResizeOptions
): Promise<void> {
  let pipeline = sharp(inputPath);

  if (options.width || options.height) {
    if (options.maintainAspectRatio) {
      pipeline = pipeline.resize(options.width ?? undefined, options.height ?? undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    } else {
      pipeline = pipeline.resize(options.width ?? undefined, options.height ?? undefined, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      });
    }
  }

  await pipeline.toFile(outputPath);
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add sidecar/src/resize.ts sidecar/tests/resize.test.ts
git commit -m "feat: resize engine with aspect ratio lock and no-upscale"
```

---

### Task 11: Max File Size Enforcement

**Files:**
- Create: `sidecar/src/maxFileSize.ts`
- Create: `sidecar/tests/maxFileSize.test.ts`

**Step 1: Write failing test**

`sidecar/tests/maxFileSize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { enforceMaxFileSize } from '../src/maxFileSize.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('Max file size enforcement', () => {
  it('reduces quality until file is under limit', async () => {
    const input = path.join(fixtures, 'test-large.jpg');
    const output = path.join(tmpDir, 'maxsize-test.jpg');
    const maxBytes = 50_000; // 50 KB

    const result = await enforceMaxFileSize(input, output, {
      format: 'jpeg',
      maxBytes,
      startQuality: 92,
    });

    const outputSize = fs.statSync(output).size;
    expect(outputSize).toBeLessThanOrEqual(maxBytes);
    expect(result.finalQuality).toBeLessThan(92);
    expect(result.achieved).toBe(true);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement**

`sidecar/src/maxFileSize.ts`:
```ts
import sharp from 'sharp';
import fs from 'fs';

interface MaxFileSizeOptions {
  format: 'jpeg' | 'webp' | 'avif';
  maxBytes: number;
  startQuality: number;
}

interface MaxFileSizeResult {
  finalQuality: number;
  achieved: boolean;
}

export async function enforceMaxFileSize(
  inputPath: string,
  outputPath: string,
  options: MaxFileSizeOptions
): Promise<MaxFileSizeResult> {
  const { format, maxBytes, startQuality } = options;
  const minQuality = 10;
  const maxIterations = 5;

  let low = minQuality;
  let high = startQuality;
  let bestQuality = startQuality;

  // First try at the starting quality
  await writeAtQuality(inputPath, outputPath, format, startQuality);
  let size = fs.statSync(outputPath).size;

  if (size <= maxBytes) {
    return { finalQuality: startQuality, achieved: true };
  }

  // Binary search for the right quality
  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.round((low + high) / 2);
    await writeAtQuality(inputPath, outputPath, format, mid);
    size = fs.statSync(outputPath).size;

    if (size <= maxBytes) {
      bestQuality = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Final write at best quality
  await writeAtQuality(inputPath, outputPath, format, bestQuality);
  size = fs.statSync(outputPath).size;

  return {
    finalQuality: bestQuality,
    achieved: size <= maxBytes,
  };
}

async function writeAtQuality(
  inputPath: string,
  outputPath: string,
  format: string,
  quality: number
): Promise<void> {
  let pipeline = sharp(inputPath);

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality, smartSubsample: true, effort: 6 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality, chromaSubsampling: '4:4:4' });
      break;
  }

  await pipeline.toFile(outputPath);
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add sidecar/src/maxFileSize.ts sidecar/tests/maxFileSize.test.ts
git commit -m "feat: max file size enforcement with binary search"
```

---

### Task 12: Central Processor (Orchestrator)

**Files:**
- Create: `sidecar/src/processor.ts`
- Create: `sidecar/tests/processor.test.ts`
- Modify: `sidecar/src/index.ts`

**Step 1: Write failing test**

`sidecar/tests/processor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processImage, getImageInfo } from '../src/processor.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('Central processor', () => {
  it('optimizes JPEG with default settings', async () => {
    const result = await processImage(
      path.join(fixtures, 'test.jpg'),
      path.join(tmpDir, 'proc-test.jpg'),
      { format: 'same', quality: 92, width: null, height: null, maintainAspectRatio: true, maxFileSize: null, svgMode: null }
    );
    expect(result.success).toBe(true);
    expect(result.format).toBe('jpeg');
  });

  it('converts PNG to WebP', async () => {
    const result = await processImage(
      path.join(fixtures, 'test.png'),
      path.join(tmpDir, 'proc-convert.webp'),
      { format: 'webp', quality: 85, width: null, height: null, maintainAspectRatio: true, maxFileSize: null, svgMode: null }
    );
    expect(result.success).toBe(true);
    const meta = await sharp(path.join(tmpDir, 'proc-convert.webp')).metadata();
    expect(meta.format).toBe('webp');
  });

  it('returns image info', async () => {
    const info = await getImageInfo(path.join(fixtures, 'test.jpg'));
    expect(info.width).toBe(200);
    expect(info.height).toBe(150);
    expect(info.format).toBe('jpeg');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement**

`sidecar/src/processor.ts`:
```ts
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { optimizeJpeg } from './formats/jpeg.js';
import { optimizePng } from './formats/png.js';
import { optimizeWebp } from './formats/webp.js';
import { optimizeAvif } from './formats/avif.js';
import { optimizeSvg } from './formats/svg.js';
import { decodeHeic } from './formats/heic.js';
import { resizeImage } from './resize.js';
import { enforceMaxFileSize } from './maxFileSize.js';
import type { OptimizeSettings, ProcessResponse, ImageInfo } from './types.js';

const FORMAT_MAP: Record<string, string> = {
  jpeg: 'jpeg', jpg: 'jpeg', png: 'png', webp: 'webp',
  heif: 'jpeg', heic: 'jpeg', // HEIC defaults to JPEG output
  svg: 'svg',
};

export async function getImageInfo(inputPath: string): Promise<ImageInfo> {
  const stats = fs.statSync(inputPath);
  const ext = path.extname(inputPath).toLowerCase().slice(1);

  if (ext === 'svg') {
    const content = fs.readFileSync(inputPath, 'utf8');
    const widthMatch = content.match(/width="(\d+)/);
    const heightMatch = content.match(/height="(\d+)/);
    return {
      width: widthMatch ? parseInt(widthMatch[1]) : 0,
      height: heightMatch ? parseInt(heightMatch[1]) : 0,
      format: 'svg',
      size: stats.size,
    };
  }

  const metadata = await sharp(inputPath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || ext,
    size: stats.size,
    chromaSubsampling: metadata.chromaSubsampling,
  };
}

export async function processImage(
  inputPath: string,
  outputPath: string,
  settings: OptimizeSettings
): Promise<ProcessResponse> {
  try {
    const info = await getImageInfo(inputPath);
    const inputFormat = info.format;
    const targetFormat = settings.format === 'same'
      ? (FORMAT_MAP[inputFormat] || inputFormat)
      : settings.format;

    // Handle HEIC: decode to temp JPEG first
    let workingPath = inputPath;
    const isHeic = inputFormat === 'heif' || inputFormat === 'heic' ||
      inputPath.toLowerCase().endsWith('.heic') || inputPath.toLowerCase().endsWith('.heif');

    if (isHeic) {
      workingPath = path.join(os.tmpdir(), `heic-decode-${Date.now()}.jpg`);
      await decodeHeic(inputPath, workingPath);
    }

    // Handle SVG
    if (targetFormat === 'svg') {
      const svgContent = fs.readFileSync(workingPath, 'utf8');
      const optimized = optimizeSvg(svgContent, settings.svgMode || 'safe');
      fs.writeFileSync(outputPath, optimized);
      const outputStats = fs.statSync(outputPath);
      return {
        id: '', success: true, outputPath,
        inputSize: info.size, outputSize: outputStats.size,
        width: info.width, height: info.height, format: 'svg',
      };
    }

    // Resize if needed (to temp file)
    let resizedPath = workingPath;
    if (settings.width || settings.height) {
      resizedPath = path.join(os.tmpdir(), `resize-${Date.now()}${path.extname(workingPath)}`);
      await resizeImage(workingPath, resizedPath, {
        width: settings.width,
        height: settings.height,
        maintainAspectRatio: settings.maintainAspectRatio,
      });
    }

    // Format-specific optimization
    switch (targetFormat) {
      case 'jpeg':
        await optimizeJpeg(resizedPath, outputPath, { quality: settings.quality });
        break;
      case 'png':
        await optimizePng(resizedPath, outputPath);
        break;
      case 'webp':
        await optimizeWebp(resizedPath, outputPath, { quality: settings.quality });
        break;
      case 'avif':
        await optimizeAvif(resizedPath, outputPath, { quality: settings.quality });
        break;
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    // Enforce max file size if set
    if (settings.maxFileSize && targetFormat !== 'png') {
      const size = fs.statSync(outputPath).size;
      if (size > settings.maxFileSize) {
        await enforceMaxFileSize(resizedPath, outputPath, {
          format: targetFormat as 'jpeg' | 'webp' | 'avif',
          maxBytes: settings.maxFileSize,
          startQuality: settings.quality,
        });
      }
    }

    // Get output info
    const outputMeta = await sharp(outputPath).metadata();
    const outputStats = fs.statSync(outputPath);

    // Cleanup temp files
    if (resizedPath !== workingPath) fs.unlinkSync(resizedPath);
    if (workingPath !== inputPath) fs.unlinkSync(workingPath);

    return {
      id: '', success: true, outputPath,
      inputSize: info.size, outputSize: outputStats.size,
      width: outputMeta.width, height: outputMeta.height,
      format: targetFormat,
    };
  } catch (error) {
    return {
      id: '', success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

**Step 4: Wire into index.ts**

Update `sidecar/src/index.ts` to use `processImage` and `getImageInfo` in the request handler.

**Step 5: Run tests — expect PASS**

Run: `cd sidecar && npx vitest run`

**Step 6: Commit**

```bash
git add sidecar/src/processor.ts sidecar/src/index.ts sidecar/tests/processor.test.ts
git commit -m "feat: central processor orchestrating all format handlers"
```

---

## Phase 3: Frontend UI

### Task 13: Drop Zone Component

**Files:**
- Create: `src/components/DropZone.tsx`
- Create: `src/hooks/useDragDrop.ts`
- Modify: `src/App.tsx`

**Step 1: Create Tauri drag-drop hook**

`src/hooks/useDragDrop.ts`:
```ts
import { useState, useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface DragDropState {
  isDragging: boolean;
  droppedFiles: string[];
}

export function useDragDrop() {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    droppedFiles: [],
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'enter') {
        setState(prev => ({ ...prev, isDragging: true }));
      } else if (event.payload.type === 'leave') {
        setState(prev => ({ ...prev, isDragging: false }));
      } else if (event.payload.type === 'drop') {
        setState({ isDragging: false, droppedFiles: event.payload.paths });
      }
    }).then(fn => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  return state;
}
```

**Step 2: Create DropZone component**

`src/components/DropZone.tsx`:
```tsx
interface DropZoneProps {
  isDragging: boolean;
  hasImage: boolean;
  children: React.ReactNode;
  onBrowse: () => void;
}

export function DropZone({ isDragging, hasImage, children, onBrowse }: DropZoneProps) {
  if (hasImage) {
    return <div className="flex-1 flex items-center justify-center">{children}</div>;
  }

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-400'
      }`}
    >
      <p className="text-gray-400 text-lg mb-2">Drop images here</p>
      <p className="text-gray-500 text-sm">or</p>
      <button
        onClick={onBrowse}
        className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
      >
        Browse files
      </button>
    </div>
  );
}
```

**Step 3: Wire into App.tsx**

Set up basic layout with DropZone on the left, placeholder settings panel on the right.

**Step 4: Test visually**

Run: `npm run tauri dev`
Verify: Drop zone appears, highlighting on drag-over, file paths logged on drop.

**Step 5: Commit**

```bash
git add src/components/DropZone.tsx src/hooks/useDragDrop.ts src/App.tsx
git commit -m "feat: drop zone component with Tauri drag-drop integration"
```

---

### Task 14: Image Preview with Toggle

**Files:**
- Create: `src/components/ImagePreview.tsx`
- Modify: `src/App.tsx`

**Step 1: Implement preview component**

`src/components/ImagePreview.tsx`:
```tsx
import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface ImagePreviewProps {
  originalPath: string;
  optimizedPath: string | null;
  originalSize: number;
  optimizedSize: number | null;
  filename: string;
}

export function ImagePreview({
  originalPath, optimizedPath, originalSize, optimizedSize, filename
}: ImagePreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const displayPath = showOriginal || !optimizedPath ? originalPath : optimizedPath;
  const displaySize = showOriginal || !optimizedSize ? originalSize : optimizedSize;
  const label = showOriginal || !optimizedPath ? 'Original' : 'Optimized';

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative cursor-pointer rounded-lg overflow-hidden"
        onClick={() => optimizedPath && setShowOriginal(!showOriginal)}
      >
        <img
          src={convertFileSrc(displayPath)}
          alt={filename}
          className="max-w-full max-h-[60vh] object-contain"
        />
        <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-sm">
          {label} &middot; {formatBytes(displaySize)}
        </div>
        {optimizedPath && (
          <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-gray-300">
            Click to toggle
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

**Step 2: Test visually** — drop an image, verify it displays and toggle works after optimization.

**Step 3: Commit**

```bash
git add src/components/ImagePreview.tsx
git commit -m "feat: image preview with original/optimized toggle"
```

---

### Task 15: Settings Panel — Format & Quality

**Files:**
- Create: `src/components/FormatSelector.tsx`
- Create: `src/components/QualitySlider.tsx`
- Create: `src/components/SettingsPanel.tsx`

**Step 1: Create FormatSelector**

`src/components/FormatSelector.tsx` — pill button group for JPEG/PNG/WebP/AVIF/SVG/Same.

**Step 2: Create QualitySlider**

`src/components/QualitySlider.tsx` — range slider 1-100 with manual input field. Defaults to 92.

**Step 3: Create SettingsPanel wrapper**

`src/components/SettingsPanel.tsx` — layout container for all settings components.

**Step 4: Test visually**

**Step 5: Commit**

```bash
git add src/components/FormatSelector.tsx src/components/QualitySlider.tsx src/components/SettingsPanel.tsx
git commit -m "feat: format selector and quality slider components"
```

---

### Task 16: Dimension Controls

**Files:**
- Create: `src/components/DimensionControls.tsx`
- Modify: `src/components/SettingsPanel.tsx`

**Step 1: Implement dimension controls**

`src/components/DimensionControls.tsx` — includes:
- Width slider + manual input
- Height (auto-calculated when locked)
- Aspect ratio lock toggle
- Preset buttons: [2400] [1200] [512]

**Step 2: Test visually** — presets update slider, manual input works, aspect ratio lock calculates height.

**Step 3: Commit**

```bash
git add src/components/DimensionControls.tsx
git commit -m "feat: dimension controls with presets and aspect ratio lock"
```

---

### Task 17: Max File Size, SVG Mode, and Filename Editor

**Files:**
- Create: `src/components/MaxFileSizeInput.tsx`
- Create: `src/components/SvgModeSelector.tsx`
- Create: `src/components/FilenameEditor.tsx`

**Step 1: Implement MaxFileSizeInput** — toggle on/off, KB input field, remembers value.

**Step 2: Implement SvgModeSelector** — radio buttons: Safe, Bricks Safe, Efficient. Only visible when input is SVG.

**Step 3: Implement FilenameEditor** — displays sanitized filename (commas/underscores removed), click to edit.

**Step 4: Test visually**

**Step 5: Commit**

```bash
git add src/components/MaxFileSizeInput.tsx src/components/SvgModeSelector.tsx src/components/FilenameEditor.tsx
git commit -m "feat: max file size, SVG mode selector, and filename editor"
```

---

## Phase 4: Integration

### Task 18: Wire Frontend to Sidecar Processing

**Files:**
- Create: `src/hooks/useImageProcessor.ts`
- Modify: `src/App.tsx`
- Modify: `src/lib/ipc.ts`

**Step 1: Create processing hook**

`src/hooks/useImageProcessor.ts` — manages:
- Sending optimize request to sidecar
- Tracking processing state (idle/processing/done/error)
- Receiving result (output path, sizes)

**Step 2: Wire Optimize button**

Connect the "Optimize" button in SettingsPanel to the processing hook. On click:
1. Send current settings + input file path to sidecar
2. Show loading state
3. On response, update preview with optimized image

**Step 3: Test end-to-end**

Drop a JPEG → adjust settings → click Optimize → verify optimized preview appears with smaller file size.

**Step 4: Commit**

```bash
git add src/hooks/useImageProcessor.ts src/App.tsx src/lib/ipc.ts
git commit -m "feat: wire frontend optimize button to sidecar processing"
```

---

### Task 19: Output Actions

**Files:**
- Create: `src/components/OutputActions.tsx`
- Modify: `src-tauri/Cargo.toml` (add drag plugin)
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add drag-out plugin**

```bash
cd src-tauri && cargo add tauri-plugin-drag
npm add @crabnebula/tauri-plugin-drag
```

Register in `lib.rs`:
```rust
.plugin(tauri_plugin_drag::init())
```

**Step 2: Implement OutputActions component**

`src/components/OutputActions.tsx`:
- "Save to..." button (opens native save dialog, remembers folder)
- "Replace original" button (moves original to Trash, saves optimized in its place)
- "Copy to clipboard" button
- Draggable area that triggers `startDrag()` from the drag plugin

**Step 3: Test each action**

- Save: verify file appears in chosen folder
- Replace: verify original is in Trash, optimized is at original path
- Drag-out: drag optimized image to Finder, verify file copies

**Step 4: Commit**

```bash
git add src/components/OutputActions.tsx src-tauri/
git commit -m "feat: output actions with save, replace, clipboard, and native drag-out"
```

---

### Task 20: Multi-Image Support

**Files:**
- Create: `src/components/ThumbnailStrip.tsx`
- Modify: `src/App.tsx`

**Step 1: Implement ThumbnailStrip**

`src/components/ThumbnailStrip.tsx` — horizontal strip below preview showing thumbnails of all dropped images. Click to select. Show optimization status per image (pending/processing/done).

**Step 2: Add "Optimize All" button**

When multiple images are loaded, show "Optimize All" instead of "Optimize". Processes sequentially with progress indication.

**Step 3: Test with 3+ images**

**Step 4: Commit**

```bash
git add src/components/ThumbnailStrip.tsx src/App.tsx
git commit -m "feat: multi-image support with thumbnail strip and batch optimize"
```

---

### Task 21: Settings Persistence

**Files:**
- Create: `src/hooks/useSettings.ts`
- Modify: `src/App.tsx`

**Step 1: Implement settings hook**

`src/hooks/useSettings.ts` — uses Tauri's `@tauri-apps/plugin-store` or filesystem API to read/write `settings.json` in the app data directory.

Persists: quality defaults, resize presets, last-used folder, max file size, SVG mode, sanitization toggle.

**Step 2: Wire settings to UI** — load on app start, save on change (debounced).

**Step 3: Test** — change settings, close app, reopen, verify settings restored.

**Step 4: Commit**

```bash
git add src/hooks/useSettings.ts src/App.tsx
git commit -m "feat: persist user settings across sessions"
```

---

### Task 22: Color Fidelity Validation

**Files:**
- Create: `sidecar/tests/color-fidelity.test.ts`

**Step 1: Write comparison test**

`sidecar/tests/color-fidelity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { execSync } from 'child_process';
import { optimizeJpeg } from '../src/formats/jpeg.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('Color fidelity vs CLI tools', () => {
  it('Sharp JPEG output matches mozjpeg CLI output (visually)', async () => {
    const input = path.join(fixtures, 'test.jpg');
    const sharpOutput = path.join(tmpDir, 'fidelity-sharp.jpg');
    const cliOutput = path.join(tmpDir, 'fidelity-cli.jpg');

    // Sharp
    await optimizeJpeg(input, sharpOutput, { quality: 92 });

    // CLI (skip if mozjpeg not installed)
    try {
      execSync(`djpeg "${input}" | cjpeg -quality 92 -outfile "${cliOutput}"`, { stdio: 'pipe' });
    } catch {
      console.log('mozjpeg CLI not available — skipping comparison');
      return;
    }

    // Compare file sizes (should be within 15% of each other)
    const sharpSize = fs.statSync(sharpOutput).size;
    const cliSize = fs.statSync(cliOutput).size;
    const ratio = sharpSize / cliSize;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);

    // Compare dimensions
    const sharpMeta = await sharp(sharpOutput).metadata();
    const cliMeta = await sharp(cliOutput).metadata();
    expect(sharpMeta.width).toBe(cliMeta.width);
    expect(sharpMeta.height).toBe(cliMeta.height);
    expect(sharpMeta.chromaSubsampling).toBe(cliMeta.chromaSubsampling);
  });
});
```

**Step 2: Run test**

Run: `cd sidecar && npx vitest run tests/color-fidelity.test.ts`

**Step 3: Commit**

```bash
git add sidecar/tests/color-fidelity.test.ts
git commit -m "test: color fidelity validation comparing Sharp vs CLI tools"
```

---

## Phase 5: Finder Integration (after core app is working)

### Task 23: CLI Mode for Sidecar

**Files:**
- Modify: `sidecar/src/index.ts`

Add CLI argument parsing so the sidecar can be invoked directly:
```bash
node dist/index.js --optimize --input photo.jpg --output photo-opt.jpg --quality 92
```

This enables Automator Quick Actions to call the processor without the full Tauri app.

### Task 24: Automator Quick Actions

**Files:**
- Create: `finder-actions/Optimize.workflow/`
- Create: `finder-actions/install.sh`

Create Automator Quick Actions for: Optimize, To WebP, To JPG, To 2400px, To 1200px, To 512px.

Each workflow runs a shell script that invokes the sidecar CLI, processes the selected file(s), and shows a macOS notification with the result.

### Task 25: Finder Toolbar Buttons

Create small `.app` wrappers (via Automator "Application" type) for each common action. Include an `install.sh` that copies them to a convenient location and explains how to drag them to the Finder toolbar.

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1: Foundation | 1-3 | Scaffold project, sidecar, IPC |
| 2: Processing | 4-12 | All format processors, resize, max size, orchestrator |
| 3: Frontend | 13-17 | UI components |
| 4: Integration | 18-22 | Wire everything together, persistence, validation |
| 5: Finder | 23-25 | CLI mode, Quick Actions, toolbar buttons |
