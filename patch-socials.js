// Wire all footer social-icon links to data-bind so they read from site.json.
// Replaces every `<div class="footer-socials"><a href="#">IG</a>...` block.
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory() && !['node_modules','.playwright-mcp','assets','content','admin'].includes(name)) walk(p, files);
    else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

const replacement = `<div class="footer-socials" aria-label="Social">
            <a href="#" data-bind-attr-href="social.instagram" aria-label="Instagram" target="_blank" rel="noopener">IG</a>
            <a href="#" data-bind-attr-href="social.tiktok" aria-label="TikTok" target="_blank" rel="noopener">TT</a>
            <a href="#" data-bind-attr-href="social.snapchat" aria-label="Snapchat" target="_blank" rel="noopener">SC</a>
            <a href="#" data-bind-attr-href="contact.wa_url" aria-label="WhatsApp" target="_blank" rel="noopener">WA</a>
          </div>`;

let n = 0;
walk(__dirname).forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  // Variants we've seen across pages
  html = html.replace(/<div class="footer-socials"[^>]*>(?:\s*<a[^>]*>[^<]*<\/a>\s*)+<\/div>/g, replacement);
  if (html !== orig) {
    fs.writeFileSync(f, html);
    console.log('patched', path.relative(__dirname, f));
    n++;
  }
});
console.log(`\n${n} files patched.`);
