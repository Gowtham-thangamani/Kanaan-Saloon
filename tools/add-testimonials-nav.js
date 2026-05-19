// One-shot: insert <a href="testimonials">Testimonials</a> into every admin
// page's sidebar nav, between the Banners and Blog links.
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'admin');

const NEEDLE = '      <a href="banners">Banners</a>\n      <a href="blog"';
const REPLACEMENT = '      <a href="banners">Banners</a>\n      <a href="testimonials">Testimonials</a>\n      <a href="blog"';

let n = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.html')) continue;
  const full = path.join(DIR, name);
  const txt = fs.readFileSync(full, 'utf8');
  if (txt.includes('href="testimonials"')) { console.log(`skip  ${name} (already has link)`); continue; }
  if (!txt.includes(NEEDLE)) { console.log(`skip  ${name} (no Banners→Blog pattern)`); continue; }
  fs.writeFileSync(full, txt.replace(NEEDLE, REPLACEMENT), 'utf8');
  console.log(`patch ${name}`);
  n++;
}
console.log(`---\n${n} files patched`);
