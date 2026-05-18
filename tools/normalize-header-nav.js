#!/usr/bin/env node
/**
 * Rebuild the public-site main-nav + mobile-nav on every page so all pages
 * share the same 7 links in the same order.
 *
 *   HOME · ABOUT · OFFERS · BRANCHES & SERVICES · GALLERY · INSIGHTS · CONTACT
 *
 * Handles:
 *   - EN root (./about), EN subfolder (../about), EN deep subfolder (../../about)
 *   - AR root (../about → relative to /ar/), AR subfolder (../../about)
 *   - Preserves `is-active` on the link matching the current page slug
 *   - Skips admin/* (different shell)
 *   - Mobile nav: only rewrites the link list, preserves trailing
 *     lang-switch + Book Now buttons.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.html$/i.test(e.name)) out.push(f);
  }
  return out;
}

const EN_LINKS = [
  { slug: '',         label: 'Home',                  href: './' },
  { slug: 'about',    label: 'About',                 href: 'about' },
  { slug: 'offers',   label: 'Offers',                href: 'offers' },
  { slug: 'branches', label: 'Branches &amp; Services', href: 'branches' },
  { slug: 'gallery',  label: 'Gallery',               href: 'gallery' },
  { slug: 'blog',     label: 'Insights',              href: 'blog' },
  { slug: 'contact',  label: 'Contact',               href: 'contact' }
];
const AR_LINKS = [
  { slug: '',         label: 'الرئيسية',         href: './' },
  { slug: 'about',    label: 'عن كنعان',         href: 'about' },
  { slug: 'offers',   label: 'العروض',           href: 'offers' },
  { slug: 'branches', label: 'البيوت والخدمات',  href: 'branches' },
  { slug: 'gallery',  label: 'المعرض',           href: 'gallery' },
  { slug: 'blog',     label: 'المقالات',         href: 'blog' },
  { slug: 'contact',  label: 'تواصل',            href: 'contact' }
];

// Determine which link should be marked is-active based on the file's path
function activeSlugFor(rel, isAr) {
  // Strip leading ar/ for AR pages so the slug matches the canonical list
  const p = isAr ? rel.replace(/^ar[\\/]/, '') : rel;
  // First path segment determines the section
  const first = p.split(/[\\/]/)[0].replace(/\.html$/i, '');
  if (first === 'index' || first === '' ) return '';
  // Special cases: a /branches/<slug> page → branches; /services/<slug> → branches too
  // (services is merged into Branches & Services). /blog/<slug> → blog.
  if (first === 'services') return 'branches';
  if (first === 'branches') return 'branches';
  if (first === 'blog') return 'blog';
  if (first === 'lp') return ''; // landing pages don't highlight any nav
  return first;
}

// Compute path prefix so links resolve from this page's depth.
// Depth examples (relative to /, EN side):
//   index.html             depth 0  → ''
//   blog/foo.html          depth 1  → '../'
//   ar/index.html          depth 1  → '../'
//   ar/blog/foo.html       depth 2  → '../../'
function depthOf(rel) {
  // Count separators in the relative path; subtract 1 because the filename itself isn't a depth step
  const parts = rel.split(/[\\/]/);
  return parts.length - 1;
}

function buildMainNav(links, prefix, activeSlug) {
  const items = links.map(l => {
    const href = l.href === './' ? (prefix || './') : (prefix + l.href);
    const active = l.slug === activeSlug ? ' class="is-active"' : '';
    return `        <a href="${href}"${active}>${l.label}</a>`;
  }).join('\n');
  return '<nav class="main-nav" aria-label="Primary">\n' + items + '\n      </nav>';
}

function buildMobileNav(links, prefix, activeSlug, langSwitchUrl, bookUrl, isAr) {
  const items = links.map(l => {
    const href = l.href === './' ? (prefix || './') : (prefix + l.href);
    const active = l.slug === activeSlug ? ' class="is-active"' : '';
    return `      <a href="${href}"${active}>${l.label}</a>`;
  }).join('\n');
  const lang = `<a href="${langSwitchUrl}" class="lang-switch">${isAr ? 'EN' : 'عربي'}</a>`;
  const book = `<a href="${bookUrl}" class="btn btn--sm">${isAr ? 'احجز الآن' : 'Book Now'}</a>`;
  return `<nav class="mobile-nav" aria-label="Mobile">\n${items}\n      ${lang}\n      ${book}\n    </nav>`;
}

let touched = 0;
const skipped = [];

for (const f of walk(ROOT)) {
  const rel = path.relative(ROOT, f);
  if (rel.startsWith('admin' + path.sep)) { skipped.push(rel); continue; }
  if (rel === 'admin.html') continue;

  let c = fs.readFileSync(f, 'utf8');
  const orig = c;

  // Must have a main-nav to rewrite — otherwise this is a non-public template
  // (admin pages, _post.html, etc.). Skip silently.
  if (!/<nav class="main-nav"/.test(c)) { skipped.push(rel + '  (no main-nav)'); continue; }

  const isAr = rel.startsWith('ar' + path.sep) || rel === 'ar';
  const d = depthOf(rel);
  // EN root (depth 0) → '';   subfolder (depth 1) → '../';   deep (2) → '../../'
  // AR root means file is ar/foo.html (depth 1 from / but depth 0 from /ar/)
  // So for AR: depth 1 → '' (because ar/ pages already live at /ar/);
  //           depth 2 → '../' (e.g. ar/branches/al-ain.html);
  //           depth 3 → '../../' (rare)
  const arOffset = isAr ? 1 : 0;
  const effectiveDepth = d - arOffset;
  const prefix = '../'.repeat(Math.max(0, effectiveDepth));

  const links = isAr ? AR_LINKS : EN_LINKS;
  const activeSlug = activeSlugFor(rel, isAr);

  // Replace <nav class="main-nav">...</nav>
  const mainNavHtml = buildMainNav(links, prefix, activeSlug);
  c = c.replace(/<nav class="main-nav"[^>]*>[\s\S]*?<\/nav>/, mainNavHtml);

  // Replace <nav class="mobile-nav">...</nav> only if it exists
  if (/<nav class="mobile-nav"/.test(c)) {
    // Preserve trailing lang-switch + book button URLs from the original block
    const existing = c.match(/<nav class="mobile-nav"[^>]*>([\s\S]*?)<\/nav>/);
    let langUrl = isAr ? prefix + '../' : prefix + 'ar/';
    let bookUrl = prefix + 'book';
    if (existing) {
      const langM = existing[1].match(/<a href="([^"]+)"[^>]*class="lang-switch"/);
      if (langM) langUrl = langM[1];
      const bookM = existing[1].match(/<a href="([^"]+)"[^>]*class="btn[^"]*"/);
      if (bookM) bookUrl = bookM[1];
    }
    const mobileNavHtml = buildMobileNav(links, prefix, activeSlug, langUrl, bookUrl, isAr);
    c = c.replace(/<nav class="mobile-nav"[^>]*>[\s\S]*?<\/nav>/, mobileNavHtml);
  }

  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    touched++;
  }
}

console.log('Rewrote nav on', touched, 'files');
console.log('Skipped', skipped.length, '(admin / templates without main-nav)');
