#!/usr/bin/env node
/**
 * Rename "Houses" → "Branches" (display-only — URL slugs `/branches/` already
 * use the right word). Targets visible nav labels, page titles, headings,
 * trust-strip labels, and footer column headers. Leaves the slug `branches`
 * untouched and skips Arabic (different word entirely).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.(html|json|txt|xml)$/i.test(e.name)) out.push(f);
  }
  return out;
}

// Order matters — multi-word phrases first so they don't get partially rewritten.
const REPLACEMENTS = [
  // "Houses & Services" / "Houses &amp; Services"  →  "Branches & Services"
  [/Houses &amp; Services/g,            'Branches &amp; Services'],
  [/Houses & Services/g,                'Branches & Services'],
  // "Inside Our Houses"  →  "Inside Our Branches"
  [/Inside Our Houses/g,                'Inside Our Branches'],
  // "All 10 Houses"  →  "All 10 Branches"
  [/All (\d+) Houses/g,                 'All $1 Branches'],
  // "Ten houses" / "10 houses" prose copy (lowercase)
  [/\bTen houses\b/g,                   'Ten branches'],
  [/\b(\d+) houses\b/g,                 '$1 branches'],
  // Footer + nav column header — standalone "Houses" inside tags or as label
  [/>Houses</g,                         '>Branches<'],
  [/"Houses"/g,                         '"Branches"'],
  // Nav anchor text in admin sidebar (rendered between `>` and `<`, but also as
  // raw text in some markup variations)
  [/>\s*Houses\s*</g,                   '>Branches<'],
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
