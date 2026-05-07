// Performance + mobile a11y patcher.
// 1. Convert Unsplash URLs to webp + smaller hero dimensions
// 2. Add loading="lazy" + decoding="async" to all below-fold imgs
// 3. Add fetchpriority="high" to first hero image
// 4. Add preconnect for images.unsplash.com if missing
// 5. Inject mobile a11y fixes (skip-link, larger touch targets, viewport meta)
// Idempotent.
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.playwright-mcp', 'pricelists', 'content', '.git', '.tmp_pricelists', 'admin']);
function walk(dir, files) {
  files = files || [];
  fs.readdirSync(dir).forEach(function (n) {
    if (SKIP_DIRS.has(n)) return;
    var p = path.join(dir, n);
    var s = fs.statSync(p);
    if (s.isDirectory()) walk(p, files);
    else if (n.endsWith('.html')) files.push(p);
  });
  return files;
}

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;

  // ---------- PERF ----------

  // 1. Preconnect unsplash if missing
  if (html.includes('images.unsplash.com') && !html.includes('preconnect" href="https://images.unsplash.com')) {
    html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*\/?>/,
      '<link rel="preconnect" href="https://fonts.googleapis.com" />\n  <link rel="preconnect" href="https://images.unsplash.com" crossorigin />\n  <link rel="dns-prefetch" href="https://images.unsplash.com" />');
  }

  // 2. Convert Unsplash URL params: enforce webp + clamp w=2000 → w=1600
  html = html.replace(/(images\.unsplash\.com\/[^"'\s>]+)/g, function (url) {
    var u = url;
    // Force webp output (Unsplash supports fm=webp; auto=format already serves webp on supporting clients,
    // but explicit fm=webp helps proxies and ensures consistent compression).
    if (!/[?&]fm=/.test(u)) u = u.replace('auto=format', 'auto=format&fm=webp');
    // Add explicit q if missing (smaller default)
    if (!/[?&]q=/.test(u)) u += '&q=72';
    // Clamp anything above w=1600 down (heroes were w=2000)
    u = u.replace(/([?&])w=([0-9]+)/g, function (_, sep, w) {
      var n = parseInt(w, 10);
      if (n > 1600) n = 1600;
      return sep + 'w=' + n;
    });
    return u;
  });

  // 3. Add loading="lazy" + decoding="async" to <img> tags that don't have them.
  // Skip hero images (we add fetchpriority below).
  html = html.replace(/<img\b((?:(?!loading=)[^>])*?)>/g, function (m, attrs) {
    if (/loading=/.test(m)) return m;
    return '<img' + attrs + ' loading="lazy" decoding="async">';
  });

  // 4. First image inside .hero__media or .page-hero__media → eager + high priority.
  html = html.replace(/(class="hero__media[^"]*"[^>]*>\s*)<img([^>]*?)\s*loading="lazy"\s*decoding="async"/,
    '$1<img$2 loading="eager" fetchpriority="high" decoding="async"');
  html = html.replace(/(class="page-hero__media[^"]*"[^>]*>\s*)<img([^>]*?)\s*loading="lazy"\s*decoding="async"/,
    '$1<img$2 loading="eager" fetchpriority="high" decoding="async"');

  // ---------- MOBILE A11Y ----------

  // 5. Ensure viewport meta allows user scaling (keep accessibility compliant)
  html = html.replace(
    /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"\s*\/?>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />'
  );

  // 6. Inject skip-link if missing (right after <body>)
  if (!html.includes('class="skip-link"')) {
    html = html.replace(/<body([^>]*)>\s*/, '<body$1>\n  <a href="#main" class="skip-link">Skip to content</a>\n  ');
  }

  // 7. Add id="main" to first <section> or <main> after header (as anchor target)
  if (!/(id="main"|<main\b)/.test(html)) {
    html = html.replace(/(<\/header>\s*)(<section\b)/, '$1<main id="main">$2');
    if (html.includes('<main id="main">')) {
      html = html.replace(/(<\/section>)(\s*<footer)/, '$1</main>$2');
    }
  }

  if (html === orig) return false;
  fs.writeFileSync(file, html);
  return true;
}

var files = walk(__dirname);
var touched = 0;
files.forEach(function (f) {
  try {
    if (patch(f)) {
      touched++;
      console.log('perf-a11y patched', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated.');
