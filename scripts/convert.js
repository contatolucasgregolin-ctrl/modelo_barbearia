import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const inputDir = path.join(process.cwd(), 'public', 'images', 'raw');
const outputDir = path.join(process.cwd(), 'public', 'images', 'webp');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.readdir(inputDir, (err, files) => {
  if (err) {
    if (err.code === 'ENOENT') {
      console.log(`Directory ${inputDir} does not exist. Created it. Please add images there.`);
      fs.mkdirSync(inputDir, { recursive: true });
      return;
    }
    console.error(`Error reading ${inputDir}:`, err);
    return;
  }

  const imageFiles = files.filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
  
  if (imageFiles.length === 0) {
    console.log('No images found in', inputDir);
    return;
  }

  imageFiles.forEach(file => {
    const inputPath = path.join(inputDir, file);
    const parsedPath = path.parse(file);
    const outputPath = path.join(outputDir, `${parsedPath.name}.webp`);

    sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(outputPath)
      .then(() => {
        console.log(`Converted ${file} to ${parsedPath.name}.webp`);
      })
      .catch(err => {
        console.error(`Error converting ${file}:`, err);
      });
  });
});
