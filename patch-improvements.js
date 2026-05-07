// Master improvements patcher:
// 1. Inject quickbook.js + register service worker on every page
// 2. Add nav link "Compare" + footer links to gift-voucher, corporate
// 3. Cache-bust to v=12
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

var V = '12';

function relPrefix(file) {
  var html = fs.readFileSync(file, 'utf8');
  var m = html.match(/href="([^"]*?)assets\/css\/style\.css"/);
  return m ? m[1] : '';
}

function patch(file) {
  var html = fs.readFileSync(file, 'utf8');
  var orig = html;
  var prefix = relPrefix(file);
  var rel = path.relative(__dirname, file).replace(/\\/g, '/');

  // Skip the new pages that already include quickbook
  var isNew = /^(compare-branches|gift-voucher|corporate)\.html$/.test(rel);

  // 1. Inject quickbook.js before </body> if missing (skip admin / thank-you / lp)
  var skipQb = /(\/admin\/|thank-you|\/lp\/)/.test('/' + rel);
  if (!skipQb && !html.includes('quickbook.js')) {
    html = html.replace(/<\/body>/, '  <script src="' + prefix + 'assets/js/quickbook.js" defer></script>\n</body>');
  }

  // 2. Inject service worker registration (one-shot, before </body>)
  if (!html.includes('serviceWorker') && !html.includes('/sw.js')) {
    var swSnippet = '  <script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("' + prefix + 'sw.js").catch(function(){});});}</script>\n';
    html = html.replace(/<\/body>/, swSnippet + '</body>');
  }

  // 3. Cache-bust motion assets
  html = html.replace(/(assets\/css\/motion\.css)(\?v=\d+)?/g, '$1?v=' + V);
  html = html.replace(/(assets\/js\/motion\.js)(\?v=\d+)?/g, '$1?v=' + V);

  // 4. Add "Vouchers" + "Corporate" links to footer if a footer-bottom__links block exists
  if (html.includes('footer-bottom__links') && !html.includes('gift-voucher.html')) {
    html = html.replace(
      /(<div class="footer-bottom__links">)/,
      '$1<a href="' + prefix + 'gift-voucher.html">Gift Vouchers</a><a href="' + prefix + 'corporate.html">Corporate</a>'
    );
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
      console.log('improved', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated. Cache: v=' + V);
