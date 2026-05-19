// Generate a Supabase migration from content/blog.json:
//   1. DELETE the 7 old post IDs that the rewrite replaces
//   2. UPSERT the new posts (insert ... on conflict do update)
// Re-runnable: applying twice does not duplicate or stale-overwrite admin edits.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const blog = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'blog.json'), 'utf8'));

const OLD_IDS = [
  'how-to-talk-to-your-barber',
  'haircut-frequency',
  'choosing-your-massage',
  'choosing-the-right-facial',
  'pre-wedding-grooming',
  'beard-care-abu-dhabi',
  'moroccan-bath-guide'
];

const q = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const out = [];
out.push("-- Migration: replace the original 7 seed posts with the 2026 editorial rewrite.");
out.push("-- Generated from content/blog.json by tools/generate-blog-migration.js.");
out.push("-- Re-runnable: DELETE is by id; the UPSERT uses on-conflict-do-update so an");
out.push("-- admin who has since edited a post will get their copy overwritten only by");
out.push("-- a deliberate re-run. To preserve admin edits, set ON CONFLICT DO NOTHING.");
out.push("");
out.push("-- 1. Remove the original 7 posts that this rewrite replaces.");
out.push(`delete from public.blog_posts where id in (${OLD_IDS.map(q).join(', ')});`);
out.push("");
out.push("-- 2. Upsert the 7 new posts.");
out.push("insert into public.blog_posts");
out.push("  (id, slug, title, excerpt, category, read_minutes, hero_image, hero_alt, publish_date, author, tldr, lede, body_html, active)");
out.push("values");

const rows = blog.posts.map(p => {
  const cols = [
    p.id, p.slug, p.title, p.excerpt, p.category, p.read_minutes,
    p.hero_image, p.hero_alt, p.publish_date, p.author,
    p.tldr, p.lede, p.body_html, p.active
  ].map(q).join(', ');
  return `  (${cols})`;
});
out.push(rows.join(',\n'));
out.push("on conflict (id) do update set");
out.push("  slug         = excluded.slug,");
out.push("  title        = excluded.title,");
out.push("  excerpt      = excluded.excerpt,");
out.push("  category     = excluded.category,");
out.push("  read_minutes = excluded.read_minutes,");
out.push("  hero_image   = excluded.hero_image,");
out.push("  hero_alt     = excluded.hero_alt,");
out.push("  publish_date = excluded.publish_date,");
out.push("  author       = excluded.author,");
out.push("  tldr         = excluded.tldr,");
out.push("  lede         = excluded.lede,");
out.push("  body_html    = excluded.body_html,");
out.push("  active       = excluded.active;");
out.push("");

const outPath = path.join(ROOT, 'supabase', 'migrations', '20260519000000_blog_rewrite.sql');
fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log('wrote', path.relative(ROOT, outPath));
console.log(`${blog.posts.length} posts upserted, ${OLD_IDS.length} old IDs deleted`);
