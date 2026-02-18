import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SLIDER_DIR = './public/images/slider';
const LOGOS_DIR = './public/images/logos';
const IMAGES_DIR = './public/images';

// 1. Resize slider desktop images from 1920x750 to 1280x550
async function resizeSliderDesktopImages() {
  console.log('=== Resizing Slider Desktop Images (1920x750 -> 1280x550) ===');

  const desktopSliders = ['slide-1-teamwear.webp', 'slide-2-scarves.webp', 'slide-3-slides.webp'];

  for (const file of desktopSliders) {
    const inputPath = path.join(SLIDER_DIR, file);
    const backupPath = path.join(SLIDER_DIR, file.replace('.webp', '-1920.webp'));

    if (!fs.existsSync(inputPath)) {
      console.log(`  Skipping ${file} (not found)`);
      continue;
    }

    const originalSize = fs.statSync(inputPath).size;

    // Backup original if not already backed up
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
    }

    // Resize to 1280x550 (matching slider container)
    await sharp(inputPath)
      .resize(1280, 550, { fit: 'cover', position: 'center' })
      .webp({ quality: 82 })
      .toFile(inputPath + '.tmp');

    fs.renameSync(inputPath + '.tmp', inputPath);

    const newSize = fs.statSync(inputPath).size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    console.log(`  ✓ ${file}: ${(originalSize/1024).toFixed(1)}KB -> ${(newSize/1024).toFixed(1)}KB (${savings}% saved)`);
  }
}

// 2. Optimize logo (resize to 2x display size: 490x220)
async function optimizeLogo() {
  console.log('\n=== Optimizing Logo ===');

  const logoPath = path.join(IMAGES_DIR, 'hercules-logo-mobile-2x.webp');
  const backupPath = path.join(IMAGES_DIR, 'hercules-logo-mobile-2x-original.webp');

  if (!fs.existsSync(logoPath)) {
    console.log('  Logo not found, skipping');
    return;
  }

  const originalSize = fs.statSync(logoPath).size;

  // Backup original if not already backed up
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(logoPath, backupPath);
  }

  // Resize to 490x220 (2x of 245x110 display) and optimize
  await sharp(logoPath)
    .resize(490, 220, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(logoPath + '.tmp');

  fs.renameSync(logoPath + '.tmp', logoPath);

  const newSize = fs.statSync(logoPath).size;
  const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
  console.log(`  ✓ hercules-logo-mobile-2x.webp: ${(originalSize/1024).toFixed(1)}KB -> ${(newSize/1024).toFixed(1)}KB (${savings}% saved)`);
}

// 3. Convert trust logos from PNG to WebP
async function convertTrustLogos() {
  console.log('\n=== Converting Trust Logos (PNG -> WebP) ===');

  const pngFiles = fs.readdirSync(LOGOS_DIR).filter(f => f.endsWith('.png'));
  let totalSaved = 0;
  let converted = 0;

  for (const file of pngFiles) {
    const inputPath = path.join(LOGOS_DIR, file);
    const outputPath = path.join(LOGOS_DIR, file.replace('.png', '.webp'));

    // Skip if webp already exists
    if (fs.existsSync(outputPath)) {
      continue;
    }

    const originalSize = fs.statSync(inputPath).size;

    await sharp(inputPath)
      .webp({ quality: 85, alphaQuality: 100 })
      .toFile(outputPath);

    const newSize = fs.statSync(outputPath).size;
    totalSaved += (originalSize - newSize);
    converted++;
    console.log(`  ✓ ${file} -> .webp: ${(originalSize/1024).toFixed(1)}KB -> ${(newSize/1024).toFixed(1)}KB`);
  }

  console.log(`  Total: ${converted} logos converted, ${(totalSaved/1024).toFixed(1)}KB saved`);
}

// Main
async function main() {
  try {
    await resizeSliderDesktopImages();
    await optimizeLogo();
    await convertTrustLogos();
    console.log('\n=== All optimizations complete! ===');
    console.log('\nNext step: Update TrustLogos.astro to use .webp instead of .png');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
