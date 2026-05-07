// Patches existing utility bars to use runtime bindings.
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
  // Patch static EN utility-bar
  html = html.replace(
    /<a href="tel:\+971505556795" data-track="call_click">☏ \+971 50 555 6795<\/a>/g,
    '<a href="tel:+971505556795" data-bind-attr-href="contact.tel_url" data-track="call_click">☏ <span data-bind="contact.centralPhone">+971 50 555 6795</span></a>'
  );
  html = html.replace(
    /<a href="https:\/\/wa\.me\/971505556795" data-track="whatsapp_click">✉ WhatsApp<\/a>/g,
    '<a href="https://wa.me/971505556795" data-bind-attr-href="contact.wa_url" data-track="whatsapp_click">✉ WhatsApp</a>'
  );
  html = html.replace(
    /<a href="https:\/\/wa\.me\/971505556795" data-track="whatsapp_click">✉ واتساب<\/a>/g,
    '<a href="https://wa.me/971505556795" data-bind-attr-href="contact.wa_url" data-track="whatsapp_click">✉ واتساب</a>'
  );
  if (html !== orig) {
    fs.writeFileSync(f, html);
    console.log('patched', path.relative(__dirname, f));
    n++;
  }
});
console.log(`\n${n} files patched.`);
