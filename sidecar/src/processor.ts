import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { optimizeJpeg } from './formats/jpeg.js';
import { optimizePng } from './formats/png.js';
import { optimizeWebp } from './formats/webp.js';
import { optimizeAvif } from './formats/avif.js';
import { optimizeSvg, resizeSvg, makeSvgResponsive } from './formats/svg.js';
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
    let width = 0;
    let height = 0;

    // Try explicit width/height first
    const widthMatch = content.match(/width="(\d+)/);
    const heightMatch = content.match(/height="(\d+)/);
    if (widthMatch) width = parseInt(widthMatch[1]);
    if (heightMatch) height = parseInt(heightMatch[1]);

    // Fall back to viewBox dimensions
    if (!width || !height) {
      const vbMatch = content.match(/viewBox=["'][\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/);
      if (vbMatch) {
        if (!width) width = Math.round(parseFloat(vbMatch[1]));
        if (!height) height = Math.round(parseFloat(vbMatch[2]));
      }
    }

    return { width, height, format: 'svg', size: stats.size };
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
      let optimized = optimizeSvg(svgContent, settings.svgMode || 'standard');

      let finalWidth = info.width;
      let finalHeight = info.height;

      // Resize SVG if a target width is set
      if (settings.width && info.width > 0) {
        const resized = resizeSvg(optimized, settings.width, info.width, info.height);
        optimized = resized.content;
        finalWidth = resized.width;
        finalHeight = resized.height;
      }

      // Make responsive: remove fixed width/height, keep viewBox
      if (settings.svgResponsive) {
        optimized = makeSvgResponsive(optimized, finalWidth, finalHeight);
      }

      fs.writeFileSync(outputPath, optimized);
      const outputStats = fs.statSync(outputPath);
      return {
        id: '', success: true, outputPath,
        inputSize: info.size, outputSize: outputStats.size,
        width: finalWidth, height: finalHeight, format: 'svg',
      };
    }

    // Resize if needed (to temp file)
    // For SVG→raster, set density so Sharp rasterizes at target resolution
    const isSvgInput = inputFormat === 'svg' || workingPath.toLowerCase().endsWith('.svg');
    let density: number | undefined;
    if (isSvgInput && settings.width && info.width > 0) {
      density = Math.ceil(72 * (settings.width / info.width));
    }

    let resizedPath = workingPath;
    if (settings.width || settings.height || density) {
      resizedPath = path.join(os.tmpdir(), `resize-${Date.now()}.png`);
      await resizeImage(workingPath, resizedPath, {
        width: settings.width,
        height: settings.height,
        maintainAspectRatio: settings.maintainAspectRatio,
        density,
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
