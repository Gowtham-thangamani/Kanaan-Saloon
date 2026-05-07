// Patch all HTML files: inject motion.css + motion.js, and tag elements with
// data-reveal / data-split / data-hover-zoom / data-parallax. Idempotent.
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
  // Reuse existing assets href to determine relative depth
  var html = fs.readFileSync(file, 'utf8');
  var m = html.match(/href="([^"]*?)assets\/css\/style\.css"/);
  return m ? m[1] : '';
}

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;
  var prefix = relPrefix(file);

  // 1. Inject motion.css after style.css if missing
  if (!html.includes('motion.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="[^"]*assets\/css\/style\.css"[^>]*>)/,
      '$1\n  <link rel="stylesheet" href="' + prefix + 'assets/css/motion.css" />'
    );
  }
  // 1b. Inline pre-paint script: set .motion-ready before first paint to avoid flash.
  // Honours prefers-reduced-motion by NOT pre-hiding (CSS handles fallback).
  if (!html.includes('motion-pre-paint')) {
    var inline = '\n  <script id="motion-pre-paint">(function(){if(!window.matchMedia||!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("motion-ready");}})();</script>';
    html = html.replace(/(<link rel="stylesheet" href="[^"]*assets\/css\/motion\.css"[^>]*>)/, '$1' + inline);
  }
  // 2. Inject motion.js before </body> if missing
  if (!html.includes('motion.js')) {
    html = html.replace(/<\/body>/, '  <script src="' + prefix + 'assets/js/motion.js" defer></script>\n</body>');
  }

  // 3. Tag section heads → fade-up
  html = html.replace(/<div class="section-head([^"]*)"(?![^>]*data-reveal)/g, '<div class="section-head$1" data-reveal="up"');

  // 4. Hero & page-hero media → mask reveal (run only if not yet tagged)
  html = html.replace(/<div class="hero__media"(?![^>]*data-reveal)/g, '<div class="hero__media" data-reveal="mask"');
  html = html.replace(/<div class="page-hero__media"(?![^>]*data-reveal)/g, '<div class="page-hero__media" data-reveal="mask"');

  // 4a. Banner images → dramatic parallax (deeper push)
  html = html.replace(/<div class="hero__media([^"]*)"((?![^>]*data-parallax)[^>]*)>/g, '<div class="hero__media$1"$2 data-parallax="bg" data-speed="0.30">');
  html = html.replace(/<div class="page-hero__media([^"]*)"((?![^>]*data-parallax)[^>]*)>/g, '<div class="page-hero__media$1"$2 data-parallax="bg" data-speed="0.28">');

  // 4b. Mid-page section images → soft drift parallax
  html = html.replace(/<div class="split__media([^"]*)"((?![^>]*data-parallax)[^>]*)>/g, '<div class="split__media$1"$2 data-parallax="bg" data-speed="0.12">');

  // 4c. Hero & page-hero eyebrow → visible text parallax (counter-drift)
  html = html.replace(/(<div class="hero__content[\s\S]*?)<span class="eyebrow"((?![^>]*data-parallax)[^>]*)>/g, '$1<span class="eyebrow"$2 data-parallax="text" data-speed="0.18">');
  html = html.replace(/(<div class="page-hero__content[\s\S]*?)<span class="eyebrow"((?![^>]*data-parallax)[^>]*)>/g, '$1<span class="eyebrow"$2 data-parallax="text" data-speed="0.16">');

  // 4d. Section-head eyebrows + section titles → subtle parallax
  html = html.replace(/(<div class="section-head[^"]*"[^>]*>\s*)<span class="eyebrow"((?![^>]*data-parallax)[^>]*)>/g, '$1<span class="eyebrow"$2 data-parallax="text" data-speed="0.10">');
  html = html.replace(/<h2 class="section-head__title([^"]*)"((?![^>]*data-parallax)[^>]*)>/g, '<h2 class="section-head__title$1"$2 data-parallax="text" data-speed="0.06">');

  // 4e. Display-2 inline headings (cta-band, etc.)
  html = html.replace(/<h2 class="cta-band__title([^"]*)"((?![^>]*data-parallax)[^>]*)>/g, '<h2 class="cta-band__title$1"$2 data-parallax="text" data-speed="0.08">');

  // 5. Split media → scale reveal
  html = html.replace(/<div class="split__media"(?![^>]*data-reveal)/g, '<div class="split__media" data-reveal="scale"');

  // 6. Hero / page-hero titles → split lines
  html = html.replace(/<h1 class="hero__title"(?![^>]*data-split)/g, '<h1 class="hero__title" data-split="lines"');
  html = html.replace(/<h1 class="page-hero__title"(?![^>]*data-split)/g, '<h1 class="page-hero__title" data-split="lines"');

  // 7. Lede paragraphs that follow hero/section heads → fade-up (limit to those without existing reveal)
  html = html.replace(/<p class="lede"(?![^>]*data-reveal)/g, '<p class="lede" data-reveal="up"');

  // 8. Card grids (offers, services, branches) → stagger
  html = html.replace(/<div class="grid grid-3"(?![^>]*data-reveal)/g, '<div class="grid grid-3" data-reveal-stagger');
  html = html.replace(/<div class="grid grid-4"(?![^>]*data-reveal)/g, '<div class="grid grid-4" data-reveal-stagger');

  // 9. Gallery thumbs (anchors with image children inside common containers) → hover zoom + fade-in
  // Tag offer-card / service-card / branch-card media containers as hover-zoom
  html = html.replace(/<div class="offer-card__media"(?![^>]*data-hover-zoom)/g, '<div class="offer-card__media" data-hover-zoom');
  html = html.replace(/<div class="service-card__media"(?![^>]*data-hover-zoom)/g, '<div class="service-card__media" data-hover-zoom');
  html = html.replace(/<div class="branch-card__media"(?![^>]*data-hover-zoom)/g, '<div class="branch-card__media" data-hover-zoom');
  html = html.replace(/<div class="split__media"(?![^>]*data-hover-zoom)/g, '<div class="split__media" data-hover-zoom');

  // 10. CTA bands → fade-in
  html = html.replace(/<section class="cta-band"(?![^>]*data-reveal)/g, '<section class="cta-band" data-reveal="up"');

  // 11. Stats (trust strip numerals) — opt-in counter on .trust-strip__num if present
  html = html.replace(/<span class="trust-strip__num"(?![^>]*data-count-to)>(\d+)/g, '<span class="trust-strip__num" data-count-to="$1">0');

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
      console.log('motion-patched', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated.');
