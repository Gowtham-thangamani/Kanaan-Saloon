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

-- Row-level security: anon may INSERT only. Reads/updates/deletes are restricted
-- to authenticated users (admins log in via Supabase Auth in the admin panel).
alter table public.bookings enable row level security;

drop policy if exists "anon insert"        on public.bookings;
drop policy if exists "anon select"        on public.bookings;
drop policy if exists "anon update status" on public.bookings;
drop policy if exists "auth select"        on public.bookings;
drop policy if exists "auth update"        on public.bookings;
drop policy if exists "auth delete"        on public.bookings;

create policy "anon insert"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

create policy "auth select"
  on public.bookings for select
  to authenticated
  using (true);

create policy "auth update"
  on public.bookings for update
  to authenticated
  using (true)
  with check (true);

create policy "auth delete"
  on public.bookings for delete
  to authenticated
  using (true);

-- Optional: auto-cleanup older than 2 years (uncomment to enable)
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'cleanup-old-bookings',
--   '0 3 * * 0',
--   $$delete from public.bookings where created_at < now() - interval '2 years'$$
-- );
