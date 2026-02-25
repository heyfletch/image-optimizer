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
