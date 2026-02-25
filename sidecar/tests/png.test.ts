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
