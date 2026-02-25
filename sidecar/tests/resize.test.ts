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
