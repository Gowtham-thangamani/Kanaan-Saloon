// Replace remaining Unsplash <img src> references on home + service + about + offers + gallery
// with thematically-appropriate local Kanaan photos.
const fs = require('fs');
const path = require('path');

// Pool of available local photos by theme
const POOL = {
  hero:    'assets/img/photos/hero-exterior-night-1600.webp',
  arch:    ['arch-marble-staircase','arch-staircase-lemon','arch-corridor-marble','arch-corridor-editorial'],
  brand:   ['brand-logo-wall','lounge-logo-wall','exterior-day-bilingual','storefront-entrance','storefront-services-list'],
  hair:    ['service-hair-barber-stations','service-hair-brand-wall'],
  facial:  ['service-facial-candlelit','service-facial-overview','service-facial-steam-closeup'],
  massage: ['service-massage-tools','service-massage-wood','service-massage-pink'],
  bath:    ['service-moroccan-bath','service-moroccan-shower'],
  nails:   ['service-pedicure-marble','service-pedicure-trolley','service-pedicure-station','standard-pedicure-onyx'],
  vip:     ['vip-muroor-suite','vip-muroor-pedicure','vip-muroor-blue-chair','vip-muroor-wave-mirror']
};
function pick(theme, idx) {
  const list = POOL[theme] || POOL.brand;
  return list[idx % list.length];
}

// Walk pages we want to update
const TARGETS = [
  'index.html','services.html','about.html','offers.html','gallery.html','contact.html','book.html','careers.html',
  'services/hair-beard.html','services/facial-skin-care.html','services/massage.html','services/moroccan-bath.html',
  'services/manicure-pedicure.html','services/hair-treatment.html','services/grooming-packages.html'
];

let totalReplaced = 0;

TARGETS.forEach(rel => {
  const fp = path.join(__dirname, rel);
  if (!fs.existsSync(fp)) return;
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;

  // Find every <img src="https://images.unsplash.com/...">  and rotate through the pool
  let counter = 0;
  // Pick theme based on filename
  let theme = 'brand';
  if (rel.includes('hair-beard') || rel.includes('hair-treatment')) theme = 'hair';
  else if (rel.includes('facial')) theme = 'facial';
  else if (rel.includes('massage')) theme = 'massage';
  else if (rel.includes('moroccan')) theme = 'bath';
  else if (rel.includes('manicure')) theme = 'nails';
  else if (rel.includes('grooming')) theme = 'facial';
  else if (rel.includes('about')) theme = 'arch';
  else if (rel.includes('gallery')) theme = 'brand';
  else if (rel.includes('contact') || rel.includes('careers') || rel.includes('book')) theme = 'arch';
  // For index, mix multiple themes
  const mixed = rel === 'index.html' || rel === 'services.html';

  // 1600 for first image (hero), 1000 for the rest
  const prefix = rel.includes('/') ? '../' : '';
  html = html.replace(/<img([^>]*?)src="https:\/\/images\.unsplash\.com\/[^"]+"/g, function (m, attrs) {
    const themeNow = mixed
      ? ['hair','facial','massage','nails','arch','brand'][counter % 6]
      : theme;
    const photo = pick(themeNow, counter);
    const w = counter === 0 ? 1600 : 1000;
    counter++;
    return '<img' + attrs + 'src="' + prefix + 'assets/img/photos/' + photo + '-' + w + '.webp"';
  });

  // Also fix the hero <link rel="preload"> on index/book if any
  html = html.replace(
    /<link rel="preload" as="image" href="https:\/\/images\.unsplash\.com\/[^"]+"([^>]*)>/g,
    '<link rel="preload" as="image" href="' + prefix + 'assets/img/photos/hero-exterior-night-1600.webp"$1>'
  );

  if (html !== orig) {
    fs.writeFileSync(fp, html);
    const n = (orig.match(/images\.unsplash\.com/g)||[]).length - (html.match(/images\.unsplash\.com/g)||[]).length;
    totalReplaced += n;
    console.log('updated', rel, '(', n, 'unsplash refs replaced)');
  }
});
console.log('\n' + totalReplaced + ' total references swapped to local photos.');
