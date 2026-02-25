export interface ProcessRequest {
  id: string;
  action: 'optimize' | 'info' | 'ping';
  inputPath: string;
  outputPath: string;
  settings: OptimizeSettings;
}

export interface OptimizeSettings {
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'svg' | 'same';
  quality: number;          // 1-100, default 92
  width: number | null;     // null = no resize
  height: number | null;
  maintainAspectRatio: boolean;
  maxFileSize: number | null;  // bytes, null = no limit
  svgMode: 'safe' | 'standard' | null;
}

export interface ProcessResponse {
  id: string;
  success: boolean;
  outputPath?: string;
  inputSize?: number;
  outputSize?: number;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  chromaSubsampling?: string;
}
