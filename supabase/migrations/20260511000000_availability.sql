-- Kanaan — slot availability backed by Supabase
-- Apply via: npx supabase db push  (or paste into the SQL editor)
--
-- This migration replaces the front-end "70% mock" availability with a real
-- check against existing bookings + admin-blocked slots:
--   1. Adds a `duration_minutes` column to `bookings` (default 30, enforced 30..240).
--   2. Creates a `blocked_slots` table so staff can manually block ranges
--      (e.g. "therapist Ahmed on leave Wed 14:00-18:00").
--   3. Creates a SECURITY DEFINER function `get_taken_slots(branch, date)` that
--      returns every 30-minute interval already occupied by either a booking
--      or an admin block. Anonymous users may EXECUTE this function but cannot
--      read the underlying tables (PII stays locked behind authenticated RLS).

-- =================================================================
-- 1. bookings: duration_minutes column
-- =================================================================
alter table public.bookings
  add column if not exists duration_minutes integer not null default 30
    check (duration_minutes between 30 and 240);

-- =================================================================
-- 2. blocked_slots: staff-managed manual blocks
-- =================================================================
create table if not exists public.blocked_slots (
  id               uuid primary key default gen_random_uuid(),
  branch           text not null,
  blocked_date     date not null,
  blocked_time     time not null,
  duration_minutes integer not null default 60
    check (duration_minutes between 30 and 720),
  reason           text,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id)
);

create index if not exists blocked_slots_branch_date_idx
  on public.blocked_slots (branch, blocked_date);

alter table public.blocked_slots enable row level security;

drop policy if exists "auth manage blocks" on public.blocked_slots;
create policy "auth manage blocks"
  on public.blocked_slots for all
  to authenticated
  using (true)
  with check (true);

-- =================================================================
-- 3. get_taken_slots(branch, date) — RPC for availability lookups
--    SECURITY DEFINER so anonymous callers cannot see the underlying
--    bookings table; only the time list is returned.
-- =================================================================
create or replace function public.get_taken_slots(
  branch_name text,
  target_date date
)
returns table (taken_time time)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec      record;
  step_min integer := 30;
  slot     time;
  i        integer;
begin
  if branch_name is null or target_date is null then
    return;
  end if;

  -- Expand each booking into the 30-minute slots it occupies.
  for rec in
    select booking_time, duration_minutes
    from public.bookings
    where branch        = branch_name
      and booking_date  = target_date
      and status        in ('new', 'confirmed')
      and booking_time is not null
  loop
    i := 0;
    while i < rec.duration_minutes loop
      slot := rec.booking_time + (i || ' minutes')::interval;
      taken_time := slot;
      return next;
      i := i + step_min;
    end loop;
  end loop;

  -- Expand each manual block (admin-defined) into 30-minute slots.
  for rec in
    select blocked_time, duration_minutes
    from public.blocked_slots
    where branch       = branch_name
      and blocked_date = target_date
  loop
    i := 0;
    while i < rec.duration_minutes loop
      slot := rec.blocked_time + (i || ' minutes')::interval;
      taken_time := slot;
      return next;
      i := i + step_min;
    end loop;
  end loop;
end;
$$;

-- Allow anonymous and authenticated callers to EXECUTE this function only.
-- The function returns no PII — just a list of times — so this is safe.
revoke all on function public.get_taken_slots(text, date) from public;
grant  execute on function public.get_taken_slots(text, date) to anon, authenticated;
