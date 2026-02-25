import sharp from 'sharp';

export interface ResizeOptions {
  width?: number | null;
  height?: number | null;
  maintainAspectRatio: boolean;
}

export async function resizeImage(
  inputPath: string,
  outputPath: string,
  options: ResizeOptions
): Promise<void> {
  let pipeline = sharp(inputPath);

  if (options.width || options.height) {
    if (options.maintainAspectRatio) {
      pipeline = pipeline.resize(options.width ?? undefined, options.height ?? undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    } else {
      pipeline = pipeline.resize(options.width ?? undefined, options.height ?? undefined, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      });
    }
  }

  await pipeline.toFile(outputPath);
}
