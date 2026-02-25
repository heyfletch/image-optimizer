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
      { format: 'same', quality: 92, width: null, height: null, maintainAspectRatio: true, maxFileSize: null, svgMode: null, svgResponsive: false }
    );
    expect(result.success).toBe(true);
    expect(result.format).toBe('jpeg');
  });

  it('converts PNG to WebP', async () => {
    const result = await processImage(
      path.join(fixtures, 'test.png'),
      path.join(tmpDir, 'proc-convert.webp'),
      { format: 'webp', quality: 85, width: null, height: null, maintainAspectRatio: true, maxFileSize: null, svgMode: null, svgResponsive: false }
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
