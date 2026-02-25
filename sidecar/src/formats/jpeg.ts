import sharp from 'sharp';

export interface JpegOptions {
  quality: number;
}

export async function optimizeJpeg(
  inputPath: string,
  outputPath: string,
  options: JpegOptions
): Promise<void> {
  // Read input metadata to preserve chroma subsampling
  const metadata = await sharp(inputPath).metadata();
  const chromaSubsampling = metadata.chromaSubsampling || '4:2:0';

  await sharp(inputPath)
    .jpeg({
      quality: options.quality,
      mozjpeg: true,
      chromaSubsampling,
    })
    .toFile(outputPath);
}
