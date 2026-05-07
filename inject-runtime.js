// Idempotently inject runtime.js into every page that loads main.js
// (so data-bind attributes work everywhere).
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

const root = __dirname;
let n = 0;
walk(root).forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  if (/runtime\.js/.test(html)) return;
  // Determine relative prefix
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  const prefix = depth === 0 ? 'assets/' : '../'.repeat(depth) + 'assets/';
  // Insert before main.js if present, else before </body>
  const re = new RegExp(`(<script src="${prefix.replace(/[/.]/g,'\\$&')}js/main\\.js"></script>)`);
  if (re.test(html)) {
    html = html.replace(re, `<script src="${prefix}js/runtime.js"></script>\n  $1`);
  } else {
    html = html.replace('</body>', `  <script src="${prefix}js/runtime.js"></script>\n</body>`);
  }
  fs.writeFileSync(f, html);
  console.log('injected runtime.js into', rel);
  n++;
});
console.log(`\nDone. Updated ${n} files.`);
