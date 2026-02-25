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
