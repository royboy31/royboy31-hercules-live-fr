const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sliderDir = './public/images/slider';
const images = ['slide-1-teamwear.jpg', 'slide-2-scarves.jpg', 'slide-3-slides.jpg'];

async function convert() {
  let totalOriginal = 0;
  let totalNew = 0;

  for (const img of images) {
    const inputPath = path.join(sliderDir, img);
    const webpName = img.replace('.jpg', '.webp');
    const outputPath = path.join(sliderDir, webpName);

    const stats = fs.statSync(inputPath);
    totalOriginal += stats.size;

    await sharp(inputPath)
      .webp({ quality: 70 })
      .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    totalNew += newStats.size;

    console.log('Created: ' + webpName);
  }

  const origKB = (totalOriginal/1024).toFixed(0);
  const newKB = (totalNew/1024).toFixed(0);
  const savings = ((1-totalNew/totalOriginal)*100).toFixed(0);
  console.log('\nTotal: ' + origKB + 'KB -> ' + newKB + 'KB (' + savings + '% savings)');
}

convert();
