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
  it('Sharp JPEG preserves chroma subsampling', async () => {
    const input = path.join(fixtures, 'test-noisy.jpg');
    const output = path.join(tmpDir, 'fidelity-sharp.jpg');

    const inputMeta = await sharp(input).metadata();
    await optimizeJpeg(input, output, { quality: 92 });
    const outputMeta = await sharp(output).metadata();

    // Verify dimensions preserved
    expect(outputMeta.width).toBe(inputMeta.width);
    expect(outputMeta.height).toBe(inputMeta.height);

    // Verify chroma subsampling preserved
    expect(outputMeta.chromaSubsampling).toBe(inputMeta.chromaSubsampling);

    // Verify mozjpeg produces smaller output
    expect(fs.statSync(output).size).toBeLessThan(fs.statSync(input).size);
  });

  it('Sharp JPEG output is comparable to CLI mozjpeg (if installed)', async () => {
    const input = path.join(fixtures, 'test-noisy.jpg');
    const sharpOutput = path.join(tmpDir, 'fidelity-sharp-cmp.jpg');
    const cliOutput = path.join(tmpDir, 'fidelity-cli-cmp.jpg');

    await optimizeJpeg(input, sharpOutput, { quality: 92 });

    // Try system cjpeg — skip if not available
    try {
      execSync(`which cjpeg`, { stdio: 'pipe' });
      execSync(`djpeg "${input}" | cjpeg -quality 92 -outfile "${cliOutput}"`, { stdio: 'pipe' });
    } catch {
      console.log('cjpeg/djpeg not available — skipping CLI comparison');
      return;
    }

    const sharpSize = fs.statSync(sharpOutput).size;
    const cliSize = fs.statSync(cliOutput).size;

    // Both should produce compressed output
    expect(sharpSize).toBeGreaterThan(0);
    expect(cliSize).toBeGreaterThan(0);

    // Dimensions should match
    const sharpMeta = await sharp(sharpOutput).metadata();
    const cliMeta = await sharp(cliOutput).metadata();
    expect(sharpMeta.width).toBe(cliMeta.width);
    expect(sharpMeta.height).toBe(cliMeta.height);
  });
});
