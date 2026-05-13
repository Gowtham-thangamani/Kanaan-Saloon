#!/usr/bin/env node
/**
 * Full clean-URL migration:
 *   /about.html              -> /about
 *   /branches/al-ain.html    -> /branches/al-ain
 *   /index.html              -> /
 *   /ar/index.html           -> /ar/
 *
 * What it changes:
 *  1. Adds Apache rewrite rules to .htaccess (silent serve + 301 redirect)
 *  2. Updates every href="X.html" in HTML files (skipping external + anchor)
 *  3. Updates canonical / hreflang / og:url / twitter:url meta tags
 *  4. Updates sitemap.xml URLs
 *  5. Updates llms.txt URLs
 *  6. Updates JS URL builders in runtime.js / main.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile()) out.push(f);
  }
  return out;
}

// Helper: convert a URL/path that ends with .html to clean.
// Handles index.html specially.
function cleanHref(href) {
  // Don't touch external URLs, anchors, mailto, tel
  if (/^(https?:|mailto:|tel:|#|javascript:|wa\.me)/i.test(href)) {
    // For absolute kanaanspa.ae URLs only, allow the cleaner to run
    if (!/^https?:\/\/(www\.)?kanaanspa\.ae/i.test(href)) return href;
  }
  // Split off query/fragment
  const m = href.match(/^([^?#]*)(.*)$/);
  let pathPart = m[1];
  const tail = m[2];
  // index.html -> trailing slash (or empty for root)
  pathPart = pathPart.replace(/(^|\/)index\.html$/, '$1');
  // Other foo.html -> foo
  pathPart = pathPart.replace(/\.html$/, '');
  // If we collapsed "../index.html" to "../", that's already fine.
  // If we collapsed "index.html" to empty string, make it "./" (relative root).
  if (pathPart === '') pathPart = './';
  return pathPart + tail;
}

let totalChanges = 0;

// ============ 1. Update .htaccess ============
const htaccessPath = path.join(ROOT, '.htaccess');
let htaccess = fs.readFileSync(htaccessPath, 'utf8');
const cleanUrlMarker = '# === Clean URLs (added by tools/clean-urls.js) ===';
if (!htaccess.includes(cleanUrlMarker)) {
  htaccess = htaccess.trimEnd() + '\n\n' + cleanUrlMarker + '\n' + `<IfModule mod_rewrite.c>
  RewriteEngine On

  # 1. Redirect /foo/index.html  ->  /foo/   (and /index.html -> /)
  RewriteCond %{THE_REQUEST} \\s/+(.*/)?index\\.html[\\s?] [NC]
  RewriteRule ^ /%1 [R=301,L,NE]

  # 2. Redirect /foo.html  ->  /foo   (preserves query strings)
  RewriteCond %{THE_REQUEST} \\s/+([^\\s?]+?)\\.html[\\s?] [NC]
  RewriteRule ^ /%1 [R=301,L,NE]

  # 3. Internally serve /foo.html when /foo is requested and the file exists.
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME}.html -f
  RewriteRule ^(.+?)/?$ $1.html [L]
</IfModule>
` + '\n';
  fs.writeFileSync(htaccessPath, htaccess, 'utf8');
  console.log('Updated .htaccess with clean-URL rules.');
  totalChanges++;
}

// ============ 2. Update HTML files: hrefs + canonical + hreflang + og + twitter ============
const htmlFiles = walk(ROOT).filter(f => /\.html$/i.test(f));
let filesChanged = 0;

for (const file of htmlFiles) {
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;

  // href="X.html" or href="X.html?q=..." or href="X.html#frag"
  // Targets relative paths only (no leading https://)
  c = c.replace(/(\shref=")([^"]+\.html(?:\?[^"]*)?(?:#[^"]*)?)(")/gi,
    (match, p1, url, p3) => {
      const cleaned = cleanHref(url);
      return p1 + cleaned + p3;
    });

  // Absolute https://kanaanspa.ae/foo.html in canonical, hreflang, og:url, twitter:url
  c = c.replace(/(https:\/\/kanaanspa\.ae)\/([^"\s]+\.html(?:\?[^"\s]*)?(?:#[^"\s]*)?)/gi,
    (match, base, rest) => base + '/' + cleanHref(rest));

  // src="X.html" in iframes / etc. (rare but safe)
  c = c.replace(/(\ssrc=")([^"]+\.html(?:\?[^"]*)?(?:#[^"]*)?)(")/gi,
    (m, p1, url, p3) => p1 + cleanHref(url) + p3);

  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    filesChanged++;
  }
}
console.log(`Cleaned hrefs/canonical/hreflang in ${filesChanged} HTML files.`);
totalChanges += filesChanged;

// ============ 3. sitemap.xml ============
const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  let sm = fs.readFileSync(sitemapPath, 'utf8');
  const before = sm;
  sm = sm.replace(/(https:\/\/kanaanspa\.ae)\/([^<\s]+\.html)/gi,
    (m, base, rest) => base + '/' + cleanHref(rest));
  if (sm !== before) {
    fs.writeFileSync(sitemapPath, sm, 'utf8');
    console.log('Cleaned URLs in sitemap.xml.');
    totalChanges++;
  }
}

// ============ 4. llms.txt ============
const llmsPath = path.join(ROOT, 'llms.txt');
if (fs.existsSync(llmsPath)) {
  let lt = fs.readFileSync(llmsPath, 'utf8');
  const before = lt;
  // Match /foo.html or kanaanspa.ae/foo.html in plain text
  lt = lt.replace(/(\/|kanaanspa\.ae\/)([a-z0-9_\-\/]+\.html)/gi,
    (m, prefix, rest) => prefix + cleanHref(rest));
  if (lt !== before) {
    fs.writeFileSync(llmsPath, lt, 'utf8');
    console.log('Cleaned URLs in llms.txt.');
    totalChanges++;
  }
}

// ============ 5. JS URL builders ============
// runtime.js / main.js compute view_url and book_url with .html — strip them.
['assets/js/runtime.js', 'assets/js/main.js'].forEach(rel => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  let js = fs.readFileSync(p, 'utf8');
  const before = js;
  // Pattern: 'branches/' + b.id + '.html'   ->   'branches/' + b.id + ''
  // Pattern: 'book.html?' + ...             ->   'book?' + ...
  // Pattern: 'book.html'                    ->   'book'
  js = js.replace(/(['"`])([a-z][a-z0-9_\-\/]*?)\.html(['"`])/gi, '$1$2$3');
  // Strip ".html" right before "?" inside template-literal concatenations
  js = js.replace(/\.html(\?)/g, '$1');
  // Strip standalone literal ".html" (e.g. b.id + '.html'  -> b.id + '')
  js = js.replace(/(['"`])\.html\1/g, '$1$1');
  if (js !== before) {
    fs.writeFileSync(p, js, 'utf8');
    console.log(`Cleaned URLs in ${rel}.`);
    totalChanges++;
  }
});

console.log(`\nTotal changes: ${totalChanges}`);
console.log('\nNEXT STEP: hard-refresh and walk a few pages to verify all internal links resolve.');
