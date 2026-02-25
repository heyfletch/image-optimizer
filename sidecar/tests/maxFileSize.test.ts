import { describe, it, expect } from 'vitest';
import { enforceMaxFileSize } from '../src/maxFileSize.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const tmpDir = os.tmpdir();

describe('Max file size enforcement', () => {
  it('reduces quality until file is under limit', async () => {
    const input = path.join(fixtures, 'test-noisy.jpg');
    const output = path.join(tmpDir, 'maxsize-test.jpg');
    const maxBytes = 200_000; // 200 KB

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
