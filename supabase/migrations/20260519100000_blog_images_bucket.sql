-- Migration: storage bucket for blog images uploaded from admin/blog.
-- Pattern mirrors blog_posts: public read so site visitors can fetch images,
-- authenticated INSERT/UPDATE/DELETE so only signed-in admins can upload.
--
-- Apply: Supabase Dashboard → SQL Editor → New query → paste this file → Run.

-- 1. Create the bucket. Public so the URLs are accessible without auth.
--    file_size_limit is 5 MB; allowed_mime_types restricts to image types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS on storage.objects — Supabase enables RLS on this table by default.
--    Drop-and-create so the migration is re-runnable.

drop policy if exists "blog-images public read"   on storage.objects;
drop policy if exists "blog-images admin insert"  on storage.objects;
drop policy if exists "blog-images admin update"  on storage.objects;
drop policy if exists "blog-images admin delete"  on storage.objects;

-- Anyone (including site visitors) can GET objects in this bucket.
create policy "blog-images public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Signed-in admin can upload/replace/remove.
create policy "blog-images admin insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blog-images');

create policy "blog-images admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');

create policy "blog-images admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images');
