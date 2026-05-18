// One-shot: convert hero-kanaan-interior.png + hero-kanaan-tools.png to WebP
// at 600 / 1000 / 1600 widths, matching the rest of the photo set.
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const PHOTOS = path.join(__dirname, '..', 'assets', 'img', 'photos');
const SOURCES = ['hero-kanaan-interior.png', 'hero-kanaan-tools.png'];
const WIDTHS = [600, 1000, 1600];

(async () => {
  for (const src of SOURCES) {
    const stem = src.replace(/\.png$/i, '');
    const input = path.join(PHOTOS, src);
    if (!fs.existsSync(input)) { console.warn('missing', input); continue; }
    for (const w of WIDTHS) {
      const out = path.join(PHOTOS, `${stem}-${w}.webp`);
      await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(out);
      const kb = (fs.statSync(out).size / 1024).toFixed(0);
      console.log(`  ${path.basename(out)}  ${kb} KB`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
