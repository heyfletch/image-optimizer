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
