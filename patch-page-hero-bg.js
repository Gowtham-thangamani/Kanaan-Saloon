// Inject a .page-hero__media background image into every page-hero that's missing one.
// Uses thematically-appropriate Kanaan photos. Idempotent.
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.playwright-mcp', 'pricelists', 'content', '.git', 'admin', 'assets']);
function walk(dir, files) {
  files = files || [];
  fs.readdirSync(dir).forEach(n => {
    if (SKIP_DIRS.has(n)) return;
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (n.endsWith('.html')) files.push(p);
  });
  return files;
}

// Theme map: filename slug → photo basename
const THEME = {
  'about.html':           'arch-marble-staircase',
  'services.html':        'service-hair-barber-stations',
  'offers.html':          'service-facial-overview',
  'gallery.html':         'lounge-logo-wall',
  'contact.html':         'arch-corridor-marble',
  'branches.html':        'exterior-day-bilingual',
  'compare-branches.html':'exterior-day-bilingual',
  'book.html':            'arch-corridor-editorial',
  'careers.html':         'service-hair-brand-wall',
  'gift-voucher.html':    'service-facial-candlelit',
  'corporate.html':       'vip-muroor-suite',
  'before-after.html':    'service-hair-barber-stations',
  'blog.html':            'arch-staircase-lemon',
  'thank-you.html':       'lounge-logo-wall',
  'search.html':          'arch-corridor-marble',
  // Services
  'hair-beard.html':         'service-hair-barber-stations',
  'facial-skin-care.html':   'service-facial-candlelit',
  'massage.html':            'service-massage-tools',
  'moroccan-bath.html':      'service-moroccan-bath',
  'manicure-pedicure.html':  'service-pedicure-marble',
  'hair-treatment.html':     'service-hair-brand-wall',
  'grooming-packages.html':  'service-facial-overview',
  // Blog posts
  'beard-care-abu-dhabi.html': 'service-hair-brand-wall',
  'choosing-the-right-facial.html': 'service-facial-overview',
  'moroccan-bath-guide.html': 'service-moroccan-bath',
  // Privacy / Terms etc
  'privacy-policy.html': 'arch-corridor-editorial',
  'terms.html':          'arch-corridor-editorial',
  'cookie-policy.html':  'arch-corridor-editorial',
  'accessibility.html':  'arch-corridor-editorial'
};

function pickPhoto(filename) {
  const base = filename.split('/').pop();
  return THEME[base] || 'lounge-logo-wall';
}

function depth(rel) {
  return rel.split('/').length - 1;
}

function patch(file) {
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;
  const rel = path.relative(__dirname, file).replace(/\\/g, '/');
  // Skip the home (uses .hero, not .page-hero)
  if (rel === 'index.html' || rel === 'ar/index.html') return false;
  // Skip pages that already have a page-hero__media
  if (/<div class="page-hero__media/.test(html)) return false;
  // Skip if there's no page-hero
  if (!/<section class="page-hero/.test(html)) return false;

  const photo = pickPhoto(rel);
  const prefix = '../'.repeat(depth(rel));
  const mediaDiv = '<div class="page-hero__media" data-parallax="bg" data-speed="0.50">\n      <img src="' + prefix + 'assets/img/photos/' + photo + '-1600.webp" alt="" loading="eager" fetchpriority="high" decoding="async" />\n    </div>\n    ';

  // Insert media div as first child of <section class="page-hero">
  html = html.replace(/(<section class="page-hero[^"]*"[^>]*>\s*)/, '$1' + mediaDiv);

  if (html === orig) return false;
  fs.writeFileSync(file, html);
  return true;
}

let touched = 0;
walk(__dirname).forEach(f => {
  try {
    if (patch(f)) {
      touched++;
      console.log('bg-injected', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' page-hero backgrounds added.');
