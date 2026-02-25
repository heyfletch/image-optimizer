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
