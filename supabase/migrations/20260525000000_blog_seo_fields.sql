-- =================================================================
-- 20260525000000_blog_seo_fields.sql
--
-- Adds full per-post SEO control to blog_posts:
--   • meta_title       — overrides <title> when set (default: title)
--   • meta_description — overrides <meta description> (default: excerpt)
--   • focus_keyword    — internal SEO tracking, not rendered
--   • canonical_url    — overrides <link rel="canonical"> when set
--   • og_image         — Open Graph / Twitter card image (default: hero_image)
--   • og_title         — Open Graph title (default: meta_title or title)
--   • og_description   — Open Graph description (default: meta_description)
--   • schema_type      — JSON-LD type (default 'BlogPosting'; 'Article', 'NewsArticle' also valid)
--   • noindex          — when true, public page sends robots: noindex,nofollow
--
-- All columns are nullable so existing rows are unaffected; the public site
-- falls back to title/excerpt/hero_image when a field is empty.
-- =================================================================

alter table public.blog_posts
  add column if not exists meta_title       text,
  add column if not exists meta_description text,
  add column if not exists focus_keyword    text,
  add column if not exists canonical_url    text,
  add column if not exists og_image         text,
  add column if not exists og_title         text,
  add column if not exists og_description   text,
  add column if not exists schema_type      text default 'BlogPosting',
  add column if not exists noindex          boolean not null default false;

comment on column public.blog_posts.meta_title       is 'SEO title override; falls back to title';
comment on column public.blog_posts.meta_description is 'SEO description override; falls back to excerpt';
comment on column public.blog_posts.focus_keyword    is 'Internal SEO tracking — not rendered publicly';
comment on column public.blog_posts.canonical_url    is 'Canonical override; defaults to /blog/<slug>';
comment on column public.blog_posts.og_image         is 'Open Graph image; falls back to hero_image';
comment on column public.blog_posts.og_title         is 'Open Graph title; falls back to meta_title';
comment on column public.blog_posts.og_description   is 'Open Graph description; falls back to meta_description';
comment on column public.blog_posts.schema_type      is 'JSON-LD type (BlogPosting / Article / NewsArticle)';
comment on column public.blog_posts.noindex          is 'When true, page emits robots: noindex,nofollow';
