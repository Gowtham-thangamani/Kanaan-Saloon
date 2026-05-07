// Boost parallax speeds across all pages so the effect is undeniably visible.
// Cache-bust to v=10.
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

var V = '11';

// Boost map: matches existing speed → new (more dramatic) speed
var SPEED_BOOSTS = [
  // Banner images
  ['data-parallax="bg" data-speed="0.30"', 'data-parallax="bg" data-speed="0.50"'],
  ['data-parallax="bg" data-speed="0.28"', 'data-parallax="bg" data-speed="0.45"'],
  ['data-parallax="bg" data-speed="0.18"', 'data-parallax="bg" data-speed="0.50"'],
  ['data-parallax="bg" data-speed="0.12"', 'data-parallax="bg" data-speed="0.25"'],
  // Text — eyebrows
  ['data-parallax="text" data-speed="0.18"', 'data-parallax="text" data-speed="0.35"'],
  ['data-parallax="text" data-speed="0.16"', 'data-parallax="text" data-speed="0.32"'],
  ['data-parallax="text" data-speed="0.10"', 'data-parallax="text" data-speed="0.22"'],
  ['data-parallax="text" data-speed="0.08"', 'data-parallax="text" data-speed="0.18"'],
  ['data-parallax="text" data-speed="0.06"', 'data-parallax="text" data-speed="0.15"'],
];

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;

  SPEED_BOOSTS.forEach(function (pair) {
    html = html.split(pair[0]).join(pair[1]);
  });

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
      console.log('boosted', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache: v=' + V);
