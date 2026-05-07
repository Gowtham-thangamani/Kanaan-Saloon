// Replace Google Fonts <link> + preconnects with local fonts.css across all HTML.
// Cache-bust to v=13. Idempotent.
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

var V = '13';

function relPrefix(file) {
  var html = fs.readFileSync(file, 'utf8');
  var m = html.match(/href="([^"]*?)assets\/css\/style\.css"/);
  return m ? m[1] : '';
}

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;
  var prefix = relPrefix(file);
  var localFonts = '<link rel="stylesheet" href="' + prefix + 'assets/css/fonts.css" />';

  // 1. Remove Google Fonts <link> tags (the css2 import)
  html = html.replace(/\s*<link[^>]+fonts\.googleapis\.com\/css2[^>]*>\s*/g, '\n  ');
  // 2. Remove the gstatic preconnect (no longer needed)
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '\n  ');
  // 3. Remove the googleapis preconnect (no longer needed)
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*>\s*/g, '\n  ');
  // 4. Insert local fonts.css link if missing — before style.css for proper cascade
  if (!html.includes('assets/css/fonts.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="[^"]*assets\/css\/style\.css"[^>]*>)/,
      localFonts + '\n  $1'
    );
  }

  // 5. Cache-bust motion assets
  html = html.replace(/(assets\/css\/motion\.css)(\?v=\d+)?/g, '$1?v=' + V);
  html = html.replace(/(assets\/js\/motion\.js)(\?v=\d+)?/g, '$1?v=' + V);

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
      console.log('self-host fonts', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache: v=' + V);
