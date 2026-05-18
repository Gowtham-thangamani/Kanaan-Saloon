// One-shot: fix the ' / />' artifact introduced by perf-fix-pages.js's
// preload regex (it captured the trailing self-close slash inside the
// "inner" attribute group, then re-emitted ' />' on top of it).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'admin', '.cache', 'dist']);

function* walkHtml(dir) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (n.isDirectory()) { if (!SKIP.has(n.name)) yield* walkHtml(path.join(dir, n.name)); }
    else if (n.isFile() && n.name.endsWith('.html')) yield path.join(dir, n.name);
  }
}

let changed = 0;
for (const f of walkHtml(ROOT)) {
  const t = fs.readFileSync(f, 'utf8');
  const fixed = t.replace(/ \/ \/>/g, ' />');
  if (fixed !== t) { fs.writeFileSync(f, fixed, 'utf8'); changed++; console.log('fix', path.relative(ROOT, f)); }
}
console.log(`---\n${changed} files fixed`);
