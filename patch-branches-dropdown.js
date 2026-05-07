// Patch all HTML files: replace the static "Branches" nav link with a dropdown
// that lists all 10 branches grouped by city. EN + AR. Idempotent.
const fs = require('fs');
const path = require('path');

const branches = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'branches.json'), 'utf8')).branches;

function group(items, fn) {
  return items.reduce(function (acc, it) {
    var k = fn(it);
    (acc[k] = acc[k] || []).push(it);
    return acc;
  }, {});
}

function isAlAin(b) { return /Al Ain|العين/.test(b.area_en + ' ' + b.area_ar); }
function abuDhabi(b) { return !isAlAin(b); }

function buildPanel(lang, prefix) {
  var ad = branches.filter(abuDhabi);
  var aa = branches.filter(isAlAin);
  function row(b) {
    var name = lang === 'ar' ? b.name_ar : b.name_en;
    var typeLabel = lang === 'ar'
      ? ({ Spa: 'سبا', Barber: 'حلاقة', VIP: 'VIP', Standard: '' })[b.type]
      : ({ Spa: 'Spa', Barber: 'Barber', VIP: 'VIP', Standard: '' })[b.type];
    var typeBadge = typeLabel ? '<span class="nav-dd__type">' + typeLabel + '</span>' : '';
    return '<li><a href="' + prefix + 'branches/' + b.id + '.html"><span>' + name + '</span>' + typeBadge + '</a></li>';
  }
  var adTitle = lang === 'ar' ? 'أبوظبي' : 'Abu Dhabi';
  var aaTitle = lang === 'ar' ? 'العين' : 'Al Ain';
  var allLabel = lang === 'ar' ? 'كل الفروع ←' : 'View all branches →';
  var countLabel = lang === 'ar' ? '١٠ بيوت · معيار واحد' : '10 houses · One standard';
  return '<div class="nav-dd__panel">' +
    '<div class="nav-dd__col"><h6>' + adTitle + '</h6><ul>' + ad.map(row).join('') + '</ul></div>' +
    '<div class="nav-dd__col"><h6>' + aaTitle + '</h6><ul>' + aa.map(row).join('') + '</ul></div>' +
    '<div class="nav-dd__foot"><a href="' + prefix + 'branches.html">' + allLabel + '</a><span>' + countLabel + '</span></div>' +
  '</div>';
}

function buildMobilePanel(lang, prefix) {
  return branches.map(function (b) {
    var name = lang === 'ar' ? b.name_ar : b.name_en;
    return '<a href="' + prefix + 'branches/' + b.id + '.html">' + name + '</a>';
  }).join('');
}

function patchHtml(file) {
  var html = fs.readFileSync(file, 'utf8');
  if (html.includes('class="nav-dd"')) return false; // already patched
  var rel = path.relative(__dirname, file).replace(/\\/g, '/');
  var isAr = rel.startsWith('ar/');
  var lang = isAr ? 'ar' : 'en';
  // Determine the path prefix that links inside the dropdown should use, matching how
  // sibling nav links resolve in this file. We do this by inspecting an existing nav <a>.
  var navMatch = html.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/);
  if (!navMatch) return false;
  var navInner = navMatch[1];
  // Pull prefix from the existing "Branches" or "Home" link
  var firstHref = (navInner.match(/href="([^"]*)(?:branches\.html|index\.html)"/) || [])[1] || '';
  var prefix = firstHref; // e.g. '', '../', '../../'
  // Build dropdown
  var label = isAr ? 'الفروع' : 'Branches';
  var panel = buildPanel(lang, prefix);
  var dropdown = '<div class="nav-dd"><button class="nav-dd__trigger" type="button">' + label + ' <i class="nav-dd__caret" aria-hidden="true"></i></button>' + panel + '</div>';
  // Replace "<a ...>Branches</a>" (or AR equivalent) inside .main-nav
  var labelRe = isAr
    ? /<a[^>]*>\s*الفروع\s*<\/a>/
    : /<a[^>]*>\s*Branches\s*<\/a>/;
  var newNavInner = navInner.replace(labelRe, dropdown);
  if (newNavInner === navInner) return false;
  html = html.replace(navInner, newNavInner);

  // Mobile nav: replace the same "Branches" link with an accordion
  var mobMatch = html.match(/<nav class="mobile-nav"[^>]*>([\s\S]*?)<\/nav>/);
  if (mobMatch) {
    var mobInner = mobMatch[1];
    var mobPanel = buildMobilePanel(lang, prefix);
    var mobAccordion = '<div class="nav-dd-m"><button class="nav-dd-m__head" type="button">' + label + ' <i class="nav-dd__caret" aria-hidden="true"></i></button><div class="nav-dd-m__panel">' + mobPanel + '</div></div>';
    var newMobInner = mobInner.replace(labelRe, mobAccordion);
    if (newMobInner !== mobInner) html = html.replace(mobInner, newMobInner);
  }

  // Inject nav-dropdown.js once before </body> if not present
  if (!html.includes('nav-dropdown.js')) {
    var jsSrc = (prefix || '') + 'assets/js/nav-dropdown.js';
    html = html.replace(/<\/body>/, '  <script src="' + jsSrc + '" defer></script>\n</body>');
  }

  fs.writeFileSync(file, html);
  return true;
}

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

var files = walk(__dirname);
var touched = 0;
files.forEach(function (f) {
  try {
    if (patchHtml(f)) {
      touched++;
      console.log('patched', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files patched.');
