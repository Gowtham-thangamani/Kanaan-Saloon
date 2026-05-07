// Banner fix: remove data-reveal="mask" from .hero__media and .page-hero__media
// (keep data-parallax for scroll motion). Mask was hiding banner images on slow loads.
// Cache-bust to v=8.
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

var V = '8';

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;

  // Remove data-reveal="mask" from hero/page-hero media (keeps parallax)
  html = html.replace(/(<div class="hero__media[^"]*"[^>]*?)\s*data-reveal="mask"/g, '$1');
  html = html.replace(/(<div class="page-hero__media[^"]*"[^>]*?)\s*data-reveal="mask"/g, '$1');

  // Cache-bust motion assets
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
      console.log('banner-fix', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache: v=' + V);
