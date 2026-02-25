import { startIPC } from './ipc.js';
import { processImage, getImageInfo } from './processor.js';
import type { ProcessRequest, ProcessResponse, OptimizeSettings } from './types.js';
import path from 'path';

async function handleRequest(request: ProcessRequest): Promise<ProcessResponse> {
  if (request.action === 'ping') {
    return { id: request.id, success: true };
  }

  if (request.action === 'info') {
    try {
      const info = await getImageInfo(request.inputPath);
      return {
        id: request.id,
        success: true,
        width: info.width,
        height: info.height,
        format: info.format,
        inputSize: info.size,
      };
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (request.action === 'optimize') {
    const result = await processImage(request.inputPath, request.outputPath, request.settings);
    return { ...result, id: request.id };
  }

  return { id: request.id, success: false, error: `Unknown action: ${request.action}` };
}

// CLI mode: node dist/index.js --optimize --input photo.jpg --output photo-opt.jpg --quality 92
function parseCliArgs(): { mode: 'cli'; action: string; input: string; output: string; settings: OptimizeSettings } | null {
  const args = process.argv.slice(2);
  if (args.length === 0) return null;

  const hasFlag = (flag: string) => args.includes(flag);
  const getValue = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  if (hasFlag('--optimize') || hasFlag('--info')) {
    const action = hasFlag('--optimize') ? 'optimize' : 'info';
    const input = getValue('--input') || '';
    const output = getValue('--output') || input.replace(/\.[^.]+$/, '-optimized' + path.extname(input));
    const quality = Number(getValue('--quality') || '92');
    const format = (getValue('--format') || 'same') as OptimizeSettings['format'];
    const width = getValue('--width') ? Number(getValue('--width')) : null;

    return {
      mode: 'cli',
      action,
      input,
      output,
      settings: {
        format,
        quality,
        width,
        height: null,
        maintainAspectRatio: true,
        maxFileSize: null,
        svgMode: null,
      },
    };
  }

  return null;
}

const cli = parseCliArgs();

if (cli) {
  // CLI mode
  (async () => {
    if (cli.action === 'info') {
      const info = await getImageInfo(cli.input);
      console.log(JSON.stringify(info, null, 2));
    } else {
      const result = await processImage(cli.input, cli.output, cli.settings);
      if (result.success) {
        console.log(`Optimized: ${cli.input} → ${cli.output}`);
        console.log(`  Size: ${result.inputSize} → ${result.outputSize} bytes`);
        if (result.inputSize && result.outputSize) {
          const savings = Math.round((1 - result.outputSize / result.inputSize) * 100);
          console.log(`  Savings: ${savings}%`);
        }
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    }
  })();
} else {
  // IPC mode (launched by Tauri)
  startIPC(handleRequest);
}
