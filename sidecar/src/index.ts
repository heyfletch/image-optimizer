import { startIPC } from './ipc.js';
import type { ProcessRequest, ProcessResponse } from './types.js';

async function handleRequest(request: ProcessRequest): Promise<ProcessResponse> {
  if (request.action === 'ping') {
    return { id: request.id, success: true };
  }

  // TODO: implement optimize and info actions
  return { id: request.id, success: false, error: 'Not implemented' };
}

startIPC(handleRequest);
