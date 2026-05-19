// One-shot: rename the nav label "Insights" to "Blog" across every HTML page.
// Only touches the exact pattern `>Insights</a>` so it can't accidentally
// rewrite body content (e.g. "Editorial Insights" inside an article).
// AR pages use a different word so they are left alone.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '.cache', 'dist', 'ar']);

function* walkHtml(dir) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (n.isDirectory()) { if (!SKIP.has(n.name)) yield* walkHtml(path.join(dir, n.name)); }
    else if (n.isFile() && n.name.endsWith('.html')) yield path.join(dir, n.name);
  }
}

let changed = 0, hits = 0;
for (const f of walkHtml(ROOT)) {
  const t = fs.readFileSync(f, 'utf8');
  const next = t.replace(/>Insights<\/a>/g, '>Blog</a>');
  if (next !== t) {
    const n = t.match(/>Insights<\/a>/g).length;
    fs.writeFileSync(f, next, 'utf8');
    console.log(`patch ${path.relative(ROOT, f).padEnd(42)} ${n} hit(s)`);
    changed++;
    hits += n;
  }
}
console.log(`---\n${changed} files patched, ${hits} occurrences renamed`);
