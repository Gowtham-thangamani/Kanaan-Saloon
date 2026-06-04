-- =================================================================
-- 20260525010000_blog_seo_specialist.sql
--
-- Phase 2 of blog SEO. Adds the fields a senior SEO would expect on
-- top of the basics in 20260525000000_blog_seo_fields.sql:
--
--   • tags             — content tags / keywords (text[]).
--                        Used in Article schema `keywords`, in the editor's
--                        SEO checks, and as a basis for tag-archive pages.
--   • og_image_width   — pixel width of og_image, lets ImageObject in
--   • og_image_height    JSON-LD declare exact dimensions for Google.
--   • og_image_alt     — alt text for the OG/social image (often differs
--                        from hero_alt — share previews may not show hero).
--   • old_slugs        — previous slugs this post lived at (text[]).
--                        Lets the public page emit a canonical pointer if
--                        the user lands on an old URL; also enables a
--                        future 301-redirect map without touching the DB.
--
-- All columns are nullable / default-empty so existing rows are unaffected.
-- =================================================================

alter table public.blog_posts
  add column if not exists tags             text[] default '{}',
  add column if not exists og_image_width   integer,
  add column if not exists og_image_height  integer,
  add column if not exists og_image_alt     text,
  add column if not exists old_slugs        text[] default '{}';

comment on column public.blog_posts.tags            is 'Content tags; rendered as Article.keywords and used by the editor SEO score';
comment on column public.blog_posts.og_image_width  is 'OG image pixel width — surfaces as ImageObject.width in JSON-LD';
comment on column public.blog_posts.og_image_height is 'OG image pixel height — surfaces as ImageObject.height in JSON-LD';
comment on column public.blog_posts.og_image_alt    is 'Alt text for the share-card image (separate from hero_alt)';
comment on column public.blog_posts.old_slugs       is 'Previously-used slugs for this post (for 301 redirect handling)';

-- GIN index on tags so tag-archive pages can filter quickly.
create index if not exists idx_blog_posts_tags on public.blog_posts using gin (tags);
