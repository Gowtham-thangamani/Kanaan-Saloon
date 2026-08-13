-- =================================================================
-- 20260711000000_blog_background_image.sql
--
-- Splits the blog post banner from the blog grid card image:
--   • background_image — large hero banner shown on the post page
--                        (defaults to hero_image when empty)
--   • background_alt   — alt text for that banner (defaults to hero_alt)
--
-- hero_image keeps its existing role: the blog grid card thumbnail and
-- the Open Graph / social-share fallback. This lets an admin use a
-- designed graphic (with baked-in title) on the card while using a
-- plain photo as the full-bleed background on the post page.
--
-- Both columns are nullable so existing rows are unaffected — the post
-- banner falls back to hero_image when background_image is empty.
--
-- Apply: Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- =================================================================

alter table public.blog_posts
  add column if not exists background_image text,
  add column if not exists background_alt   text;

comment on column public.blog_posts.background_image is 'Large banner on the post page; falls back to hero_image when empty';
comment on column public.blog_posts.background_alt   is 'Alt text for the post-page banner; falls back to hero_alt';
