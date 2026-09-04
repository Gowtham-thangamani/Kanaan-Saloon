/*
 * Pre-renders every published blog post to a real HTML file.
 *
 * Run with: node generate-blog-posts.js
 *
 * WHY THIS EXISTS
 * ---------------
 * Blog posts had no file of their own. Every /blog/<slug> was served by the
 * single blog/_post.html template and filled in from Supabase by JavaScript
 * after load. That meant the crawlable HTML for all 23 posts was identical:
 *
 *     <title>Loading… | Kanaan Blog</title>
 *     <meta name="description" content="A Kanaan Blog post." />
 *     …no canonical, no article text, ~50-80 words of chrome
 *
 * which is exactly what the crawl report flagged as duplicate titles,
 * duplicate meta descriptions and near-empty pages. The site is static Apache
 * with no server-side rendering, so the only way to put real content in the
 * initial HTML response is to write it at build time. This does that.
 *
 * The template keeps working untouched: runtime.js still fills the same
 * markers on load (writing identical values over the pre-rendered ones), and
 * the .htaccess blog catch-all still serves _post.html for any slug that has
 * no file yet — so a post published in the admin panel is live immediately,
 * and becomes fully crawlable at the next build.
 *
 * Generated files carry GEN_MARKER and are pruned on each run, so renamed or
 * unpublished posts never leave an orphan behind.
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://kanaanspa.ae';
const root = __dirname;
const BLOG_DIR = path.join(root, 'blog');
const TEMPLATE = path.join(BLOG_DIR, '_post.html');
const GEN_MARKER = '<!-- pre-rendered by generate-blog-posts.js — do not edit by hand -->';

/* ---------------- helpers ---------------- */

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Strip tags for word counts and description fallbacks.
const stripTags = h => String(h || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ')
  .trim();

/* Replace the inner content of the element carrying `marker`.
   The template's marked elements never nest another element of the same tag,
   so a non-greedy match to the next matching close tag is exact here. */
function fillMarker(html, marker, inner) {
  const re = new RegExp('(<([a-z0-9]+)[^>]*\\b' + marker + '\\b[^>]*>)([\\s\\S]*?)(</\\2>)', 'i');
  if (!re.test(html)) throw new Error('marker not found in template: ' + marker);
  return html.replace(re, (_m, open, _tag, _old, close) => open + inner + close);
}

/* Replace one <meta>/<title> value in the head. */
function setTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + esc(value) + '</title>');
}
function setMeta(html, attr, key, value) {
  const re = new RegExp('<meta[^>]*\\b' + attr + '=["\']' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>', 'i');
  const tag = '<meta ' + attr + '="' + key + '" content="' + esc(value) + '" />';
  return re.test(html) ? html.replace(re, tag) : html;
}
/* Add tags immediately before </head>. */
function appendHead(html, block) {
  return html.replace(/<\/head>/i, block + '\n</head>');
}

/* Same off-site canonical guard as runtime.js applyBlogPostSeo: a value that
   points at a domain we do not own is ignored rather than emitted. */
function resolveCanonical(declared, selfUrl, slug, warnings) {
  const d = String(declared || '').trim();
  if (!d) return selfUrl;
  if (d.startsWith('/')) return SITE + d;
  if (d === SITE || d.startsWith(SITE + '/')) return d;
  warnings.push(`${slug} — ignored off-site canonical_url: ${d}`);
  return selfUrl;
}

function supabaseConfig() {
  const cfg = fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8');
  const block = cfg.slice(cfg.indexOf('supabase:'));
  return {
    url: (block.match(/url:\s*'([^']+)'/) || [])[1],
    key: (block.match(/anonKey:\s*'([^']+)'/) || [])[1]
  };
}

async function fetchPosts() {
  const { url, key } = supabaseConfig();
  if (!url || !key) throw new Error('Supabase config not found in assets/js/config.js');
  const r = await fetch(`${url}/rest/v1/blog_posts?select=*&active=eq.true`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
  return await r.json();
}

/* ---------------- render one post ---------------- */

function render(template, post, warnings, allSlugs) {
  const slug = post.slug;
  const selfUrl = SITE + '/blog/' + slug;
  const canonical = resolveCanonical(post.canonical_url, selfUrl, slug, warnings);

  const title = (post.meta_title || post.title || '').trim();
  const fullTitle = title + (/\| Kanaan/i.test(title) ? '' : ' | Kanaan Blog');
  const description = (post.meta_description || post.excerpt || stripTags(post.lede) || '')
    .replace(/\s+/g, ' ').trim().slice(0, 320);

  const ogTitle = (post.og_title || post.meta_title || post.title || '').trim();
  const ogDesc = (post.og_description || post.meta_description || post.excerpt || '')
    .replace(/\s+/g, ' ').trim().slice(0, 320);
  const rawOgImage = post.og_image || post.hero_image || '/assets/img/og-default.svg';
  const ogImage = /^https?:\/\//i.test(rawOgImage)
    ? rawOgImage
    : SITE + (rawOgImage.startsWith('/') ? '' : '/') + rawOgImage;
  const ogImageAlt = post.og_image_alt || post.hero_alt || title;

  const bodyText = stripTags(post.body_html);
  const words = (bodyText.match(/[A-Za-z؀-ۿ][A-Za-z0-9؀-ۿ'\-]*/g) || []).length;
  const readMinutes = post.read_minutes || (words ? Math.max(1, Math.round(words / 220)) : null);

  let h = template;

  /* ---- head ---- */
  h = setTitle(h, fullTitle);
  h = setMeta(h, 'name', 'description', description);
  h = setMeta(h, 'name', 'robots', post.noindex ? 'noindex, nofollow' : 'index, follow');
  h = setMeta(h, 'property', 'og:image', ogImage);
  h = setMeta(h, 'name', 'twitter:image', ogImage);

  const tags = Array.isArray(post.tags) ? post.tags
    : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : []);

  const head = [
    `  <link rel="canonical" href="${esc(canonical)}" />`
  ];

  /* hreflang only where it is true and reciprocal.
     Arabic articles are published on the English /blog/ path with the "-ar"
     slug suffix, so a blanket hreflang="en" self-reference — which is what
     runtime.js emits — labels Arabic content as English. A lone self-reference
     carries no value anyway; Google only acts on reciprocal sets. So: emit a
     pair only where both languages of the same article exist, with the codes
     the right way round, and emit nothing otherwise. */
  const isArabic = /-ar$/.test(slug);
  const counterpart = isArabic ? slug.replace(/-ar$/, '') : slug + '-ar';
  if (allSlugs.has(counterpart)) {
    const enUrl = SITE + '/blog/' + (isArabic ? counterpart : slug);
    const arUrl = SITE + '/blog/' + (isArabic ? slug : counterpart);
    head.push(`  <link rel="alternate" hreflang="en" href="${esc(enUrl)}" />`);
    head.push(`  <link rel="alternate" hreflang="ar" href="${esc(arUrl)}" />`);
    head.push(`  <link rel="alternate" hreflang="x-default" href="${esc(enUrl)}" />`);
  }

  head.push(
    `  <meta property="og:title" content="${esc(ogTitle)}" />`,
    `  <meta property="og:description" content="${esc(ogDesc)}" />`,
    `  <meta property="og:url" content="${esc(canonical)}" />`,
    `  <meta property="og:image:alt" content="${esc(ogImageAlt)}" />`,
    `  <meta property="og:site_name" content="Kanaan Gents Salon &amp; Spa" />`,
    `  <meta name="twitter:title" content="${esc(ogTitle)}" />`,
    `  <meta name="twitter:description" content="${esc(ogDesc)}" />`,
    `  <meta name="twitter:image:alt" content="${esc(ogImageAlt)}" />`
  );
  if (post.og_image_width)  head.push(`  <meta property="og:image:width" content="${esc(post.og_image_width)}" />`);
  if (post.og_image_height) head.push(`  <meta property="og:image:height" content="${esc(post.og_image_height)}" />`);
  if (post.publish_date) head.push(`  <meta property="article:published_time" content="${esc(post.publish_date)}" />`);
  if (post.updated_at)   head.push(`  <meta property="article:modified_time" content="${esc(post.updated_at)}" />`);
  if (post.author)       head.push(`  <meta property="article:author" content="${esc(post.author)}" />`);
  if (post.category)     head.push(`  <meta property="article:section" content="${esc(post.category)}" />`);
  tags.forEach(t => head.push(`  <meta property="article:tag" content="${esc(t)}" />`));

  const schema = {
    '@context': 'https://schema.org',
    '@type': post.schema_type || 'BlogPosting',
    headline: title,
    description: description,
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    image: ogImage,
    author: { '@type': 'Organization', name: post.author || 'Kanaan Editorial' },
    publisher: {
      '@type': 'Organization',
      name: 'Kanaan Gents Salon & Spa',
      logo: { '@type': 'ImageObject', url: SITE + '/assets/img/favicon.svg' }
    }
  };
  if (post.publish_date) schema.datePublished = post.publish_date;
  if (post.updated_at)   schema.dateModified = post.updated_at;
  if (words)             schema.wordCount = words;
  if (tags.length)       schema.keywords = tags.join(', ');

  head.push('  <script type="application/ld+json">' + JSON.stringify(schema) + '</script>');
  h = appendHead(h, head.join('\n'));

  /* ---- body ---- */
  const metaLine = (post.category || '') + (readMinutes ? ' · ' + readMinutes + ' min read' : '');
  h = fillMarker(h, 'data-blog-meta', esc(metaLine));
  h = fillMarker(h, 'data-blog-title', esc(post.title || ''));
  h = fillMarker(h, 'data-blog-lede', esc(post.lede || ''));
  h = fillMarker(h, 'data-blog-body', post.body_html || '');

  const author = post.author || 'Kanaan Editorial';
  const initials = author.split(/\s+/).slice(0, 2)
    .map(w => w[0] || '').join('').toUpperCase() || 'K';
  h = fillMarker(h, 'data-blog-author-initials', esc(initials));
  h = fillMarker(h, 'data-blog-author', esc(author));

  let dateText = '—';
  if (post.publish_date) {
    const d = new Date(post.publish_date);
    dateText = isNaN(d) ? post.publish_date
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  h = fillMarker(h, 'data-blog-date', esc(dateText));

  // TL;DR block is hidden in the template; reveal it only when there is one.
  if (post.tldr) {
    h = h.replace(/(<aside[^>]*\bdata-blog-tldr-wrap\b[^>]*)\s+hidden(\s*>)/i, '$1$2');
    h = fillMarker(h, 'data-blog-tldr', esc(post.tldr));
  }

  // Hero image — drop the placeholder srcset/sizes, as runtime.js does, or the
  // browser keeps preferring the placeholder over the real image.
  const hero = post.background_image || post.hero_image;
  const heroAlt = post.background_alt || post.hero_alt || post.title || '';
  if (hero) {
    h = h.replace(/<img\b[^>]*\bdata-blog-hero\b[^>]*>/i, m => {
      let tag = m.replace(/\s+srcset="[^"]*"/i, '').replace(/\s+sizes="[^"]*"/i, '');
      tag = tag.replace(/\ssrc="[^"]*"/i, ' src="' + esc(hero) + '"');
      tag = /\salt="/i.test(tag)
        ? tag.replace(/\salt="[^"]*"/i, ' alt="' + esc(heroAlt) + '"')
        : tag.replace(/<img/i, '<img alt="' + esc(heroAlt) + '"');
      return tag;
    });
  }

  return h.replace(/^<!DOCTYPE html>/i, '<!DOCTYPE html>\n' + GEN_MARKER);
}

/* ---------------- blog index ---------------- */

/* The /blog index built its entire card grid in JavaScript, so the crawlable
   HTML contained zero links to any article — the 23 posts had no internal
   links anywhere on the site and were reachable only through the sitemap.
   This writes the same cards as real <a> elements at build time.

   They carry data-prerendered; renderList() in runtime.js removes those before
   appending its own, so the live list stays authoritative and nothing is ever
   shown twice. The data-bind-template card is left untouched so runtime.js can
   still clone it. */
function renderIndex(posts) {
  const file = path.join(root, 'blog.html');
  let html = fs.readFileSync(file, 'utf8');

  // Clear cards from a previous run so repeated builds stay identical. The
  // card markup contains no nested <a>, so a non-greedy close match is exact.
  html = html.replace(/\n[ \t]*<a data-prerendered[\s\S]*?<\/a>/g, '');

  const ordered = posts.slice().sort((a, b) =>
    String(b.publish_date || '').localeCompare(String(a.publish_date || '')));

  const cards = ordered.map(p => {
    const words = (stripTags(p.body_html).match(/[A-Za-z؀-ۿ][A-Za-z0-9؀-ۿ'-]*/g) || []).length;
    const mins = p.read_minutes || (words ? Math.max(1, Math.round(words / 220)) : null);
    const meta = (p.category || '') + (mins ? ' · ' + mins + ' min read' : '');
    const img = p.hero_image || '/assets/img/og-default.svg';
    return [
      '        <a data-prerendered href="/blog/' + esc(p.slug) + '" class="branch-card">',
      '          <div class="branch-card__media" data-hover-zoom><img src="' + esc(img) +
        '" alt="' + esc(p.hero_alt || p.title || '') + '" loading="lazy" decoding="async" /></div>',
      '          <div class="branch-card__body">',
      '            <span class="branch-card__area">' + esc(meta) + '</span>',
      '            <h3 class="branch-card__title" style="font-size: 24px;">' + esc(p.title || '') + '</h3>',
      '            <p class="branch-card__meta">' + esc(p.excerpt || '') + '</p>',
      '          </div>',
      '        </a>'
    ].join('\n');
  }).join('\n');

  // Insert immediately after the template card inside the posts list.
  const anchor = /(<a data-bind-template[\s\S]*?<\/a>)/;
  if (!anchor.test(html)) throw new Error('blog.html: data-bind-template card not found');
  html = html.replace(anchor, '$1\n' + cards);

  fs.writeFileSync(file, html);
  return ordered.length;
}

/* ---------------- main ---------------- */

(async () => {
  let posts;
  try {
    posts = await fetchPosts();
  } catch (e) {
    console.error(`\n!! Could not read blog_posts from Supabase: ${e.message}`);
    console.error('!! Refusing to run — that would delete every pre-rendered post.\n');
    process.exit(1);
  }

  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const allSlugs = new Set(posts.map(p => p.slug));
  const warnings = [];
  const written = [];

  for (const post of posts) {
    if (!post.slug || !/^[a-z0-9][a-z0-9-]*$/.test(post.slug)) {
      warnings.push(`skipped — slug not URL-safe: ${JSON.stringify(post.slug)}`);
      continue;
    }
    if (!post.body_html) warnings.push(`${post.slug} — no body_html; page will be thin`);
    fs.writeFileSync(path.join(BLOG_DIR, post.slug + '.html'), render(template, post, warnings, allSlugs));
    written.push(post.slug + '.html');
  }

  // Prune pre-rendered files whose post is gone, renamed or unpublished.
  // Only files carrying GEN_MARKER are ever deleted.
  let pruned = 0;
  for (const f of fs.readdirSync(BLOG_DIR)) {
    if (!f.endsWith('.html') || f === '_post.html' || written.includes(f)) continue;
    const p = path.join(BLOG_DIR, f);
    if (fs.readFileSync(p, 'utf8').includes(GEN_MARKER)) {
      fs.unlinkSync(p);
      pruned++;
      console.log('  pruned ' + f);
    }
  }

  const indexed = renderIndex(posts);

  console.log(`Pre-rendered ${written.length} blog posts into /blog/.`);
  console.log(`Wrote ${indexed} crawlable article links into blog.html.`);
  if (pruned) console.log(`Pruned ${pruned} stale file(s).`);
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log('  - ' + w);
  }
})();
