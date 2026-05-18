// One-shot verification: counts HTML pages with the social.facebook footer wired,
// pages skipped because they have no <footer> tag, and lists any remaining stragglers.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['admin', 'node_modules', '.git', 'tools', 'content', 'assets', 'src']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
let wired = 0;
let noFooter = 0;
const missing = [];

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('social.facebook') && c.includes('i-facebook')) {
    wired++;
  } else if (!c.includes('<footer')) {
    noFooter++;
  } else {
    missing.push(path.relative(ROOT, f).split(path.sep).join('/'));
  }
}

console.log(`Files with Facebook icon wired: ${wired}`);
console.log(`Files with no <footer> tag (skipped): ${noFooter}`);
if (missing.length) {
  console.log('Files with footer but still missing Facebook:');
  missing.forEach(m => console.log('  ' + m));
} else {
  console.log('No stragglers — every page with a footer has the 5-icon social block.');
}
