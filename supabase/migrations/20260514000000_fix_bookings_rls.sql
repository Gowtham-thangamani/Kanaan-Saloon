-- Hotfix: restore the RLS policy that lets anonymous bookings INSERT
-- Symptom: customer submits booking -> HTTP 401 / Postgres 42501
--   "new row violates row-level security policy for table 'bookings'"
-- Cause: The "anon insert" policy from 20260507000000_init_bookings.sql
--   was dropped or altered manually in the Supabase dashboard.
--
-- Apply by running this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- (or via Supabase CLI: `supabase db push`)

-- Make sure RLS is enabled.
alter table public.bookings enable row level security;

-- Drop any conflicting policies first (idempotent).
drop policy if exists "anon insert"        on public.bookings;
drop policy if exists "anon select"        on public.bookings;
drop policy if exists "anon update status" on public.bookings;
drop policy if exists "auth select"        on public.bookings;
drop policy if exists "auth update"        on public.bookings;
drop policy if exists "auth delete"        on public.bookings;
drop policy if exists "public insert"      on public.bookings;

-- Public customers can INSERT new bookings (no read/edit access).
create policy "anon insert"
  on public.bookings
  for insert
  to anon, authenticated
  with check (true);

-- Signed-in admins can SELECT every row.
create policy "auth select"
  on public.bookings
  for select
  to authenticated
  using (true);

-- Signed-in admins can UPDATE status/notes.
create policy "auth update"
  on public.bookings
  for update
  to authenticated
  using (true)
  with check (true);

-- Signed-in admins can DELETE.
create policy "auth delete"
  on public.bookings
  for delete
  to authenticated
  using (true);

-- =================================================================
-- Verification: after running, this should return four rows
-- =================================================================
-- select policyname, cmd, roles, with_check, qual
-- from pg_policies
-- where schemaname = 'public' and tablename = 'bookings';
