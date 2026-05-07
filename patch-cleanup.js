// Cleanup patcher: fix broken <img /> syntax, replace SVG logo with HTML, cache-bust to v=6.
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

var V = '18';

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;

  // 1. FIX BROKEN <img ... / attr="x" attr="y"> → <img ... attr="x" attr="y" />
  html = html.replace(/<img([^>]*?)\s*\/\s+(loading="[^"]*"\s+fetchpriority="[^"]*"\s+decoding="[^"]*")\s*>/g,
    '<img$1 $2 />');
  html = html.replace(/<img([^>]*?)\s*\/\s+(loading="[^"]*"\s+decoding="[^"]*")\s*>/g,
    '<img$1 $2 />');
  // Catch any remaining `/ loading=` orphans
  html = html.replace(/<img([^>]*?)\s*\/\s+(loading="[^"]*")/g, '<img$1 $2');
  html = html.replace(/<img([^>]+?)\s+(loading="[^"]+"[^>]*?)>/g, function (m) {
    return m.replace(/\s+\/\s+/, ' ').replace(/\s{2,}/g, ' ');
  });

  // 2. Replace the SVG image logo with a clean HTML+CSS wordmark.
  // Both header anchor and footer div variants.
  var htmlLogo =
    '<span class="logo__mark" aria-hidden="true"><i></i></span>' +
    '<span class="logo__word">KANAAN<span class="logo__dot">.</span></span>' +
    '<span class="logo__sub">Gents Salon &amp; Spa</span>';

  // Header anchor that currently contains the SVG img
  html = html.replace(/<a([^>]*?)class="logo logo--img"([^>]*)>\s*<img[^>]*\/?>\s*<\/a>/g,
    '<a$1class="logo logo--text"$2>' + htmlLogo + '</a>');
  // Footer div that currently contains the SVG img
  html = html.replace(/<div class="logo logo--img">\s*<img[^>]*\/?>\s*<\/div>/g,
    '<div class="logo logo--text">' + htmlLogo + '</div>');

  // 3. Cache-bust motion assets
  html = html.replace(/(assets\/css\/motion\.css)(\?v=\d+)?/g, '$1?v=' + V);
  html = html.replace(/(assets\/js\/motion\.js)(\?v=\d+)?/g, '$1?v=' + V);

  // 4. Strip duplicate `&amp;fm=webp` errors (defensive)
  html = html.replace(/&amp;fm=webp/g, '&fm=webp');

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
      console.log('cleaned', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache-bust: v=' + V);
