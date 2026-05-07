// Wire 28 selected real Kanaan photos into the website.
// 1. Copy from Downloads to assets/img/photos/ with semantic names
// 2. Try to convert to webp via sharp (if installed); fallback to keeping png
// 3. Update content/site.json + content/branches.json + services HTML to reference local paths
const fs = require('fs');
const path = require('path');
const SRC = 'C:\\Users\\gowth\\Downloads\\drive-download-20260504T042237Z-3-001';
const DST = path.join(__dirname, 'assets', 'img', 'photos');
if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });

// Semantic mapping: source filename → destination filename
const MAP = [
  // Hero & branding
  ['IMG_6162.PNG', 'hero-exterior-night.png'],
  ['IMG_6136.PNG', 'exterior-day-bilingual.png'],
  ['IMG_6167.PNG', 'storefront-entrance.png'],
  ['IMG_6181.PNG', 'storefront-services-list.png'],
  ['IMG_6160.PNG', 'brand-logo-wall.png'],
  ['IMG_6154.PNG', 'lounge-logo-wall.png'],
  // Architecture / atmosphere
  ['IMG_6148.PNG', 'arch-marble-staircase.png'],
  ['IMG_6151.PNG', 'arch-staircase-lemon.png'],
  ['IMG_6158.PNG', 'arch-corridor-marble.png'],
  ['IMG_6175.PNG', 'arch-corridor-editorial.png'],
  // Services — Hair & Beard
  ['IMG_6137.PNG', 'service-hair-barber-stations.png'],
  ['IMG_6141.PNG', 'service-hair-brand-wall.png'],
  // Services — Facial
  ['IMG_6138.PNG', 'service-facial-candlelit.png'],
  ['IMG_6142.PNG', 'service-facial-steam-closeup.png'],
  ['IMG_6143.PNG', 'service-facial-overview.png'],
  // Services — Massage
  ['IMG_6177.PNG', 'service-massage-tools.png'],
  ['IMG_6140.PNG', 'service-massage-pink.png'],
  ['IMG_6180.PNG', 'service-massage-wood.png'],
  // Services — Moroccan Bath
  ['IMG_6157.PNG', 'service-moroccan-bath.png'],
  ['IMG_6163.PNG', 'service-moroccan-shower.png'],
  // Services — Manicure & Pedicure
  ['IMG_6146.PNG', 'service-pedicure-marble.png'],
  ['IMG_6144.PNG', 'service-pedicure-trolley.png'],
  ['IMG_6135.PNG', 'service-pedicure-station.png'],
  // VIP Muroor distinct shots
  ['IMG_6149.PNG', 'vip-muroor-suite.png'],
  ['IMG_6150.PNG', 'vip-muroor-pedicure.png'],
  ['IMG_6161.PNG', 'vip-muroor-blue-chair.png'],
  ['IMG_6166.PNG', 'vip-muroor-wave-mirror.png'],
  // Older standard branches
  ['IMG_6176.PNG', 'standard-pedicure-onyx.png']
];

let copied = 0;
MAP.forEach(([src, dst]) => {
  const srcPath = path.join(SRC, src);
  const dstPath = path.join(DST, dst);
  if (!fs.existsSync(srcPath)) { console.warn('MISSING:', src); return; }
  fs.copyFileSync(srcPath, dstPath);
  copied++;
  console.log('copied', src, '->', dst);
});
console.log('\n' + copied + ' photos copied to assets/img/photos/');

// Optional: convert to WebP if sharp is available
let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }
if (sharp) {
  console.log('\nsharp available — generating webp variants…');
  Promise.all(MAP.map(([, dst]) => {
    const base = dst.replace('.png', '');
    return Promise.all([
      sharp(path.join(DST, dst)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(DST, base + '-1600.webp')),
      sharp(path.join(DST, dst)).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 76 }).toFile(path.join(DST, base + '-1000.webp')),
      sharp(path.join(DST, dst)).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(DST, base + '-600.webp'))
    ]);
  })).then(() => console.log('webp variants written'));
} else {
  console.log('\nsharp not installed — referencing PNGs as-is. (Install with: npm i sharp, then re-run.)');
}
