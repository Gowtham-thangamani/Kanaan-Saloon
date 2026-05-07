// Add data-scroll-text to lede paragraphs and select large editorial copy
// so they get the word-by-word scroll-driven lighting effect. Idempotent.
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

var V = '9';

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;

  // Apply to .section-head__lede (intro paragraphs of sections) — dark theme on dark bg
  html = html.replace(/<p class="section-head__lede([^"]*)"((?![^>]*data-scroll-text)[^>]*)>/g,
    '<p class="section-head__lede$1"$2 data-scroll-text>');

  // Apply to .lede paragraphs OUTSIDE the hero (hero already has split-line treatment)
  // Heuristic: only the lede paragraphs that aren't immediate hero/page-hero children.
  // We pick those NOT followed within ~120 chars by hero__cta or page-hero__media.
  // Easier: tag every .lede that isn't already tagged AND isn't inside hero__content/page-hero__content.
  // We check by ensuring there's no `hero__content` or `page-hero__content` opening tag in the prior 2KB.
  html = html.replace(/<p class="lede([^"]*)"((?![^>]*data-scroll-text)[^>]*)>/g, function (match, cls, rest, offset, full) {
    var window = full.slice(Math.max(0, offset - 2000), offset);
    if (/class="(hero|page-hero)__content/.test(window) && !/<\/section>/.test(window.slice(window.lastIndexOf('class="')))) {
      // inside hero/page-hero — skip
      return match;
    }
    return '<p class="lede' + cls + '"' + rest + ' data-scroll-text>';
  });

  // Apply to .cta-band__sub (subtitle text in CTA bands)
  html = html.replace(/<p class="cta-band__sub([^"]*)"((?![^>]*data-scroll-text)[^>]*)>/g,
    '<p class="cta-band__sub$1"$2 data-scroll-text>');

  // Cache-bust to v=9
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
      console.log('scroll-text', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache: v=' + V);
