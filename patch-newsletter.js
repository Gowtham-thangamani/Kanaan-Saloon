// One-shot patcher: rename newsletter forms from data-newsletter to data-newsletter-form
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
let n = 0;
walk(__dirname).forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  // Replace inline-handler newsletter forms with the data-newsletter-form variant the JS listens on.
  html = html.replace(/<form data-newsletter onsubmit="[^"]*">/g, '<form data-newsletter-form>');
  if (html !== orig) {
    fs.writeFileSync(f, html);
    console.log('patched', path.relative(__dirname, f));
    n++;
  }
});
console.log(`\n${n} files patched.`);
