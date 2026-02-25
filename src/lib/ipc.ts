import { Command } from '@tauri-apps/plugin-shell';
import { resolveResource } from '@tauri-apps/api/path';
import type { ProcessRequest, ProcessResponse } from '../../sidecar/src/types';

let sidecarProcess: Awaited<ReturnType<Command<string>['spawn']>> | null = null;
const responseHandlers = new Map<string, (response: ProcessResponse) => void>();
let requestId = 0;

export async function startSidecar(): Promise<void> {
  const scriptPath = import.meta.env.DEV
    ? '../sidecar/dist/index.js'
    : await resolveResource('sidecar/dist/index.js');
  const command = Command.create('node', [scriptPath]);

  command.stdout.on('data', (line: string) => {
    try {
      const data = JSON.parse(line);
      if (data.ready) {
        console.log('Sidecar ready');
        return;
      }
      const handler = responseHandlers.get(data.id);
      if (handler) {
        handler(data);
        responseHandlers.delete(data.id);
      }
    } catch {}
  });

  command.stderr.on('data', (line: string) => {
    console.error('Sidecar error:', line);
  });

  sidecarProcess = await command.spawn();
}

export function sendRequest(request: Omit<ProcessRequest, 'id'>): Promise<ProcessResponse> {
  const id = String(++requestId);
  return new Promise((resolve, reject) => {
    if (!sidecarProcess) {
      reject(new Error('Sidecar not running'));
      return;
    }
    responseHandlers.set(id, resolve);
    sidecarProcess.write(JSON.stringify({ ...request, id }) + '\n');
  });
}

export async function stopSidecar(): Promise<void> {
  await sidecarProcess?.kill();
  sidecarProcess = null;
}
