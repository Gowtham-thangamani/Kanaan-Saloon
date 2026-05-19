// One-shot: insert <a href="pages">Pages</a> into admin sidebars,
// between Blog and Integrations.
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'admin');

const NEEDLE = '      <a href="blog">Blog</a>\n      <a href="integrations">';
const REPLACEMENT = '      <a href="blog">Blog</a>\n      <a href="pages">Pages</a>\n      <a href="integrations">';
// Also handle the "Blog is active" variant in admin/blog.html.
const NEEDLE_ACTIVE = '      <a href="blog" class="active">Blog</a>\n      <a href="integrations">';
const REPLACEMENT_ACTIVE = '      <a href="blog" class="active">Blog</a>\n      <a href="pages">Pages</a>\n      <a href="integrations">';

let n = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.html')) continue;
  const full = path.join(DIR, name);
  let txt = fs.readFileSync(full, 'utf8');
  if (txt.includes('href="pages"')) { console.log(`skip  ${name} (already has link)`); continue; }
  let patched = false;
  if (txt.includes(NEEDLE))        { txt = txt.replace(NEEDLE, REPLACEMENT); patched = true; }
  else if (txt.includes(NEEDLE_ACTIVE)) { txt = txt.replace(NEEDLE_ACTIVE, REPLACEMENT_ACTIVE); patched = true; }
  if (!patched) { console.log(`skip  ${name} (no Blog->Integrations pattern)`); continue; }
  fs.writeFileSync(full, txt, 'utf8');
  console.log(`patch ${name}`);
  n++;
}
console.log(`---\n${n} files patched`);
