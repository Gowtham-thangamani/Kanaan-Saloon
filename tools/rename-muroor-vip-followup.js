#!/usr/bin/env node
/**
 * Follow-up pass: catch any remaining "VIP Muroor" (not already "VIP Spa Muroor")
 * and the bad double-rename "VIP Muroor Barber" that happened when the
 * earlier "Muroor, in detail" rule fired inside "VIP Muroor, in detail."
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
  // Undo the bad rename: "VIP Muroor Barber" should be "VIP Spa Muroor"
  [/VIP Muroor Barber/g,                              'VIP Spa Muroor'],
  // Any remaining "VIP Muroor" not followed by " Spa" / " Barber"
  [/\bVIP Muroor(?! Spa| Barber)\b/g,                 'VIP Spa Muroor'],
  // URL query slug stayed as `?branch=VIP Muroor` → URL-encode for safety
  [/\?branch=VIP%20Muroor(?!%20Spa|%20Barber)/g,      '?branch=VIP%20Spa%20Muroor'],
  [/&branch=VIP%20Muroor(?!%20Spa|%20Barber)/g,       '&branch=VIP%20Spa%20Muroor'],
  // Plain `branch=VIP Muroor&` (unencoded in JS template literal) → encoded
  [/branch=VIP Muroor&/g,                             'branch=VIP%20Spa%20Muroor&'],
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
