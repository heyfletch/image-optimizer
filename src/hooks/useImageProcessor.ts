import { useState, useCallback } from 'react';
import { sendRequest } from '../lib/ipc';
import type { OptimizeSettings } from '../../sidecar/src/types';

export interface ImageInfo {
  path: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

export interface ProcessResult {
  optimizedPath: string;
  optimizedSize: number;
  optimizedWidth: number;
  optimizedHeight: number;
  optimizedFormat: string;
}

type ProcessingState = 'idle' | 'processing' | 'done' | 'error';

const defaultSettings: OptimizeSettings = {
  format: 'same',
  quality: 92,
  width: null,
  height: null,
  maintainAspectRatio: true,
  maxFileSize: null,
  svgMode: null,
  svgResponsive: false,
};

export function useImageProcessor() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const getInfo = useCallback(async (filePath: string): Promise<ImageInfo | null> => {
    const response = await sendRequest({
      action: 'info',
      inputPath: filePath,
      outputPath: '',
      settings: defaultSettings,
    });

    if (!response.success) return null;

    return {
      path: filePath,
      filename: filePath.split('/').pop() || filePath,
      size: response.inputSize || 0,
      width: response.width || 0,
      height: response.height || 0,
      format: response.format || '',
    };
  }, []);

  const optimize = useCallback(async (
    inputPath: string,
    outputPath: string,
    settings: OptimizeSettings
  ): Promise<ProcessResult | null> => {
    setProcessingState('processing');
    setError(null);

    const response = await sendRequest({
      action: 'optimize',
      inputPath,
      outputPath,
      settings,
    });

    if (response.success) {
      setProcessingState('done');
      return {
        optimizedPath: response.outputPath || outputPath,
        optimizedSize: response.outputSize || 0,
        optimizedWidth: response.width || 0,
        optimizedHeight: response.height || 0,
        optimizedFormat: response.format || '',
      };
    } else {
      setProcessingState('error');
      setError(response.error || 'Unknown error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProcessingState('idle');
    setError(null);
  }, []);

  return { processingState, error, getInfo, optimize, reset };
}
