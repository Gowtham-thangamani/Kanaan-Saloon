// Update site.json + branches.json to point to the new local photos.
// Then trigger generators so all branch HTMLs pick up the new image URLs.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PHOTO_BASE = 'assets/img/photos/';
function p(name, w) { return PHOTO_BASE + name + '-' + w + '.webp'; }

// Branch image plan (hero + 6 gallery thumbs each)
const BRANCHES = {
  'al-ain':         { hero: 'standard-pedicure-onyx',     gallery: ['service-pedicure-station','service-pedicure-trolley','brand-logo-wall','lounge-logo-wall','exterior-day-bilingual','storefront-entrance'] },
  'khalifa-city':   { hero: 'service-pedicure-marble',    gallery: ['service-massage-wood','service-pedicure-trolley','lounge-logo-wall','arch-corridor-marble','exterior-day-bilingual','arch-marble-staircase'] },
  'khalidiya':      { hero: 'service-hair-barber-stations', gallery: ['service-facial-overview','service-pedicure-trolley','brand-logo-wall','lounge-logo-wall','storefront-entrance','exterior-day-bilingual'] },
  'baniyas-spa':    { hero: 'service-moroccan-bath',      gallery: ['service-facial-candlelit','service-massage-tools','service-moroccan-shower','service-pedicure-marble','exterior-day-bilingual','arch-corridor-editorial'] },
  'baniyas-barber': { hero: 'service-hair-barber-stations', gallery: ['service-hair-brand-wall','brand-logo-wall','service-pedicure-station','lounge-logo-wall','storefront-entrance','exterior-day-bilingual'] },
  'rabdan':         { hero: 'service-pedicure-station',   gallery: ['service-massage-wood','service-facial-overview','brand-logo-wall','lounge-logo-wall','exterior-day-bilingual','storefront-entrance'] },
  'old-shahamah':   { hero: 'service-pedicure-station',   gallery: ['brand-logo-wall','service-pedicure-trolley','exterior-day-bilingual','storefront-entrance','storefront-services-list','lounge-logo-wall'] },
  'new-shahamah':   { hero: 'service-pedicure-marble',    gallery: ['service-pedicure-trolley','lounge-logo-wall','brand-logo-wall','exterior-day-bilingual','storefront-services-list','storefront-entrance'] },
  'muroor':         { hero: 'service-hair-barber-stations', gallery: ['service-hair-brand-wall','brand-logo-wall','lounge-logo-wall','storefront-services-list','storefront-entrance','exterior-day-bilingual'] },
  'vip-muroor':     { hero: 'vip-muroor-suite',           gallery: ['vip-muroor-pedicure','vip-muroor-blue-chair','vip-muroor-wave-mirror','arch-marble-staircase','arch-corridor-editorial','arch-corridor-marble'] }
};

// 1. site.json — homepage hero
const sitePath = path.join(__dirname, 'content', 'site.json');
const site = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
site.homepage_hero.image = '/' + p('hero-exterior-night', '1600');
fs.writeFileSync(sitePath, JSON.stringify(site, null, 2));
console.log('updated content/site.json hero →', site.homepage_hero.image);

// 2. branches.json — per-branch image + gallery
const branchesPath = path.join(__dirname, 'content', 'branches.json');
const branches = JSON.parse(fs.readFileSync(branchesPath, 'utf8'));
branches.branches.forEach(b => {
  const plan = BRANCHES[b.id];
  if (!plan) return;
  b.image = '/' + p(plan.hero, '1600');
  b.gallery = plan.gallery.map(name => '/' + p(name, '1000'));
});
fs.writeFileSync(branchesPath, JSON.stringify(branches, null, 2));
console.log('updated content/branches.json — 10 branches re-mapped to local photos');

// 3. Update service HTML hero images (hardcoded, not data-driven)
const SERVICE_IMG = {
  'hair-beard.html':         'service-hair-barber-stations',
  'facial-skin-care.html':   'service-facial-candlelit',
  'massage.html':            'service-massage-tools',
  'moroccan-bath.html':      'service-moroccan-bath',
  'manicure-pedicure.html':  'service-pedicure-marble',
  'hair-treatment.html':     'service-hair-brand-wall',
  'grooming-packages.html':  'service-facial-overview'
};
Object.entries(SERVICE_IMG).forEach(([file, photo]) => {
  ['services/' + file, 'ar/services/' + file].forEach(rel => {
    const fp = path.join(__dirname, rel);
    if (!fs.existsSync(fp)) return;
    let html = fs.readFileSync(fp, 'utf8');
    const newSrc = '../' + p(photo, '1600');
    // Replace the first <img> inside .page-hero__media src attribute
    html = html.replace(
      /(<div class="page-hero__media[^>]*>\s*<img[^>]*?src=")[^"]+(")/,
      '$1' + newSrc + '$2'
    );
    fs.writeFileSync(fp, html);
    console.log('  ' + rel + ' → ' + photo);
  });
});

// 4. Re-run the EN + AR branch generators (they read branches.json)
console.log('\nregenerating branch pages…');
cp.execSync('node generate-branches.js', { stdio: 'inherit' });
cp.execSync('node generate-ar-branches.js', { stdio: 'inherit' });
cp.execSync('node generate-branch-lps.js', { stdio: 'inherit' });
cp.execSync('node generate-sitemap.js', { stdio: 'inherit' });
console.log('\nDone. Hard-refresh browser to see real Kanaan photos.');
