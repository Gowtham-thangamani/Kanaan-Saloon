#!/usr/bin/env node
/**
 * Add an "Insights" link (EN) / "المقالات" link (AR) to the main + mobile nav
 * on every HTML page that has the header pattern but not the link yet.
 *
 * Insertion point: right before the Contact link, so order becomes
 *   HOME · ABOUT · OFFERS · BRANCHES & SERVICES · GALLERY · INSIGHTS · CONTACT
 *
 * Idempotent: re-running skips pages that already have an `<a href=".../blog">`
 * in the nav.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.html$/i.test(e.name)) out.push(f);
  }
  return out;
}

// Two-step insertion: match `<a href="<prefix>contact">Contact</a>` and
// prepend the Insights anchor with the same prefix.
//
// EN — capture group 1 is the optional "../" prefix.
const EN_NAV_REGEX  = /<a href="(\.\.\/)?contact">Contact<\/a>/g;
const EN_INSERTION  = (m, prefix) => `<a href="${prefix || ''}blog">Insights</a>${m}`;

// AR — Contact is "تواصل" (or similar). The AR pages have the same prefix
// rules but the inner text is Arabic. Insights = المقالات (articles).
const AR_NAV_REGEX  = /<a href="(\.\.\/)?contact">تواصل<\/a>/g;
const AR_INSERTION  = (m, prefix) => `<a href="${prefix || ''}blog">المقالات</a>${m}`;

let touched = 0;
const log = [];

for (const f of walk(ROOT)) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  const isAr = /\bar[\\/]/.test(path.relative(ROOT, f));

  // Skip if the nav already mentions blog/Insights. We only check inside
  // the first <header> or .main-nav to avoid skipping pages that mention
  // blog only in the footer.
  const headEnd = c.indexOf('</header>');
  if (headEnd > 0) {
    const headerChunk = c.slice(0, headEnd);
    if (/<a href="[^"]*blog"[^>]*>[^<]*<\/a>/i.test(headerChunk)) continue;
  }

  if (isAr) {
    c = c.replace(AR_NAV_REGEX, AR_INSERTION);
  } else {
    c = c.replace(EN_NAV_REGEX, EN_INSERTION);
  }

  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    touched++;
    log.push('  ' + path.relative(ROOT, f));
  }
}

console.log(log.slice(0, 30).join('\n'));
if (log.length > 30) console.log('  ... and', log.length - 30, 'more');
console.log('\nTouched', touched, 'files');
