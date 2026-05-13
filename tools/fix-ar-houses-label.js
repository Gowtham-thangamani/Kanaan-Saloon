const fs = require('fs');
const path = require('path');
function walk(d, out=[]) {
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const f = path.join(d,e.name);
    if (e.isDirectory()) walk(f,out);
    else if (e.isFile() && /\.html$/i.test(e.name)) out.push(f);
  }
  return out;
}
const files = walk(path.resolve(__dirname, '..'));
let changed = 0;
for (const f of files) {
  const normalized = f.replace(/\\/g, '/');
  const isAr = /(^|\/)ar\//.test(normalized);
  if (!isAr) continue;
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = c.replace(/<a href="([^"]*branches\.html)">Houses &amp; Services<\/a>/g,
    '<a href="$1">البيوت والخدمات</a>');
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    changed++;
  }
}
console.log('Arabic label fixed in ' + changed + ' files');
