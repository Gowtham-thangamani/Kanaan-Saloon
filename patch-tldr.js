// Inject TL;DR boxes at the top of every blog post body.
const fs = require('fs');
const path = require('path');

const TLDR = {
  'moroccan-bath-guide': 'A Moroccan bath is a 4-step ritual: 12-15 min steam, black-soap cleanse, kessa-glove exfoliation, and a hydrating mask + argan-oil finish. Best every 4-6 weeks. Available at Kanaan Baniyas Spa and VIP Muroor for 180-280 AED.',
  'beard-care-abu-dhabi': 'Six rules for a healthy beard in Abu Dhabi: wash less than you think (2-3x/week), use beard oil daily, treat the skin underneath, trim every 3-4 weeks, choose a hydrating after-shave (not alcohol-based), and book a hot-towel shave for less irritation.',
  'choosing-the-right-facial': 'Quick guide: Express (120 AED, event tomorrow), Signature (250 AED, first facial in months), Hydra (380 AED, dehydration), Anti-Fatigue (280 AED, traveller / screen-tired), Premium Anti-Ageing (specific goal). Most men benefit from one facial every 4-6 weeks.'
};
const TLDR_AR = {
  'moroccan-bath-guide': 'الحمّام المغربي طقس من ٤ خطوات: ١٢-١٥ دقيقة بخار، صابون أسود، تقشير بكيس الكسة، قناع مرطّب وزيت أرجان. يُنصح كل ٤-٦ أسابيع. متوفّر في كنعان بنياس سبا و VIP المرور بـ ١٨٠-٢٨٠ درهم.'
};

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (['node_modules','.playwright-mcp','admin','content','assets'].includes(name)) return;
      walk(p, files);
    } else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

let n = 0;
walk(__dirname).forEach(f => {
  const rel = path.relative(__dirname, f).replace(/\\/g, '/');
  if (!rel.includes('blog/')) return;
  if (rel.endsWith('blog.html') || rel.endsWith('blog/index.html')) return;
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('class="tldr"')) return;
  const slug = path.basename(rel, '.html');
  const isAr = rel.startsWith('ar/');
  const tl = (isAr ? TLDR_AR : TLDR)[slug] || (TLDR[slug] || '');
  if (!tl) return;
  const label = isAr ? 'باختصار' : 'TL;DR';
  const block = `      <aside class="tldr">
        <span class="tldr__label">${label}</span>
        <p class="tldr__body">${tl}</p>
      </aside>
`;
  // Insert just inside the article's first <section>...<div class="container">
  html = html.replace(/(<div class="container"[^>]*>\s*)(<p class="lede")/, '$1' + block + '\n        $2');
  fs.writeFileSync(f, html);
  console.log('TL;DR added:', rel);
  n++;
});
console.log(`\n${n} blog posts updated.`);
