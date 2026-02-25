import sharp from 'sharp';

export interface WebpOptions {
  quality: number;
}

export async function optimizeWebp(
  inputPath: string,
  outputPath: string,
  options: WebpOptions
): Promise<void> {
  await sharp(inputPath)
    .webp({
      quality: options.quality,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(outputPath);
}
