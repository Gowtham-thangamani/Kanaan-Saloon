// Batch-update HTML files: add OG/Twitter tags + favicon + manifest + utility bar + footer newsletter.
// Idempotent — safe to run multiple times.
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(name => {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory() && !['node_modules','.playwright-mcp','assets','admin','content'].includes(name)) walk(p, files);
    else if (name.endsWith('.html')) files.push(p);
  });
  return files;
}

const root = __dirname;
const files = walk(root);

files.forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const isAr = rel.startsWith('ar/');
  const depth = rel.split('/').length - 1;
  const upTo = depth === 0 ? '' : '../'.repeat(depth);
  let changed = false;

  // 1. Get or generate page title and description for OG
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : 'Kanaan Gents Salon & Spa';
  const desc = descMatch ? descMatch[1] : 'Ten houses across Abu Dhabi. One uncompromising standard.';
  const url = 'https://kanaanspa.ae/' + rel;

  // 1b. Hero LCP preload — pull from first <img> in .hero or .page-hero, only if it's a real URL
  if (!html.includes('rel="preload" as="image"') && /<img[^>]*src="(https:\/\/[^"]+)"/.test(html)) {
    const heroSrc = html.match(/(?:class="hero__media"[^>]*>\s*<img[^>]*src="(https?:\/\/[^"]+)"|class="page-hero__media"[^>]*>\s*<img[^>]*src="(https?:\/\/[^"]+)")/);
    const src = heroSrc && (heroSrc[1] || heroSrc[2]);
    if (src && src.startsWith('http')) {
      const preload = `\n  <link rel="preload" as="image" href="${src}" fetchpriority="high" />`;
      html = html.replace(/(<link rel="stylesheet"[^>]*>)/, `$1${preload}`);
      changed = true;
    }
  }

  // 2. Add OG + Twitter + favicon if not present
  if (!html.includes('og:title') && !html.includes('twitter:card')) {
    const ogBlock = `
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://kanaanspa.ae/assets/img/og-default.svg" />
  <meta property="og:locale" content="${isAr ? 'ar_AE' : 'en_US'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta name="twitter:image" content="https://kanaanspa.ae/assets/img/og-default.svg" />
  <link rel="icon" type="image/svg+xml" href="${upTo}assets/img/favicon.svg" />
  <link rel="apple-touch-icon" href="${upTo}assets/img/favicon.svg" />
  <link rel="manifest" href="${upTo}manifest.json" />
  <meta name="theme-color" content="#0E0F11" />`;
    html = html.replace(/<\/head>/, ogBlock + '\n</head>');
    changed = true;
  }

  // 3. Inject utility bar above .site-header (desktop-only, hidden on mobile by CSS)
  // Skip on legal pages, lp pages, admin, thank-you, search, 404
  const skipUtility = /(privacy-policy|terms|cookie-policy|accessibility|thank-you|search|404|admin\/|lp\/)/.test(rel);
  if (!skipUtility && !html.includes('class="utility-bar"') && html.includes('<body')) {
    const phoneText = isAr ? 'اتصل بنا' : 'Call';
    const waText = isAr ? 'واتساب' : 'WhatsApp';
    const langSwitchUrl = isAr ? '../' + rel.replace(/^ar\//, '') : 'ar/' + rel;
    const utilityBar = `
  <div class="utility-bar">
    <div class="utility-bar__inner">
      <span class="utility-bar__pitch">${isAr ? 'عشرة بيوت في أبوظبي · معيار واحد' : 'Ten houses in Abu Dhabi · One standard'}</span>
      <div class="utility-bar__actions">
        <a href="tel:+971505556795" data-bind-attr-href="contact.tel_url" data-track="call_click">☏ <span data-bind="contact.centralPhone">+971 50 555 6795</span></a>
        <a href="https://wa.me/971505556795" data-bind-attr-href="contact.wa_url" data-track="whatsapp_click">✉ ${waText}</a>
      </div>
    </div>
  </div>`;
    html = html.replace(/(<body[^>]*>\s*)/, `$1${utilityBar}\n  `);
    changed = true;
  }

  // 4. Add newsletter signup to footer (above .footer-bottom)
  if (!html.includes('class="footer-newsletter"') && /<div class="footer-bottom"/.test(html)) {
    const nlTitle = isAr ? 'النشرة' : 'Newsletter';
    const nlSub = isAr ? 'عروض ومستجدّات كنعان مرّة كل شهر — لا أكثر.' : 'Kanaan offers and updates, once a month — no more.';
    const nlPh = isAr ? 'بريدك الإلكتروني' : 'Your email address';
    const nlBtn = isAr ? 'اشترك' : 'Subscribe';
    const nlBlock = `
      <div class="footer-newsletter">
        <div>
          <h5>${nlTitle}</h5>
          <p>${nlSub}</p>
        </div>
        <form data-newsletter-form>
          <input type="email" required placeholder="${nlPh}" />
          <button type="submit" class="btn btn--sm">${nlBtn}</button>
        </form>
      </div>`;
    html = html.replace(/(<div class="footer-bottom")/, nlBlock + '\n      $1');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, html);
    console.log('enhanced', rel);
  }
});
console.log('\nDone.');
