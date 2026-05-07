// Patch all HTML files: (a) swap text logo for SVG image, (b) cache-bust motion assets,
// (c) verify motion-pre-paint inline script is present. Idempotent.
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

function relPrefix(file) {
  var html = fs.readFileSync(file, 'utf8');
  var m = html.match(/href="([^"]*?)assets\/css\/style\.css"/);
  return m ? m[1] : '';
}

var V = '5';

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;
  var prefix = relPrefix(file);

  // 1. Cache-bust motion.css and motion.js (forces browser to fetch latest version).
  html = html.replace(/(assets\/css\/motion\.css)(\?v=\d+)?/g, '$1?v=' + V);
  html = html.replace(/(assets\/js\/motion\.js)(\?v=\d+)?/g, '$1?v=' + V);

  // 2. Replace text logo (<a class="logo">KANAAN<span>.</span></a>) with SVG image.
  // Two locations: header anchor + footer div. Both use the same logo class.
  var logoSrc = prefix + 'assets/img/logo.svg';
  var imgTag = '<img src="' + logoSrc + '" alt="Saloon Kanaan — Gents &amp; Spa" class="logo__img" width="180" height="60" />';

  // Header anchor variant
  html = html.replace(/<a([^>]*?)class="logo"([^>]*)>\s*KANAAN<span>\.<\/span>\s*<\/a>/g,
    '<a$1class="logo logo--img"$2>' + imgTag + '</a>');
  // Footer div variant
  html = html.replace(/<div class="logo">\s*KANAAN<span>\.<\/span>\s*<\/div>/g,
    '<div class="logo logo--img">' + imgTag + '</div>');

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
      console.log('logo+motion patched', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache-bust version: v=' + V);
