import sharp from 'sharp';

export interface AvifOptions {
  quality: number;
}

export async function optimizeAvif(
  inputPath: string,
  outputPath: string,
  options: AvifOptions
): Promise<void> {
  await sharp(inputPath)
    .avif({
      quality: options.quality,
      chromaSubsampling: '4:4:4',
      effort: 4,
    })
    .toFile(outputPath);
}
