// Adds <noscript> fallback for runtime-bound pages + fills missing button type + alt="" with descriptive text.
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory() && !['node_modules','.playwright-mcp','content'].includes(name)) walk(p, files);
    else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

let n = 0;
walk(__dirname).forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  const isAr = path.relative(__dirname, f).replace(/\\/g, '/').startsWith('ar/');

  // 1. Inject <noscript> warning right after <body> for runtime-bound pages
  if (/data-bind/.test(html) && !html.includes('class="noscript-warning"')) {
    const msg = isAr
      ? 'هذا الموقع يحتاج JavaScript لعرض المحتوى الديناميكي. يرجى تفعيله أو تواصل عبر <a href="https://wa.me/971505556795" style="color:#fff;text-decoration:underline;">واتساب</a>.'
      : 'This site needs JavaScript to load dynamic content. Please enable it, or contact us via <a href="https://wa.me/971505556795" style="color:#fff;text-decoration:underline;">WhatsApp</a>.';
    html = html.replace(/<body([^>]*)>/, `<body$1>\n<noscript><div class="noscript-warning">${msg}</div></noscript>`);
  }

  // 2. Add type="button" to buttons that are missing it
  html = html.replace(/<button(?![^>]*\stype=)([^>]*)>/g, '<button type="button"$1>');

  // 3. Fill empty alt="" on hero img with a sensible default
  html = html.replace(/(<img[^>]*src="[^"]*photo-1503951914875[^"]*"[^>]*?)\salt=""/g, '$1 alt="Master barber at work in Kanaan"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1622286342621[^"]*"[^>]*?)\salt=""/g, '$1 alt="Barber tools and grooming detail"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1599351431202[^"]*"[^>]*?)\salt=""/g, '$1 alt="Inside a Kanaan salon chair"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1540555700478[^"]*"[^>]*?)\salt=""/g, '$1 alt="Spa interior at Kanaan Baniyas Spa"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1622287162716[^"]*"[^>]*?)\salt=""/g, '$1 alt="Kanaan VIP Muroor private suite"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1521590832167[^"]*"[^>]*?)\salt=""/g, '$1 alt="Premium grooming detail"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1599387737042[^"]*"[^>]*?)\salt=""/g, '$1 alt="Kanaan house interior"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1487412947147[^"]*"[^>]*?)\salt=""/g, '$1 alt="Spa products at Kanaan"');
  html = html.replace(/(<img[^>]*src="[^"]*photo-1583468982228[^"]*"[^>]*?)\salt=""/g, '$1 alt="Treatment room ambience"');
  // Generic fallback for any remaining alt=""
  html = html.replace(/(<img[^>]*src="[^"]*"[^>]*?)\salt=""/g, '$1 alt="Kanaan Gents Salon &amp; Spa"');

  if (html !== orig) {
    fs.writeFileSync(f, html);
    console.log('a11y patched:', path.relative(__dirname, f));
    n++;
  }
});
console.log(`\n${n} files patched.`);
