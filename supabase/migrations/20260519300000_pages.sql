-- Migration: per-page editable body content, keyed by URL path.
--
-- A row exists only for a page that the admin has overridden — for every other
-- page, the live site keeps rendering the hard-coded HTML. The runtime checks
-- this table on page load and, if a row matches the current path, swaps the
-- [data-page-body] region's contents with the DB body_html.
--
-- Apply: Supabase Dashboard -> SQL Editor -> New query -> paste this -> Run.

create table if not exists public.pages (
  path             text primary key,
  title            text default '',
  meta_description text default '',
  body_html        text default '',
  updated_at       timestamptz not null default now()
);

create or replace function public.pages_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pages_updated_at on public.pages;
create trigger trg_pages_updated_at
  before update on public.pages
  for each row execute function public.pages_set_updated_at();

alter table public.pages enable row level security;

drop policy if exists "pages public read"  on public.pages;
drop policy if exists "pages auth insert"  on public.pages;
drop policy if exists "pages auth update"  on public.pages;
drop policy if exists "pages auth delete"  on public.pages;

create policy "pages public read"
  on public.pages for select
  to anon, authenticated
  using (true);

create policy "pages auth insert"
  on public.pages for insert
  to authenticated
  with check (true);

create policy "pages auth update"
  on public.pages for update
  to authenticated
  using (true)
  with check (true);

create policy "pages auth delete"
  on public.pages for delete
  to authenticated
  using (true);
