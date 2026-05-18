#!/usr/bin/env node
/**
 * Bump the ?v= cache-bust suffix on assets/js/main.js (and config.js) across
 * every HTML file in the project. Pass the new version as the first arg, e.g.
 *
 *   node tools/bump-cache-bust.js 28
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const NEW = process.argv[2];
if (!NEW || !/^\d+$/.test(NEW)) {
  console.error('usage: node tools/bump-cache-bust.js <integer>');
  process.exit(1);
}

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.html$/i.test(f)) out.push(f);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;
  c = c.replace(/(assets\/js\/main\.js\?v=)\d+/g, '$1' + NEW);
  c = c.replace(/(assets\/js\/config\.js\?v=)\d+/g, '$1' + NEW);
  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    changed++;
  }
}
console.log('Bumped cache-bust to v=' + NEW + ' in', changed, 'files');
