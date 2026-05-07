// Final sweep: replace ALL remaining Unsplash refs across every HTML page (EN + AR).
const fs = require('fs');
const path = require('path');

const POOL = {
  arch:    ['arch-marble-staircase','arch-staircase-lemon','arch-corridor-marble','arch-corridor-editorial'],
  brand:   ['brand-logo-wall','lounge-logo-wall','exterior-day-bilingual','storefront-entrance','storefront-services-list'],
  hair:    ['service-hair-barber-stations','service-hair-brand-wall'],
  facial:  ['service-facial-candlelit','service-facial-overview','service-facial-steam-closeup'],
  massage: ['service-massage-tools','service-massage-wood','service-massage-pink'],
  bath:    ['service-moroccan-bath','service-moroccan-shower'],
  nails:   ['service-pedicure-marble','service-pedicure-trolley','service-pedicure-station','standard-pedicure-onyx']
};
const THEMES = ['hair','facial','massage','nails','arch','brand'];
function pick(theme, i) { const list = POOL[theme] || POOL.brand; return list[i % list.length]; }

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

function depth(rel) {
  const parts = rel.split('/');
  return parts.length - 1;
}
function prefixFor(rel) { return '../'.repeat(depth(rel)); }

let totalFiles = 0;
let totalReplaced = 0;
walk(__dirname).forEach(fp => {
  const rel = path.relative(__dirname, fp).replace(/\\/g, '/');
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;
  const prefix = prefixFor(rel);

  // 1. Strip preconnect / dns-prefetch hints to unsplash (no longer needed)
  html = html.replace(/\s*<link[^>]+(?:preconnect|dns-prefetch)[^>]*images\.unsplash\.com[^>]*>/g, '');
  // 2. Replace <img src=unsplash> with rotating local photo
  let i = 0;
  html = html.replace(/<img([^>]*?)src="https:\/\/images\.unsplash\.com\/[^"]+"/g, (m, attrs) => {
    const photo = pick(THEMES[i % 6], i);
    const w = i === 0 ? 1600 : 1000;
    i++;
    return '<img' + attrs + 'src="' + prefix + 'assets/img/photos/' + photo + '-' + w + '.webp"';
  });
  // 3. Replace lightbox <a href=unsplash> with full-size local
  html = html.replace(/href="https:\/\/images\.unsplash\.com\/[^"]+"/g, () => {
    const photo = pick(THEMES[i % 6], i);
    i++;
    return 'href="' + prefix + 'assets/img/photos/' + photo + '-1600.webp"';
  });
  // 4. Strip preload to unsplash (we now have local hero)
  html = html.replace(/<link rel="preload" as="image" href="https:\/\/images\.unsplash\.com\/[^"]+"[^>]*>/g, '<link rel="preload" as="image" href="' + prefix + 'assets/img/photos/hero-exterior-night-1600.webp" fetchpriority="high" />');

  if (html !== orig) {
    fs.writeFileSync(fp, html);
    totalFiles++;
    totalReplaced += i;
  }
});
console.log('updated', totalFiles, 'files,', totalReplaced, 'replacements');
