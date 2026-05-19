// One-shot: wrap the post-hero content of each editable page in
//   <div data-page-body> ... </div>
// so the runtime can replace it with admin overrides from public.pages.
//
// Strategy: find the FIRST `</section>` that closes a <section class="page-hero">,
// insert <div data-page-body> after it, and insert </div> before </main>.
//
// Skipped: admin/, ar/, lp/, 404.html, thank-you.html, _post.html, search.html,
//   plus index.html (homepage uses class="hero" not "page-hero" — Phase D).
//
// Re-runnable: if the marker is already present anywhere in the file we skip.

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS  = new Set(['node_modules', '.git', 'admin', 'ar', 'lp', '.cache', 'dist']);
const SKIP_FILES = new Set(['404.html', 'thank-you.html', 'search.html', 'reset.html', 'index.html']);

function* walkHtml(dir) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (n.isDirectory()) { if (!SKIP_DIRS.has(n.name)) yield* walkHtml(path.join(dir, n.name)); }
    else if (n.isFile() && n.name.endsWith('.html') && !SKIP_FILES.has(n.name)) {
      yield path.join(dir, n.name);
    }
  }
}

let changed = 0, skipped = 0;
for (const f of walkHtml(ROOT)) {
  const rel = path.relative(ROOT, f);
  let txt = fs.readFileSync(f, 'utf8');
  if (/data-page-body/.test(txt)) { console.log(`skip  ${rel} (already marked)`); skipped++; continue; }

  // Find <section class="..page-hero..">...</section> and inject after its </section>.
  // Anchor match on the closest </section> after the opening tag — done by counting.
  const openRe = /<section\b[^>]*\bclass="[^"]*\bpage-hero\b[^"]*"[^>]*>/i;
  const openMatch = openRe.exec(txt);
  if (!openMatch) { console.log(`skip  ${rel} (no page-hero section)`); skipped++; continue; }

  // Walk forward from the opening tag, counting nested <section>/</section>.
  let i = openMatch.index + openMatch[0].length;
  let depth = 1;
  const tagRe = /<\/?section\b[^>]*>/gi;
  tagRe.lastIndex = i;
  let m;
  let closeEnd = -1;
  while ((m = tagRe.exec(txt))) {
    if (m[0][1] === '/') { depth--; if (depth === 0) { closeEnd = m.index + m[0].length; break; } }
    else depth++;
  }
  if (closeEnd < 0) { console.log(`skip  ${rel} (unbalanced section)`); skipped++; continue; }

  // Insert opener after the page-hero's closing tag.
  txt = txt.slice(0, closeEnd) + '\n  <div data-page-body>' + txt.slice(closeEnd);

  // Insert closer before the LAST </main>, or — for pages that don't use <main> —
  // before the opening <footer class="site-footer">.
  let endIdx = txt.lastIndexOf('</main>');
  if (endIdx < 0) endIdx = txt.search(/<footer\b[^>]*\bclass="[^"]*\bsite-footer\b/i);
  if (endIdx < 0) { console.log(`skip  ${rel} (no </main> and no site-footer)`); skipped++; continue; }
  txt = txt.slice(0, endIdx) + '</div>\n  ' + txt.slice(endIdx);

  fs.writeFileSync(f, txt, 'utf8');
  console.log(`wrap  ${rel}`);
  changed++;
}
console.log(`---\n${changed} files wrapped, ${skipped} skipped`);
