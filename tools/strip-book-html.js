#!/usr/bin/env node
/**
 * Strip remaining `book.html` references in Quick-Book widgets, menu pickers,
 * and search index, plus the `kanaanspa.ae/./` artifact in sitemap.xml.
 *
 * Run after clean-urls.js — picks up things that script missed because they
 * appeared in inline JS string literals where the matcher was too narrow.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const replacements = [
  [/window\.location\.href='book\.html\?'/g, "window.location.href='book?'"],
  [/window\.location\.href='\.\.\/book\.html\?'/g, "window.location.href='../book?'"],
  [/'book\.html\?service='/g, "'book?service='"],
  [/u: 'book\.html'/g, "u: 'book'"],
  [/href="book\.html"/g, 'href="book"'],
  [/href="\.\.\/book\.html"/g, 'href="../book"'],
  // Sitemap artifact
  [/https:\/\/kanaanspa\.ae\/\.\//g, 'https://kanaanspa.ae/'],
];

const files = [
  'index.html', 'menu.html', 'search.html', 'sitemap.xml',
  'ar/index.html', 'ar/menu.html', 'ar/search.html', 'ar/book.html',
  'branches/al-ain.html', 'branches/khalidiya.html', 'branches/khalifa-city.html',
  'branches/baniyas-spa.html', 'branches/baniyas-barber.html',
  'branches/rabdan.html', 'branches/old-shahamah.html', 'branches/new-shahamah.html',
  'branches/muroor.html', 'branches/vip-muroor.html',
  'admin/integrations.html'
];

let totalChanged = 0;
for (const rel of files) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.warn('skip (missing):', rel); continue; }
  let c = fs.readFileSync(p, 'utf8');
  const orig = c;
  for (const [pat, repl] of replacements) c = c.replace(pat, repl);
  if (c !== orig) {
    fs.writeFileSync(p, c, 'utf8');
    console.log('updated', rel);
    totalChanged++;
  }
}
console.log('\nTotal files changed:', totalChanged);
