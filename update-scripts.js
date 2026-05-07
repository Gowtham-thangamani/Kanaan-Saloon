// Batch-update HTML files: ensure every page loads config.js + tracking.js + consent.js + main.js
// Idempotent — running twice doesn't duplicate.
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory() && name !== 'node_modules' && name !== '.playwright-mcp' && name !== 'assets') walk(p, files);
    else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

const root = __dirname;
const files = walk(root);

files.forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const depth = path.relative(root, f).split(path.sep).length - 1; // 0 = root, 1 = subfolder, 2 = subfolder/subfolder
  const prefix = depth === 0 ? 'assets/' : '../'.repeat(depth) + 'assets/';

  // Add config + tracking + consent before </body>, only if not already present.
  const additions = [
    `<script src="${prefix}js/config.js"></script>`,
    `<script src="${prefix}js/tracking.js"></script>`,
    `<script src="${prefix}js/consent.js" defer></script>`
  ];
  let changed = false;
  additions.forEach(line => {
    if (!html.includes(line.replace(/"\s*\/?\s*>/, ''))) {
      // Insert before main.js script if present, else before </body>.
      if (html.includes(`${prefix}js/main.js`)) {
        // Insert before main.js
        const re = new RegExp(`(\\s*<script src="${prefix.replace(/[/.]/g,'\\$&')}js/main\\.js"></script>)`);
        if (!new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(html)) {
          html = html.replace(re, `\n  ${line}$1`);
          changed = true;
        }
      } else {
        if (!html.includes(line)) {
          html = html.replace('</body>', `  ${line}\n</body>`);
          changed = true;
        }
      }
    }
  });

  // Hreflang — add to <head> if not present (root-relative URLs).
  const relFromRoot = path.relative(root, f).replace(/\\/g, '/');
  let enUrl, arUrl;
  if (relFromRoot.startsWith('ar/')) {
    arUrl = '/' + relFromRoot;
    enUrl = '/' + relFromRoot.replace(/^ar\//, '');
  } else {
    enUrl = '/' + relFromRoot;
    arUrl = '/ar/' + relFromRoot;
  }
  if (!html.includes('hreflang="en"')) {
    const link = `\n  <link rel="canonical" href="${enUrl}" />\n  <link rel="alternate" hreflang="en" href="${enUrl}" />\n  <link rel="alternate" hreflang="ar" href="${arUrl}" />`;
    html = html.replace(/(<link rel="stylesheet" href="[^"]*style\.css"[^>]*>)/, `$1${link}`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, html);
    console.log('updated', path.relative(root, f));
  }
});
console.log('\nDone.');
