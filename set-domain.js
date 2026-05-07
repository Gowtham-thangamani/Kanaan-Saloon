// Replaces every occurrence of the placeholder domain across all files.
// Usage:  node set-domain.js example.com
// Replaces 'kanaanspa.ae' (and any current value) with the domain you pass.
const fs = require('fs');
const path = require('path');

const newDomain = (process.argv[2] || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
if (!newDomain) {
  console.error('Usage: node set-domain.js example.com');
  process.exit(1);
}

const root = __dirname;
const exts = new Set(['.html', '.xml', '.txt', '.json', '.md', '.js', '.css']);
let changed = 0;

function walk(dir) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (['node_modules', '.playwright-mcp', '.git'].includes(name)) return;
      walk(p);
    } else if (exts.has(path.extname(name))) {
      const txt = fs.readFileSync(p, 'utf8');
      const out = txt.replace(/kanaan\.ae/g, newDomain);
      if (out !== txt) {
        fs.writeFileSync(p, out);
        changed++;
        console.log('updated', path.relative(root, p));
      }
    }
  });
}
walk(root);
console.log(`\n${changed} files updated. Domain set to ${newDomain}.`);
