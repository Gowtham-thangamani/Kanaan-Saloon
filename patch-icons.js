// Replaces text-based social icons with proper SVG icons via <use href=".../icons.svg#i-...">
// Idempotent — safe to run multiple times.
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

function svgIcon(prefix, name, extra = '') {
  return `<svg class="icon"${extra}><use href="${prefix}assets/img/icons.svg#i-${name}"/></svg>`;
}

let n = 0;
walk(__dirname).forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  const rel = path.relative(__dirname, f).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);

  // Footer socials — replace text labels with SVGs
  html = html.replace(
    /(<a href="#" data-bind-attr-href="social\.instagram"[^>]*>)IG(<\/a>)/g,
    `$1${svgIcon(prefix, 'instagram')}$2`
  );
  html = html.replace(
    /(<a href="#" data-bind-attr-href="social\.tiktok"[^>]*>)TT(<\/a>)/g,
    `$1${svgIcon(prefix, 'tiktok')}$2`
  );
  html = html.replace(
    /(<a href="#" data-bind-attr-href="social\.snapchat"[^>]*>)SC(<\/a>)/g,
    `$1${svgIcon(prefix, 'snapchat')}$2`
  );
  html = html.replace(
    /(<a href="#" data-bind-attr-href="contact\.wa_url"[^>]*>)WA(<\/a>)/g,
    `$1${svgIcon(prefix, 'whatsapp')}$2`
  );

  // Share bar — replace single-character text with SVGs
  html = html.replace(
    /(<a [^>]*data-track="share_whatsapp"[^>]*>)WA(<\/a>)/g,
    `$1${svgIcon(prefix, 'whatsapp')}$2`
  );
  html = html.replace(
    /(<a [^>]*data-track="share_twitter"[^>]*>)𝕏(<\/a>)/g,
    `$1${svgIcon(prefix, 'x')}$2`
  );
  html = html.replace(
    /(<a [^>]*data-track="share_facebook"[^>]*>)f(<\/a>)/g,
    `$1${svgIcon(prefix, 'facebook')}$2`
  );
  html = html.replace(
    /(<a [^>]*data-track="share_linkedin"[^>]*>)in(<\/a>)/g,
    `$1${svgIcon(prefix, 'linkedin')}$2`
  );
  html = html.replace(
    /(<a [^>]*data-track="share_email"[^>]*>)@(<\/a>)/g,
    `$1${svgIcon(prefix, 'email')}$2`
  );
  html = html.replace(
    /(<a [^>]*data-track="share_copy"[^>]*>)⎘(<\/a>)/g,
    `$1${svgIcon(prefix, 'copy')}$2`
  );
  // Also handle the case where onclick precedes data-track
  html = html.replace(
    /(<a [^>]*onclick="[^"]*"[^>]*data-track="share_copy"[^>]*>)⎘(<\/a>)/g,
    `$1${svgIcon(prefix, 'copy')}$2`
  );

  // Branch social pills — replace emoji with SVGs
  html = html.replace(
    /(<a [^>]*data-track="instagram_click"[^>]*>)📷 (Instagram|إنستغرام)(<\/a>)/g,
    (_, openA, label, closeA) => `${openA}${svgIcon(prefix, 'instagram')} ${label}${closeA}`
  );
  html = html.replace(
    /(<a [^>]*data-track="tiktok_click"[^>]*>)▶ (TikTok|تيك توك)(<\/a>)/g,
    (_, openA, label, closeA) => `${openA}${svgIcon(prefix, 'tiktok')} ${label}${closeA}`
  );
  html = html.replace(
    /(<a [^>]*data-track="gbp_click"[^>]*>)★ (Google Reviews|تقييمات Google)(<\/a>)/g,
    (_, openA, label, closeA) => `${openA}${svgIcon(prefix, 'star')} ${label}${closeA}`
  );

  // Instagram feed overlay — text "View on IG" / Arabic "عبر إنستغرام"
  html = html.replace(/<span class="ig-post__overlay">View on IG<\/span>/g,
    `<span class="ig-post__overlay">${svgIcon(prefix, 'instagram', ' style="width:24px;height:24px;"')}</span>`
  );

  if (html !== orig) {
    fs.writeFileSync(f, html);
    console.log('iconified', rel);
    n++;
  }
});
console.log(`\n${n} files iconified.`);
