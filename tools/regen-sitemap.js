#!/usr/bin/env node
/**
 * Regenerate sitemap.xml from disk truth.
 * Rules:
 * - Include all .html pages except: 404.html, thank-you.html, search.html,
 *   admin/*, og-preview.html, redirect pages (services.html).
 * - Skip pages with <meta name="robots" content="noindex">.
 * - lastmod = file mtime in YYYY-MM-DD format.
 * - Pair EN + AR mirrors via xhtml:link hreflang.
 * - x-default points to the EN URL.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://kanaanspa.ae';
const SKIP = new Set([
  '404.html', 'thank-you.html', 'search.html', 'og-preview.html',
  'services.html', // redirects to branches.html
  'ar/404.html', 'ar/thank-you.html', 'ar/services.html',
]);

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    if (e.name === 'admin') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.html$/i.test(e.name)) out.push(f);
  }
  return out;
}

function relUrl(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function isNoindex(file) {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 4000);
    return /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(head);
  } catch { return false; }
}

const files = walk(ROOT)
  .map(relUrl)
  .filter(u => !SKIP.has(u))
  .filter(u => !isNoindex(path.join(ROOT, u)))
  .sort();

// Pair EN/AR mirrors
const enPages = files.filter(u => !u.startsWith('ar/'));
const arMirrors = new Set(files.filter(u => u.startsWith('ar/')).map(u => u.slice(3)));

const today = new Date().toISOString().slice(0, 10);
function lastmod(file) {
  try {
    const m = fs.statSync(path.join(ROOT, file)).mtime;
    return m.toISOString().slice(0, 10);
  } catch { return today; }
}

const urls = [];
for (const en of enPages) {
  const enUrl = `${SITE}/${en}`;
  const lm   = lastmod(en);
  const hasAr = arMirrors.has(en);
  const arUrl = hasAr ? `${SITE}/ar/${en}` : null;

  const links = [
    `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />`,
  ];
  if (arUrl) links.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />`);
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />`);

  urls.push(
`  <url>
    <loc>${enUrl}</loc>
    <lastmod>${lm}</lastmod>
${links.join('\n')}
  </url>`
  );

  if (arUrl) {
    const arLm = lastmod('ar/' + en);
    urls.push(
`  <url>
    <loc>${arUrl}</loc>
    <lastmod>${arLm}</lastmod>
${links.join('\n')}
  </url>`
    );
  }
}

// Add Arabic-only pages (no EN mirror)
for (const ar of files.filter(u => u.startsWith('ar/'))) {
  const enSlug = ar.slice(3);
  if (enPages.includes(enSlug)) continue; // already paired
  const arUrl = `${SITE}/${ar}`;
  urls.push(
`  <url>
    <loc>${arUrl}</loc>
    <lastmod>${lastmod(ar)}</lastmod>
    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${arUrl}" />
  </url>`
  );
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`Sitemap regenerated. ${urls.length} <url> entries.`);
console.log(`EN pages: ${enPages.length}, AR mirrors: ${arMirrors.size}, AR-only: ${files.filter(u => u.startsWith('ar/') && !enPages.includes(u.slice(3))).length}`);
