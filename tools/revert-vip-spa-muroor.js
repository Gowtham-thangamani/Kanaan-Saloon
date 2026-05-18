#!/usr/bin/env node
/**
 * Revert "VIP Spa Muroor" -> "VIP Muroor" everywhere.
 * Keeps the "Muroor Barber" rename intact.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.(html|json|js|txt|xml)$/i.test(e.name)) out.push(f);
  }
  return out;
}

const REPLACEMENTS = [
  // English
  [/VIP Spa Muroor/g,                    'VIP Muroor'],
  [/VIP%20Spa%20Muroor/g,                'VIP%20Muroor'],
  // Arabic
  [/VIP سبا المرور/g,                    'VIP المرور'],
  [/كنعان VIP سبا المرور/g,              'كنعان VIP المرور'],
];

let totalFiles = 0;
let totalChanges = 0;
const log = [];

for (const f of walk(ROOT)) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  let fileChanges = 0;
  for (const [pattern, repl] of REPLACEMENTS) {
    const matches = c.match(pattern);
    if (matches) {
      fileChanges += matches.length;
      c = c.replace(pattern, repl);
    }
  }
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    totalFiles++;
    totalChanges += fileChanges;
    log.push(`  ${path.relative(ROOT, f)} (${fileChanges})`);
  }
}

console.log(log.join('\n'));
console.log(`\nTotal: ${totalChanges} replacements across ${totalFiles} files`);
