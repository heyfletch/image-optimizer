import sharp from 'sharp';
import path from 'path';

async function main() {
  const dir = path.dirname(new URL(import.meta.url).pathname);

  // Create a 200x150 test JPEG with known colors
  await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 255, g: 100, b: 50 } }
  }).jpeg({ quality: 100 }).toFile(path.join(dir, 'test.jpg'));

  // Create a 200x150 test PNG
  await sharp({
    create: { width: 200, height: 150, channels: 4, background: { r: 0, g: 128, b: 255, alpha: 1 } }
  }).png().toFile(path.join(dir, 'test.png'));

  // Create a large 4000x3000 JPEG for resize testing
  await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: { r: 128, g: 200, b: 100 } }
  }).jpeg({ quality: 95 }).toFile(path.join(dir, 'test-large.jpg'));

  console.log('Test fixtures created');
}

main();
