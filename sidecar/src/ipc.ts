import * as readline from 'readline';
import type { ProcessRequest, ProcessResponse } from './types.js';

type RequestHandler = (request: ProcessRequest) => Promise<ProcessResponse>;

export function startIPC(handler: RequestHandler): void {
  const rl = readline.createInterface({ input: process.stdin });

  rl.on('line', async (line) => {
    try {
      const request: ProcessRequest = JSON.parse(line);
      const response = await handler(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      const errorResponse: ProcessResponse = {
        id: 'unknown',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  // Signal ready
  process.stdout.write(JSON.stringify({ ready: true }) + '\n');
}
