import sharp from 'sharp';

const input = 'public/images/raw/new_background.png';
const output = 'public/images/webp/background_main.webp';

sharp(input)
    .webp({ quality: 85 })
    .toFile(output)
    .then(info => console.log('Background converted successfully:', info))
    .catch(err => console.error('Error converting background:', err));
