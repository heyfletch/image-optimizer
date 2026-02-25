import sharp from 'sharp';

export async function optimizePng(
  inputPath: string,
  outputPath: string,
  options: { quality: number }
): Promise<void> {
  const usePalette = options.quality < 100;

  await sharp(inputPath)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10,
      palette: usePalette,
      quality: usePalette ? options.quality : undefined,
    })
    .toFile(outputPath);
}
