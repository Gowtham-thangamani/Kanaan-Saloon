// Print intrinsic dimensions for the photos referenced on index.html.
const sharp = require('sharp');
const path  = require('path');
const list = [
  'service-hair-barber-stations-1000.webp',
  'service-facial-candlelit-1000.webp',
  'service-massage-tools-1000.webp',
  'service-moroccan-bath-1000.webp',
  'service-pedicure-marble-1000.webp',
  'service-hair-brand-wall-1000.webp',
  'service-facial-overview-1000.webp',
  'brand-logo-wall-1000.webp',
  'service-massage-pink-1000.webp',
  'service-pedicure-trolley-1000.webp',
  'arch-corridor-marble-1000.webp',
];
(async () => {
  for (const f of list) {
    try {
      const m = await sharp(path.join(__dirname, '..', 'assets', 'img', 'photos', f)).metadata();
      console.log(`${f}\t${m.width}x${m.height}`);
    } catch (e) { console.log(`${f}\tMISSING`); }
  }
})();
