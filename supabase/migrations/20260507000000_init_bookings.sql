-- Kanaan Bookings — initial schema
-- Apply via Supabase CLI:  supabase db push
-- Or paste into SQL Editor in the Supabase dashboard.

create table if not exists public.bookings (
  id           text primary key,
  created_at   timestamptz not null default now(),
  status       text not null default 'new',
  branch       text,
  service      text,
  booking_date date,
  booking_time time,
  name         text,
  phone        text,
  email        text,
  dob          date,
  message      text,
  source       text,
  campaign     text,
  locale       text default 'en'
);

create index if not exists bookings_phone_idx   on public.bookings (phone);
create index if not exists bookings_branch_idx  on public.bookings (branch);
create index if not exists bookings_status_idx  on public.bookings (status);
create index if not exists bookings_created_idx on public.bookings (created_at desc);

-- Row-level security: anon role can insert/select/update.
-- Tighten later by replacing `anon` with `authenticated` once you add real auth.
alter table public.bookings enable row level security;

drop policy if exists "anon insert"        on public.bookings;
drop policy if exists "anon select"        on public.bookings;
drop policy if exists "anon update status" on public.bookings;

create policy "anon insert"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

create policy "anon select"
  on public.bookings for select
  to anon, authenticated
  using (true);

create policy "anon update status"
  on public.bookings for update
  to anon, authenticated
  using (true)
  with check (true);

-- Optional: auto-cleanup older than 2 years (uncomment to enable)
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'cleanup-old-bookings',
--   '0 3 * * 0',
--   $$delete from public.bookings where created_at < now() - interval '2 years'$$
-- );
