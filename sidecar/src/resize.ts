import sharp from 'sharp';

export interface ResizeOptions {
  width?: number | null;
  height?: number | null;
  maintainAspectRatio: boolean;
  density?: number;
}

export async function resizeImage(
  inputPath: string,
  outputPath: string,
  options: ResizeOptions
): Promise<void> {
  const sharpOptions = options.density ? { density: options.density } : undefined;
  let pipeline = sharp(inputPath, sharpOptions);

  if (options.width || options.height) {
    if (options.maintainAspectRatio) {
      pipeline = pipeline.resize(options.width ?? undefined, options.height ?? undefined, {
        fit: 'inside',
        withoutEnlargement: !options.density,
      });
    } else {
      pipeline = pipeline.resize(options.width ?? undefined, options.height ?? undefined, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: !options.density,
      });
    }
  }

  await pipeline.toFile(outputPath);
}
