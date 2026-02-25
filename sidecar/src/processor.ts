import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { optimizeJpeg } from './formats/jpeg.js';
import { optimizePng } from './formats/png.js';
import { optimizeWebp } from './formats/webp.js';
import { optimizeAvif } from './formats/avif.js';
import { optimizeSvg } from './formats/svg.js';
import { decodeHeic } from './formats/heic.js';
import { resizeImage } from './resize.js';
import { enforceMaxFileSize } from './maxFileSize.js';
import type { OptimizeSettings, ProcessResponse, ImageInfo } from './types.js';

const FORMAT_MAP: Record<string, string> = {
  jpeg: 'jpeg', jpg: 'jpeg', png: 'png', webp: 'webp',
  heif: 'jpeg', heic: 'jpeg', // HEIC defaults to JPEG output
  svg: 'svg',
};

export async function getImageInfo(inputPath: string): Promise<ImageInfo> {
  const stats = fs.statSync(inputPath);
  const ext = path.extname(inputPath).toLowerCase().slice(1);

  if (ext === 'svg') {
    const content = fs.readFileSync(inputPath, 'utf8');
    const widthMatch = content.match(/width="(\d+)/);
    const heightMatch = content.match(/height="(\d+)/);
    return {
      width: widthMatch ? parseInt(widthMatch[1]) : 0,
      height: heightMatch ? parseInt(heightMatch[1]) : 0,
      format: 'svg',
      size: stats.size,
    };
  }

  const metadata = await sharp(inputPath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || ext,
    size: stats.size,
    chromaSubsampling: metadata.chromaSubsampling,
  };
}

export async function processImage(
  inputPath: string,
  outputPath: string,
  settings: OptimizeSettings
): Promise<ProcessResponse> {
  try {
    const info = await getImageInfo(inputPath);
    const inputFormat = info.format;
    const targetFormat = settings.format === 'same'
      ? (FORMAT_MAP[inputFormat] || inputFormat)
      : settings.format;

    // Handle HEIC: decode to temp JPEG first
    let workingPath = inputPath;
    const isHeic = inputFormat === 'heif' || inputFormat === 'heic' ||
      inputPath.toLowerCase().endsWith('.heic') || inputPath.toLowerCase().endsWith('.heif');

    if (isHeic) {
      workingPath = path.join(os.tmpdir(), `heic-decode-${Date.now()}.jpg`);
      await decodeHeic(inputPath, workingPath);
    }

    // Handle SVG
    if (targetFormat === 'svg') {
      const svgContent = fs.readFileSync(workingPath, 'utf8');
      const optimized = optimizeSvg(svgContent, settings.svgMode || 'safe');
      fs.writeFileSync(outputPath, optimized);
      const outputStats = fs.statSync(outputPath);
      return {
        id: '', success: true, outputPath,
        inputSize: info.size, outputSize: outputStats.size,
        width: info.width, height: info.height, format: 'svg',
      };
    }

    // Resize if needed (to temp file)
    let resizedPath = workingPath;
    if (settings.width || settings.height) {
      resizedPath = path.join(os.tmpdir(), `resize-${Date.now()}${path.extname(workingPath)}`);
      await resizeImage(workingPath, resizedPath, {
        width: settings.width,
        height: settings.height,
        maintainAspectRatio: settings.maintainAspectRatio,
      });
    }

    // Format-specific optimization
    switch (targetFormat) {
      case 'jpeg':
        await optimizeJpeg(resizedPath, outputPath, { quality: settings.quality });
        break;
      case 'png':
        await optimizePng(resizedPath, outputPath, { quality: settings.quality });
        break;
      case 'webp':
        await optimizeWebp(resizedPath, outputPath, { quality: settings.quality });
        break;
      case 'avif':
        await optimizeAvif(resizedPath, outputPath, { quality: settings.quality });
        break;
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    // Enforce max file size if set
    if (settings.maxFileSize && targetFormat !== 'png') {
      const size = fs.statSync(outputPath).size;
      if (size > settings.maxFileSize) {
        await enforceMaxFileSize(resizedPath, outputPath, {
          format: targetFormat as 'jpeg' | 'webp' | 'avif',
          maxBytes: settings.maxFileSize,
          startQuality: settings.quality,
        });
      }
    }

    // Get output info
    const outputMeta = await sharp(outputPath).metadata();
    const outputStats = fs.statSync(outputPath);

    // Cleanup temp files
    if (resizedPath !== workingPath) fs.unlinkSync(resizedPath);
    if (workingPath !== inputPath) fs.unlinkSync(workingPath);

    return {
      id: '', success: true, outputPath,
      inputSize: info.size, outputSize: outputStats.size,
      width: outputMeta.width, height: outputMeta.height,
      format: targetFormat,
    };
  } catch (error) {
    return {
      id: '', success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
