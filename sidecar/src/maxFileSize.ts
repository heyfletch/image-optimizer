import sharp from 'sharp';
import fs from 'fs';

interface MaxFileSizeOptions {
  format: 'jpeg' | 'webp' | 'avif';
  maxBytes: number;
  startQuality: number;
}

interface MaxFileSizeResult {
  finalQuality: number;
  achieved: boolean;
}

export async function enforceMaxFileSize(
  inputPath: string,
  outputPath: string,
  options: MaxFileSizeOptions
): Promise<MaxFileSizeResult> {
  const { format, maxBytes, startQuality } = options;
  const minQuality = 10;
  const maxIterations = 5;

  let low = minQuality;
  let high = startQuality;
  let bestQuality = -1; // -1 means no quality achieved the target yet

  // First try at the starting quality
  await writeAtQuality(inputPath, outputPath, format, startQuality);
  let size = fs.statSync(outputPath).size;

  if (size <= maxBytes) {
    return { finalQuality: startQuality, achieved: true };
  }

  // Binary search for the right quality
  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.round((low + high) / 2);
    await writeAtQuality(inputPath, outputPath, format, mid);
    size = fs.statSync(outputPath).size;

    if (size <= maxBytes) {
      bestQuality = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // If we found a quality that works, write at that quality
  if (bestQuality > 0) {
    await writeAtQuality(inputPath, outputPath, format, bestQuality);
    return { finalQuality: bestQuality, achieved: true };
  }

  // Otherwise write at minimum quality — may still exceed target
  await writeAtQuality(inputPath, outputPath, format, minQuality);
  size = fs.statSync(outputPath).size;

  return {
    finalQuality: minQuality,
    achieved: size <= maxBytes,
  };
}

async function writeAtQuality(
  inputPath: string,
  outputPath: string,
  format: string,
  quality: number
): Promise<void> {
  let pipeline = sharp(inputPath);

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality, smartSubsample: true, effort: 6 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality, chromaSubsampling: '4:4:4' });
      break;
  }

  await pipeline.toFile(outputPath);
}
