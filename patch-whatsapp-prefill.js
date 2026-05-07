// Add ?text= prefill to every wa.me/971... link based on page context.
// Branch detail pages → branch-specific message. Generic pages → generic.
// Idempotent — only updates links that have NO text param yet.
const fs = require('fs');
const path = require('path');

const branches = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'branches.json'), 'utf8')).branches;

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
  var rel = path.relative(__dirname, file).replace(/\\/g, '/');
  var isAr = rel.startsWith('ar/');

  // Determine page-specific context
  var branchId = null;
  var branchMatch = rel.match(/branches\/([a-z0-9-]+)\.html$/);
  if (branchMatch) branchId = branchMatch[1];
  var lpMatch = rel.match(/lp\/([a-z0-9-]+)-near-me\.html$/);
  if (lpMatch) branchId = lpMatch[1];

  var b = branches.find(function (x) { return x.id === branchId; });
  var page = rel.split('/').pop().replace('.html', '');

  function buildMessage() {
    if (b) {
      return isAr
        ? 'مرحباً كنعان، أرغب في الحجز في فرع ' + b.name_ar + '. الرجاء إعلامي بالأوقات المتاحة.'
        : 'Hi Kanaan, I\'d like to book at the ' + b.name_en + ' house. Please share available times.';
    }
    if (/contact/.test(page))   return isAr ? 'مرحباً كنعان، لدي استفسار.' : 'Hi Kanaan, I have a question.';
    if (/offers/.test(page))    return isAr ? 'مرحباً كنعان، أنا مهتم بأحد العروض الحالية. أي فرع تنصح؟' : 'Hi Kanaan, I\'m interested in one of your current offers. Which branch would you recommend?';
    if (/services/.test(page))  return isAr ? 'مرحباً كنعان، أرغب في حجز خدمة. الرجاء إعلامي بأقرب فرع وأوقات متاحة.' : 'Hi Kanaan, I\'d like to book a service. Please share nearest branch + available times.';
    if (/careers/.test(page))   return isAr ? 'مرحباً كنعان، أرغب في الانضمام إلى فريقكم.' : 'Hi Kanaan, I\'d like to apply to join your team.';
    if (/gift|voucher/.test(page)) return isAr ? 'مرحباً كنعان، أرغب في شراء قسيمة هدية.' : 'Hi Kanaan, I\'d like to purchase a gift voucher.';
    if (/corporate/.test(page))    return isAr ? 'مرحباً كنعان، أتواصل بشأن حساب شركة.' : 'Hi Kanaan, enquiring about a corporate account.';
    return isAr ? 'مرحباً كنعان، أرغب في الحجز. الرجاء إعلامي بأقرب فرع وأوقات متاحة.' : 'Hi Kanaan, I\'d like to book. Please share nearest branch + available times.';
  }

  var msg = encodeURIComponent(buildMessage());

  // Find every wa.me link that doesn't already have ?text= and add it.
  // Match: href="https://wa.me/971XXXXXXXXX" (no query) → add ?text=...
  html = html.replace(/href="(https:\/\/wa\.me\/[0-9]+)"(?![^>]*\?text)/g, function (m, url) {
    return 'href="' + url + '?text=' + msg + '"';
  });

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
      console.log('wa-prefill', path.relative(__dirname, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    console.error('skip', f, e.message);
  }
});
console.log('\n' + touched + ' files updated.');
