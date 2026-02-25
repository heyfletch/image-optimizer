import { startIPC } from './ipc.js';
import { processImage, getImageInfo } from './processor.js';
import type { ProcessRequest, ProcessResponse } from './types.js';

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

startIPC(handleRequest);
