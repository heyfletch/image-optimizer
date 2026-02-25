import sharp from 'sharp';

export async function optimizePng(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await sharp(inputPath)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10,
      palette: false,
    })
    .toFile(outputPath);
}
