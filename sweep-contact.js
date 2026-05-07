// Sweep static HTML/JS files: replace placeholder contact data with real Kanaan contact info.
// Idempotent — safe to re-run. Skips test artifacts and content/ JSON.
const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  // Phones — central WhatsApp / call line
  [/\+971500000000/g, '+971505556795'],
  [/971500000000/g,    '971505556795'],
  // Per-branch placeholder phones (10 distinct numbers used in fixtures)
  [/\+97150000000(\d)/g, (_, d) => '+971505556795'], // any +97150000000X → central WA (visible)
  [/971500000(\d{3})/g, '971505556795'],
  // Emails
  [/hello@kanaan\.ae/g,   'kanaansaloon@gmail.com'],
  [/bookings@kanaan\.ae/g, 'kanaansaloon@gmail.com'],
  [/careers@kanaan\.ae/g,  'kanaansaloon@gmail.com'],
  [/press@kanaan\.ae/g,    'kanaansaloon@gmail.com'],
  [/privacy@kanaan\.ae/g,  'kanaansaloon@gmail.com'],
  // Visible formatted phone fallback that runtime.js replaces (also catches SEO crawl)
  [/\+971 50 000 0000/g, '+971 50 555 6795']
];

const SKIP_DIRS = new Set(['node_modules', '.playwright-mcp', 'pricelists', 'content', '.git', '.tmp_pricelists']);
const SKIP_FILES = new Set(['sweep-contact.js']);

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    if (SKIP_DIRS.has(name)) return;
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, files);
    else if ((name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.txt') || name.endsWith('.xml')) && !SKIP_FILES.has(name)) {
      files.push(p);
    }
  });
  return files;
}

const root = __dirname;
const files = walk(root);
let touched = 0;

files.forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  let changed = false;
  REPLACEMENTS.forEach(([re, val]) => {
    const next = html.replace(re, val);
    if (next !== html) { html = next; changed = true; }
  });
  if (changed) {
    fs.writeFileSync(f, html);
    touched++;
    console.log('updated', path.relative(root, f).replace(/\\/g, '/'));
  }
});
console.log(`\n${touched} files updated.`);
