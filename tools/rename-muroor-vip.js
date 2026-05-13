#!/usr/bin/env node
/**
 * Renames branch display names site-wide:
 *   "VIP Muroor"  -> "VIP SPA"
 *   "Muroor"      -> "Muroor Barber"   (only as branch-name context)
 *
 * Carefully avoids changing area names like "Muroor, Abu Dhabi" or
 * "Muroor Road, Abu Dhabi", and never touches URL slugs (branches/muroor.html).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'tools') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && /\.(html|json|js)$/i.test(e.name)) out.push(f);
  }
  return out;
}

// Order matters — VIP first, then plain Muroor (so we don't double-replace).
const REPLACEMENTS = [
  // English: VIP Muroor -> VIP SPA
  [/Kanaan VIP Muroor/g,             'Kanaan VIP SPA'],
  [/>VIP Muroor</g,                  '>VIP SPA<'],
  [/"VIP Muroor"/g,                  '"VIP SPA"'],
  [/'VIP Muroor'/g,                  "'VIP SPA'"],
  [/value="VIP Muroor"/g,            'value="VIP SPA"'],
  [/alt="([^"]*)VIP Muroor([^"]*)"/g,'alt="$1VIP SPA$2"'],
  [/title="([^"]*)VIP Muroor([^"]*)"/g,'title="$1VIP SPA$2"'],
  [/content="([^"]*)VIP Muroor([^"]*)"/g,'content="$1VIP SPA$2"'],
  [/aria-label="([^"]*)VIP Muroor([^"]*)"/g,'aria-label="$1VIP SPA$2"'],

  // Arabic: VIP المرور -> VIP سبا
  [/كنعان VIP المرور/g,              'كنعان VIP سبا'],
  [/>VIP المرور</g,                  '>VIP سبا<'],
  [/"VIP المرور"/g,                  '"VIP سبا"'],

  // English: standalone "Kanaan Muroor" -> "Kanaan Muroor Barber"
  // Don't touch "Kanaan Muroor Barber" (already done) or any new substring
  [/Kanaan Muroor(?! Barber)/g,      'Kanaan Muroor Barber'],

  // Standalone tag content ">Muroor<" — only when not followed by a comma/road
  [/>Muroor</g,                      '>Muroor Barber<'],

  // value="Muroor" / "Muroor" / 'Muroor' as branch values in form / JSON / JS,
  // but NOT inside "Muroor Road" or area phrases
  [/value="Muroor"/g,                'value="Muroor Barber"'],

  // Arabic standalone: "كنعان المرور" -> "كنعان المرور باربر" (avoid double-replace)
  [/كنعان المرور(?! باربر)/g,        'كنعان المرور باربر'],
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

console.log(log.slice(0, 10).join('\n'));
if (log.length > 10) console.log(`  ... and ${log.length - 10} more`);
console.log(`\nTotal: ${totalChanges} replacements across ${totalFiles} files`);
