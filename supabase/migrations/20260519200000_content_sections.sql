-- Migration: generic content store for admin-editable site sections.
--
-- One row per "section" (e.g. 'offers', 'testimonials', 'site', 'banners'),
-- with the JSON payload in a single jsonb column. Reads are public; writes
-- require authenticated admin (same pattern as bookings + blog_posts).
--
-- Apply: Supabase Dashboard → SQL Editor → New query → paste this → Run.

create table if not exists public.content_sections (
  key        text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.content_sections_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_content_sections_updated_at on public.content_sections;
create trigger trg_content_sections_updated_at
  before update on public.content_sections
  for each row execute function public.content_sections_set_updated_at();

alter table public.content_sections enable row level security;

drop policy if exists "content public read"   on public.content_sections;
drop policy if exists "content auth insert"   on public.content_sections;
drop policy if exists "content auth update"   on public.content_sections;
drop policy if exists "content auth delete"   on public.content_sections;

-- Anyone (including site visitors) can read any section.
create policy "content public read"
  on public.content_sections
  for select
  to anon, authenticated
  using (true);

-- Signed-in admins can insert/update/delete.
create policy "content auth insert"
  on public.content_sections
  for insert
  to authenticated
  with check (true);

create policy "content auth update"
  on public.content_sections
  for update
  to authenticated
  using (true)
  with check (true);

create policy "content auth delete"
  on public.content_sections
  for delete
  to authenticated
  using (true);
