/*
 * Generates sitemap.xml.
 *
 * Run with: node generate-sitemap.js
 *
 * Two sources, because the site has two kinds of page:
 *   1. Static .html files on disk (home, branches, services, LPs, ...).
 *   2. Blog posts, which have NO file of their own — /blog/<slug> is served by
 *      the blog/_post.html template and filled in from the Supabase
 *      `blog_posts` table. Walking the filesystem alone therefore missed every
 *      post, which is why Search Console found only 7 blog URLs in the sitemap
 *      while 23 were live.
 *
 * Everything emitted here is a clean URL (no .html) and is checked for the
 * things a sitemap must not contain: noindex pages, redirect-only shims and
 * URLs whose canonical points somewhere else.
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://kanaanspa.ae';
const root = __dirname;

// Directories never indexed (admin panel, build artifacts, assets, supabase).
const SKIP_DIRS = ['node_modules', '.playwright-mcp', 'assets', 'admin', 'supabase', '.git', '.claude', 'tools', 'docs', 'pricelists'];
// Not real pages: the blog template itself, and error/confirmation pages.
const EXCLUDE = ['404.html', 'ar/404.html', 'thank-you.html', 'ar/thank-you.html', 'blog/_post.html', 'og-preview.html'];

const NOINDEX_RE = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i;
const CANONICAL_RE = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (!SKIP_DIRS.includes(name)) walk(p, files);
    } else if (name.endsWith('.html')) files.push(p);
  }
  return files;
}

// /foo/index.html -> /foo/ ; /foo.html -> /foo ; index.html -> /
function cleanUrl(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel.replace(/\.html$/, '');
}

const skipped = [];

const pages = walk(root)
  .map(f => path.relative(root, f).replace(/\\/g, '/'))
  .filter(rel => !EXCLUDE.includes(rel))
  // Search-engine ownership-verification stubs are not pages.
  .filter(rel => !/^google[0-9a-f]+\.html$/i.test(rel)
               && !/^(BingSiteAuth|yandex_)[^/]*\.html$/i.test(rel))
  .filter(rel => {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    // Drop noindex pages. This is what keeps the redirect-only shims
    // (book.html, ar/book.html, services.html, ar/services.html) and the
    // internal site-search pages out of the sitemap without a hardcoded list.
    if (NOINDEX_RE.test(html)) { skipped.push(`${rel} (noindex)`); return false; }
    // Drop pages that canonicalise somewhere else — a sitemap should only
    // ever list canonical URLs.
    const m = html.match(CANONICAL_RE);
    if (m) {
      const canon = m[1].replace(/\/$/, '');
      const self = (SITE + cleanUrl(rel)).replace(/\/$/, '');
      if (canon && canon !== self) { skipped.push(`${rel} (canonical -> ${m[1]})`); return false; }
    }
    return true;
  })
  .sort();

const enPages = pages.filter(f => !f.startsWith('ar/'));
const arPages = pages.filter(f => f.startsWith('ar/'));
const today = new Date().toISOString().split('T')[0];

function entry(loc, lastmod, priority, alternates) {
  let xhtml = '';
  if (alternates) {
    xhtml = `\n${alternates}`;
  }
  return `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>${xhtml}
  </url>`;
}

const urls = [];

// Real file mtime, not today's date: stamping every page with the current
// date on each run tells Google everything changed when nothing did, and
// it learns to ignore the field.
function lastmodOf(rel) {
  return fs.statSync(path.join(root, rel)).mtime.toISOString().split('T')[0];
}

for (const f of enPages) {
  const loc = cleanUrl(f);
  const arLoc = arPages.includes('ar/' + f) ? '/ar/' + f.replace(/\.html$/, '') : null;
  let alt = `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${loc}"/>`;
  if (arLoc) alt += `\n    <xhtml:link rel="alternate" hreflang="ar" href="${SITE}${arLoc}"/>`;
  alt += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${loc}"/>`;
  const priority = f === 'index.html' ? '1.0' : f.startsWith('branches/') ? '0.9' : '0.7';
  urls.push(entry(loc, lastmodOf(f), priority, alt));
}
for (const f of arPages) {
  urls.push(entry(cleanUrl(f), lastmodOf(f), '0.7', null));
}

/* ---------- Blog posts (Supabase `blog_posts`, same source the site reads) ---------- */
function supabaseConfig() {
  const cfg = fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8');
  const block = cfg.slice(cfg.indexOf('supabase:'));
  const url = (block.match(/url:\s*'([^']+)'/) || [])[1];
  const key = (block.match(/anonKey:\s*'([^']+)'/) || [])[1];
  return { url, key };
}

async function blogPosts() {
  const { url, key } = supabaseConfig();
  if (!url || !key) throw new Error('Supabase config not found in assets/js/config.js');
  const r = await fetch(
    `${url}/rest/v1/blog_posts?select=slug,publish_date,updated_at,noindex,canonical_url&active=eq.true`,
    { headers: { apikey: key, Authorization: 'Bearer ' + key } }
  );
  if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
  return await r.json();
}

(async () => {
  let posts = [];
  try {
    posts = await blogPosts();
  } catch (e) {
    console.error(`\n!! Could not read blog_posts from Supabase: ${e.message}`);
    console.error('!! Refusing to write a sitemap that would silently drop every blog URL.');
    console.error('!! Fix the connection and re-run.\n');
    process.exit(1);
  }

  let added = 0;
  const offSiteCanonicals = [];
  for (const p of posts.sort((a, b) => (b.publish_date || '').localeCompare(a.publish_date || ''))) {
    const loc = '/blog/' + p.slug;
    if (p.noindex) { skipped.push(`${loc} (noindex)`); continue; }
    // Mirrors the guard in runtime.js applyBlogPostSeo: a canonical_url that
    // points off-site is ignored at render time (the page self-canonicalises),
    // so the post is still eligible here. Only an on-site canonical pointing at
    // a *different* page is a real reason to leave it out.
    const declared = (p.canonical_url || '').trim().replace(/\/$/, '');
    const onSite = declared.startsWith('/') ? SITE + declared
                 : (declared === SITE || declared.startsWith(SITE + '/')) ? declared
                 : null;
    if (declared && !onSite) offSiteCanonicals.push(`${loc}  (admin value: ${p.canonical_url})`);
    if (onSite && onSite !== SITE + loc) { skipped.push(`${loc} (canonical -> ${p.canonical_url})`); continue; }
    const lastmod = (p.updated_at || p.publish_date || today).split('T')[0];
    urls.push(entry(loc, lastmod, '0.8', null));
    added++;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
  console.log(`Generated sitemap.xml — ${urls.length} URLs (${enPages.length} EN pages, ${arPages.length} AR pages, ${added} blog posts).`);
  if (skipped.length) {
    console.log(`\nDeliberately excluded (${skipped.length}):`);
    for (const s of skipped.sort()) console.log('  - ' + s);
  }
  if (offSiteCanonicals.length) {
    console.log(`
!! ${offSiteCanonicals.length} post(s) have an off-site canonical_url in Supabase.`);
    console.log('!! runtime.js ignores these so the live pages self-canonicalise and');
    console.log('!! they stay in the sitemap, but the stored rows are still wrong.');
    console.log('!! Fix them in /admin/blog.html:');
    for (const s of offSiteCanonicals.sort()) console.log('  * ' + s);
  }
})();
