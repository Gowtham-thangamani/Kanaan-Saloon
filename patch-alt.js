// Adds descriptive alt text to IG feed images and before-after pairs.
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

const ig_alts_en = [
  'Master barber at work in a Kanaan house',
  'Hot-towel shave preparation at Kanaan',
  'Beard sculpt in progress',
  'Spa room interior — Baniyas Spa',
  'Detail of barber tools on the counter',
  'Treatment-room ambience'
];
const ig_alts_ar = [
  'حلّاق محترف يعمل في بيت كنعان',
  'تحضير حلاقة بالمنشفة الساخنة',
  'نحت لحية أثناء العمل',
  'داخل غرفة سبا — بنياس سبا',
  'أدوات الحلاقة على المنضدة',
  'أجواء غرفة العلاج'
];

let n = 0;
walk(__dirname).forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  const isAr = path.relative(__dirname, f).replace(/\\/g, '/').startsWith('ar/');
  const alts = isAr ? ig_alts_ar : ig_alts_en;

  // IG feed images: replace alt="" within .ig-post
  let i = 0;
  html = html.replace(/(<a [^>]*class="ig-post"[^>]*data-track="instagram_click"[^>]*>\s*<img[^>]*?)\salt=""/g,
    (full, before) => {
      const alt = alts[i % alts.length]; i++;
      return `${before} alt="${alt}"`;
    });

  // Before-after — already has alt text, leave alone

  if (html !== orig) {
    fs.writeFileSync(f, html);
    console.log('alts added:', path.relative(__dirname, f));
    n++;
  }
});
console.log(`\n${n} files updated.`);
