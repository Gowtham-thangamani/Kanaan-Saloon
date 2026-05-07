// Inject a social-share bar above the closing </article> in every blog post.
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (['node_modules', '.playwright-mcp', 'admin', 'content', 'assets'].includes(name)) return;
      walk(p, files);
    } else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

let n = 0;
walk(__dirname).forEach(f => {
  const rel = path.relative(__dirname, f).replace(/\\/g, '/');
  if (!rel.includes('/blog/') && !rel.startsWith('blog/') && !rel.includes('blog\\')) return;
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('class="share-bar"')) return; // already patched
  if (!html.includes('</article>')) return;
  const isAr = rel.startsWith('ar/');
  const url = 'https://kanaanspa.ae/' + rel;
  const shareHTML = `      <div class="share-bar">
        <span class="share-bar__label">${isAr ? 'شارك' : 'Share'}</span>
        <a href="https://wa.me/?text=${encodeURIComponent(url)}" target="_blank" rel="noopener" data-track="share_whatsapp" aria-label="WhatsApp">WA</a>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}" target="_blank" rel="noopener" data-track="share_twitter" aria-label="X / Twitter">𝕏</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener" data-track="share_facebook" aria-label="Facebook">f</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener" data-track="share_linkedin" aria-label="LinkedIn">in</a>
        <a href="mailto:?subject=Kanaan&body=${encodeURIComponent(url)}" data-track="share_email" aria-label="Email">@</a>
        <a href="javascript:void(0)" onclick="navigator.clipboard.writeText('${url}'); this.textContent='✓';" data-track="share_copy" aria-label="Copy link">⎘</a>
      </div>
`;
  html = html.replace('</article>', shareHTML + '    </article>');
  fs.writeFileSync(f, html);
  console.log('patched', rel);
  n++;
});
console.log(`\n${n} blog posts patched with share bar.`);
