-- =================================================================
-- 20260812000000_editor_role_exclusion.sql
--
-- Adds a blog-only "editor" role. A user tagged with
-- app_metadata.role = 'editor' (set via a one-off UPDATE — see
-- supabase/EDITOR_ACCESS.md) keeps full read/write on blog_posts and
-- the blog-images bucket (untouched below, see 20260518000000_blog_posts.sql
-- and 20260519100000_blog_images_bucket.sql) but loses access to every
-- other authenticated-only table and bucket: bookings, blocked_slots,
-- contacts, newsletter, careers (+ its CV bucket), vouchers,
-- content_sections, and pages.
--
-- Mechanism: Supabase embeds a user's app_metadata directly into the
-- JWT it issues, so `auth.jwt() -> 'app_metadata' ->> 'role'` is
-- readable from RLS with no extra setup. A plain admin has no 'role'
-- claim at all, so `coalesce(..., '') <> 'editor'` is true for them —
-- nobody else's access changes.
--
-- KNOWN LIMITATION: this is a deny-list. Any new table added later
-- that follows the "to authenticated using (true)" pattern is open to
-- the editor role by default unless it explicitly adds the same
-- `coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor'`
-- condition used throughout this file.
--
-- MIGRATION ORDER: this file must always be the LAST migration applied
-- to the project. 20260507000000_init_bookings.sql,
-- 20260509000000_add_forms_tables.sql, 20260511000000_availability.sql,
-- and tools/apply-all-missing-migrations.sql all drop-and-recreate
-- policies under these exact same names with `to authenticated using
-- (true)` and no editor exclusion. Re-running any of them AFTER this
-- file clobbers this file's policies back to fully permissive — with
-- no error and no visible change — silently restoring full access to
-- a tagged editor account. If any earlier migration or that bundle is
-- re-run for any reason, RE-RUN THIS FILE immediately afterward.
--
-- Apply: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- file -> Run. Re-runnable (drop-and-recreate).
-- =================================================================

-- =================================================================
-- bookings
-- =================================================================
drop policy if exists "auth select" on public.bookings;
drop policy if exists "auth update" on public.bookings;
drop policy if exists "auth delete" on public.bookings;

create policy "auth select"
  on public.bookings for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth update"
  on public.bookings for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth delete"
  on public.bookings for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- blocked_slots
-- =================================================================
drop policy if exists "auth manage blocks" on public.blocked_slots;

create policy "auth manage blocks"
  on public.blocked_slots for all
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- contacts
-- =================================================================
drop policy if exists "auth select" on public.contacts;
drop policy if exists "auth update" on public.contacts;
drop policy if exists "auth delete" on public.contacts;

create policy "auth select"
  on public.contacts for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth update"
  on public.contacts for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth delete"
  on public.contacts for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- newsletter
-- =================================================================
drop policy if exists "auth select" on public.newsletter;
drop policy if exists "auth update" on public.newsletter;
drop policy if exists "auth delete" on public.newsletter;

create policy "auth select"
  on public.newsletter for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth update"
  on public.newsletter for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth delete"
  on public.newsletter for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- careers (table) + careers-cv storage bucket
-- =================================================================
drop policy if exists "auth select" on public.careers;
drop policy if exists "auth update" on public.careers;
drop policy if exists "auth delete" on public.careers;

create policy "auth select"
  on public.careers for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth update"
  on public.careers for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth delete"
  on public.careers for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

drop policy if exists "auth read cv"   on storage.objects;
drop policy if exists "auth delete cv" on storage.objects;

create policy "auth read cv"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'careers-cv'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor'
  );

create policy "auth delete cv"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'careers-cv'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor'
  );

-- =================================================================
-- vouchers
-- =================================================================
drop policy if exists "auth select" on public.vouchers;
drop policy if exists "auth update" on public.vouchers;
drop policy if exists "auth delete" on public.vouchers;

create policy "auth select"
  on public.vouchers for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth update"
  on public.vouchers for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "auth delete"
  on public.vouchers for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- content_sections (branches / offers / testimonials / banners)
-- =================================================================
drop policy if exists "content auth insert" on public.content_sections;
drop policy if exists "content auth update" on public.content_sections;
drop policy if exists "content auth delete" on public.content_sections;

create policy "content auth insert"
  on public.content_sections for insert
  to authenticated
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "content auth update"
  on public.content_sections for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "content auth delete"
  on public.content_sections for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- pages
-- =================================================================
drop policy if exists "pages auth insert" on public.pages;
drop policy if exists "pages auth update" on public.pages;
drop policy if exists "pages auth delete" on public.pages;

create policy "pages auth insert"
  on public.pages for insert
  to authenticated
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "pages auth update"
  on public.pages for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

create policy "pages auth delete"
  on public.pages for delete
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor');

-- =================================================================
-- blog_posts and the blog-images bucket are intentionally UNCHANGED —
-- the editor role keeps full CRUD there via the existing
-- "to authenticated using (true)" policies from
-- 20260518000000_blog_posts.sql and 20260519100000_blog_images_bucket.sql.
-- =================================================================

-- =================================================================
-- Verification — after applying, run each block below manually in a
-- fresh SQL Editor query (each is its own transaction so `set local`
-- only lasts for it, and `rollback` guarantees no state is left behind).
-- =================================================================

-- 1) Simulated editor: every count must be 0 EXCEPT blog_posts.
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"editor"}}';
--   select 'bookings' t, count(*) from public.bookings
--   union all select 'contacts', count(*) from public.contacts
--   union all select 'newsletter', count(*) from public.newsletter
--   union all select 'careers', count(*) from public.careers
--   union all select 'vouchers', count(*) from public.vouchers
--   union all select 'content_sections', count(*) from public.content_sections
--   union all select 'pages', count(*) from public.pages
--   union all select 'blocked_slots', count(*) from public.blocked_slots
--   union all select 'blog_posts (expect > 0)', count(*) from public.blog_posts;
-- rollback;

-- 2) Simulated normal admin (no role claim): every count must be
--    unchanged / > 0 where rows exist — confirms nothing broke for
--    everyone else.
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"role":"authenticated"}';
--   select 'bookings' t, count(*) from public.bookings
--   union all select 'content_sections', count(*) from public.content_sections
--   union all select 'blog_posts', count(*) from public.blog_posts;
-- rollback;
