#!/usr/bin/env node
/**
 * Renames branch display names site-wide:
 *   "VIP Muroor"  -> "VIP Spa Muroor"
 *   "Muroor"      -> "Muroor Barber"   (only as branch-name context)
 *
 * Carefully avoids changing area names like "Muroor, Abu Dhabi" or
 * "Muroor Road, Abu Dhabi", URL slugs (branches/muroor.html),
 * query-string slugs (?branch=muroor), and image folder paths.
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

// Order matters — VIP first, then plain Muroor (so we don't double-replace).
const REPLACEMENTS = [
  // ---------- English: VIP Muroor -> VIP Spa Muroor ----------
  [/Kanaan VIP Muroor(?! Spa)/g,                      'Kanaan VIP Spa Muroor'],
  [/>VIP Muroor</g,                                   '>VIP Spa Muroor<'],
  [/"VIP Muroor"/g,                                   '"VIP Spa Muroor"'],
  [/'VIP Muroor'/g,                                   "'VIP Spa Muroor'"],
  [/value="VIP Muroor"/g,                             'value="VIP Spa Muroor"'],
  [/alt="([^"]*)VIP Muroor([^"]*)"/g,                 'alt="$1VIP Spa Muroor$2"'],
  [/title="([^"]*)VIP Muroor([^"]*)"/g,               'title="$1VIP Spa Muroor$2"'],
  [/content="([^"]*)VIP Muroor([^"]*)"/g,             'content="$1VIP Spa Muroor$2"'],
  [/aria-label="([^"]*)VIP Muroor([^"]*)"/g,          'aria-label="$1VIP Spa Muroor$2"'],
  // Body-text mentions: "Book at VIP Muroor", "for VIP Muroor", "At VIP Muroor", etc.
  [/(at|At|for|For|in|In|by|By|to|To|·)\s+VIP Muroor\b/g, '$1 VIP Spa Muroor'],
  // Section heads / paragraphs: "VIP Muroor is", "VIP Muroor, in detail", "VIP Muroor branch", "VIP Muroor Chairs"
  [/\bVIP Muroor(\s+(is|,|branch|Chairs|opens))/g,    'VIP Spa Muroor$1'],
  // WhatsApp URL share text: Kanaan%20VIP%20Muroor
  [/Kanaan%20VIP%20Muroor(?!%20Spa)/g,                'Kanaan%20VIP%20Spa%20Muroor'],
  // "Quick Book at VIP Muroor", "About VIP Muroor", "Pre-filled for VIP Muroor"
  [/(Quick Book at|About|Pre-filled for|Offers for|Map to Kanaan|WhatsApp|Inside Kanaan|Kanaan VIP|of VIP|the VIP) VIP Muroor/g,
                                                       '$1 VIP Spa Muroor'],

  // Arabic: VIP المرور -> VIP سبا المرور
  [/كنعان VIP المرور(?! سبا)/g,                       'كنعان VIP سبا المرور'],
  [/>VIP المرور</g,                                   '>VIP سبا المرور<'],
  [/"VIP المرور"/g,                                   '"VIP سبا المرور"'],

  // ---------- English: Muroor -> Muroor Barber (as branch name) ----------
  // Brand-name combinations
  [/Kanaan Muroor(?! Road| Barber| Spa)/g,             'Kanaan Muroor Barber'],
  // ">Muroor<" tag content (eyebrow / span / footer list link text)
  // Don't touch ">Muroor Road<" or ">Muroor Barber<"
  [/>Muroor(?! Road| Barber| Spa)</g,                  '>Muroor Barber<'],
  // value="Muroor" form field
  [/value="Muroor"(?! Barber)/g,                       'value="Muroor Barber"'],
  // 'Muroor' branch-name JS literal (URLSearchParams), NOT in image paths or URLs
  [/branch:\s*'Muroor'/g,                              "branch: 'Muroor Barber'"],
  [/"branch":\s*"Muroor"(?! Barber)/g,                 '"branch": "Muroor Barber"'],
  // ?branch=Muroor (display query) → Muroor%20Barber
  [/\?branch=Muroor(?!%20Barber|%2C| Road|=)(?=[&"' \n])/g, '?branch=Muroor%20Barber'],
  [/&branch=Muroor(?!%20Barber|%2C| Road|=)(?=[&"' \n])/g, '&branch=Muroor%20Barber'],
  // "Book at Muroor", "About Muroor", "Offers for Muroor", "In Our Muroor Chairs",
  //  "Quick Book at Muroor", "Pre-filled for Muroor", "WhatsApp Muroor", "At Muroor",
  //  "· Muroor" — only when not "Muroor Road" / "Muroor Barber" / "Muroor Spa"
  [/(Book at|About|Offers for|Pre-filled for|Quick Book at|WhatsApp|At|Inside Kanaan|Map to Kanaan|Our|· (?:Khalid|Ahmed|Hassan)[^·\n]*·)\s+Muroor(?! Road| Barber| Spa| ?,)/g,
                                                       '$1 Muroor Barber'],
  // "Muroor services" → "Muroor Barber services"
  [/\bMuroor services\b/g,                             'Muroor Barber services'],
  // "Muroor, in detail" → "Muroor Barber, in detail"
  [/\bMuroor, in detail\b/g,                           'Muroor Barber, in detail'],
  // "Muroor Chairs" → "Muroor Barber Chairs"  (for "In Our Muroor Chairs" testimonial label)
  [/\bMuroor Chairs\b/g,                               'Muroor Barber Chairs'],
  // Map title etc.
  [/Map to Kanaan Muroor(?! Barber| Spa)/g,            'Map to Kanaan Muroor Barber'],
  // WhatsApp share-text URL
  [/Kanaan%20Muroor(?!%20Road|%20Barber|%20Spa|%20VIP|%2C)/g, 'Kanaan%20Muroor%20Barber'],
  // FAQ "What sets Muroor apart" question stays factually correct
  // Question copy: "Is Muroor easy to reach?" → leave (the area answer makes sense)

  // Arabic: كنعان المرور -> كنعان المرور باربر
  [/كنعان المرور(?! باربر| سبا| الشرقية| الجنوبية)/g, 'كنعان المرور باربر'],
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
