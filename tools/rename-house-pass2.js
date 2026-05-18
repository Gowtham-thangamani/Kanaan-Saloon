#!/usr/bin/env node
/**
 * Pass-2 House → Branch rename: catches body copy, alt text, meta descriptions,
 * and standalone "house"/"houses" — including capitalised marketing strings.
 * Excludes compounds where "house" is part of a fixed term:
 *   • front-of-house
 *   • in-house
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.(html|json|txt|xml|md)$/i.test(e.name)) out.push(f);
  }
  return out;
}

const REPLACEMENTS = [
  // Compound terms we want to preserve — replace them with placeholders first,
  // then restore at the end. This is the cleanest way to skip them.
  [/front-of-house/g,    'FOH'],
  [/In-house/g,          'INHOUSE_CAP'],
  [/in-house/g,          'INHOUSE'],
  // Plural
  [/\bHouses\b/g,        'Branches'],
  [/\bhouses\b/g,        'branches'],
  // Singular
  [/\bHouse\b/g,         'Branch'],
  [/\bhouse\b/g,         'branch'],
  // Restore compounds
  [/FOH/g,        'front-of-house'],
  [/INHOUSE_CAP/g,'In-house'],
  [/INHOUSE/g,    'in-house'],
];

let totalFiles = 0;
let totalChanges = 0;
const log = [];

for (const f of walk(ROOT)) {
  // Skip Arabic — uses different vocabulary
  if (f.includes(path.sep + 'ar' + path.sep)) continue;
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  let fileChanges = 0;
  for (const [pat, repl] of REPLACEMENTS) {
    const m = c.match(pat);
    if (m) { fileChanges += m.length; c = c.replace(pat, repl); }
  }
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    totalFiles++;
    totalChanges += fileChanges;
    log.push(`  ${path.relative(ROOT, f)} (${fileChanges})`);
  }
}

console.log(log.slice(0, 25).join('\n'));
if (log.length > 25) console.log(`  ... and ${log.length - 25} more`);
console.log(`\nTotal: ${totalChanges} replacements across ${totalFiles} files`);
