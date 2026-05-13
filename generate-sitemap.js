// Generates sitemap.xml from all .html files in the project (excluding thank-you/404).
// Run with: node generate-sitemap.js
const fs = require('fs');
const path = require('path');

const SITE = 'https://kanaanspa.ae';
const root = __dirname;
const exclude = ['thank-you.html', '404.html', 'ar/thank-you.html', 'ar/404.html'];
// Directories never indexed (admin panel, build artifacts, supabase code).
const SKIP_DIRS = ['node_modules', '.playwright-mcp', 'assets', 'admin', 'supabase', '.git', '.claude'];

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory() && !SKIP_DIRS.includes(name)) walk(p, files);
    else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

const files = walk(root)
  .map(f => path.relative(root, f).replace(/\\/g, '/'))
  .filter(f => !exclude.includes(f))
  .filter(f => !f.startsWith('admin/') && !f.startsWith('supabase/'))
  .sort();

const enFiles = files.filter(f => !f.startsWith('ar/'));
const arFiles = files.filter(f => f.startsWith('ar/'));

const today = new Date().toISOString().split('T')[0];

const urls = enFiles.map(f => {
  const enPath = '/' + f;
  const arPath = '/ar/' + f;
  const hasAr = arFiles.includes('ar/' + f);
  let xhtml = `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${enPath}"/>`;
  if (hasAr) xhtml += `\n    <xhtml:link rel="alternate" hreflang="ar" href="${SITE}${arPath}"/>`;
  xhtml += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${enPath}"/>`;
  return `  <url>
    <loc>${SITE}${enPath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${f === 'index.html' ? '1.0' : f.startsWith('branches/') ? '0.9' : '0.7'}</priority>
${xhtml}
  </url>`;
}).concat(arFiles.map(f => `  <url>
    <loc>${SITE}/${f}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`Generated sitemap.xml with ${enFiles.length + arFiles.length} URLs.`);
