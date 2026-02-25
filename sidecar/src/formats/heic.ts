import { execSync } from 'child_process';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';

export async function decodeHeic(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // First try Sharp (works if built with libheif support)
  try {
    await sharp(inputPath).jpeg({ quality: 98 }).toFile(outputPath);
    return;
  } catch {
    // Sharp prebuilt doesn't support HEIC — fall back to macOS sips
  }

  // Use macOS sips to convert HEIC to JPEG
  const tmpJpeg = path.join(os.tmpdir(), `heic-decode-${Date.now()}.jpg`);
  try {
    execSync(`sips -s format jpeg "${inputPath}" --out "${tmpJpeg}"`, {
      stdio: 'pipe',
    });
    fs.copyFileSync(tmpJpeg, outputPath);
  } finally {
    if (fs.existsSync(tmpJpeg)) fs.unlinkSync(tmpJpeg);
  }
}
