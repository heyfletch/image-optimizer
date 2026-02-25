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
