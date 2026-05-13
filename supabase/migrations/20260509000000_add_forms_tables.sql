-- Kanaan — additional form-capture tables (contacts, newsletter, careers, vouchers)
-- Apply via Supabase CLI:  supabase db push
-- Or paste into the SQL Editor in the Supabase dashboard.

-- =================================================================
-- contacts: contact-page enquiries
-- =================================================================
create table if not exists public.contacts (
  id           text primary key,
  created_at   timestamptz not null default now(),
  status       text not null default 'new',
  name         text,
  phone        text,
  email        text,
  subject      text,
  message      text,
  source       text,
  campaign     text,
  page         text,
  locale       text default 'en'
);

create index if not exists contacts_status_idx  on public.contacts (status);
create index if not exists contacts_created_idx on public.contacts (created_at desc);

alter table public.contacts enable row level security;

drop policy if exists "anon insert" on public.contacts;
drop policy if exists "auth select" on public.contacts;
drop policy if exists "auth update" on public.contacts;
drop policy if exists "auth delete" on public.contacts;

create policy "anon insert"
  on public.contacts for insert
  to anon, authenticated
  with check (true);

create policy "auth select"
  on public.contacts for select
  to authenticated using (true);

create policy "auth update"
  on public.contacts for update
  to authenticated using (true) with check (true);

create policy "auth delete"
  on public.contacts for delete
  to authenticated using (true);

-- =================================================================
-- newsletter: footer subscriptions
-- =================================================================
create table if not exists public.newsletter (
  id           text primary key,
  created_at   timestamptz not null default now(),
  status       text not null default 'new',
  email        text not null,
  source       text,
  campaign     text,
  page         text,
  locale       text default 'en'
);

create unique index if not exists newsletter_email_unique on public.newsletter (lower(email));
create index if not exists newsletter_created_idx on public.newsletter (created_at desc);

alter table public.newsletter enable row level security;

drop policy if exists "anon insert" on public.newsletter;
drop policy if exists "auth select" on public.newsletter;
drop policy if exists "auth update" on public.newsletter;
drop policy if exists "auth delete" on public.newsletter;

create policy "anon insert"
  on public.newsletter for insert
  to anon, authenticated
  with check (true);

create policy "auth select"
  on public.newsletter for select
  to authenticated using (true);

create policy "auth update"
  on public.newsletter for update
  to authenticated using (true) with check (true);

create policy "auth delete"
  on public.newsletter for delete
  to authenticated using (true);

-- =================================================================
-- careers: job applications (CV stored in Supabase Storage)
-- =================================================================
create table if not exists public.careers (
  id                 text primary key,
  created_at         timestamptz not null default now(),
  status             text not null default 'new',
  name               text,
  phone              text,
  email              text,
  role               text,
  experience         text,
  branch_preference  text,
  portfolio          text,
  message            text,
  cv_path            text,    -- key in the 'careers-cv' Storage bucket
  cv_filename        text,
  source             text,
  campaign           text,
  locale             text default 'en'
);

create index if not exists careers_status_idx  on public.careers (status);
create index if not exists careers_created_idx on public.careers (created_at desc);

alter table public.careers enable row level security;

drop policy if exists "anon insert" on public.careers;
drop policy if exists "auth select" on public.careers;
drop policy if exists "auth update" on public.careers;
drop policy if exists "auth delete" on public.careers;

create policy "anon insert"
  on public.careers for insert
  to anon, authenticated
  with check (true);

create policy "auth select"
  on public.careers for select
  to authenticated using (true);

create policy "auth update"
  on public.careers for update
  to authenticated using (true) with check (true);

create policy "auth delete"
  on public.careers for delete
  to authenticated using (true);

-- =================================================================
-- vouchers: gift voucher orders
-- =================================================================
create table if not exists public.vouchers (
  id           text primary key,
  created_at   timestamptz not null default now(),
  status       text not null default 'new',
  amount       text,
  recipient    text,
  sender       text,
  occasion     text,
  note         text,
  phone        text,
  email        text,
  source       text,
  campaign     text,
  locale       text default 'en'
);

create index if not exists vouchers_status_idx  on public.vouchers (status);
create index if not exists vouchers_created_idx on public.vouchers (created_at desc);

alter table public.vouchers enable row level security;

drop policy if exists "anon insert" on public.vouchers;
drop policy if exists "auth select" on public.vouchers;
drop policy if exists "auth update" on public.vouchers;
drop policy if exists "auth delete" on public.vouchers;

create policy "anon insert"
  on public.vouchers for insert
  to anon, authenticated
  with check (true);

create policy "auth select"
  on public.vouchers for select
  to authenticated using (true);

create policy "auth update"
  on public.vouchers for update
  to authenticated using (true) with check (true);

create policy "auth delete"
  on public.vouchers for delete
  to authenticated using (true);

-- =================================================================
-- Storage bucket for CV uploads
-- Run in SQL editor or via the Storage UI: create a public-read bucket named
-- "careers-cv" so signed URLs can be generated by the admin. Policies below
-- restrict writes to the anon role (insert only) and reads to authenticated.
-- =================================================================
insert into storage.buckets (id, name, public)
  values ('careers-cv', 'careers-cv', false)
  on conflict (id) do nothing;

drop policy if exists "anon upload cv" on storage.objects;
drop policy if exists "auth read cv"   on storage.objects;
drop policy if exists "auth delete cv" on storage.objects;

create policy "anon upload cv"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'careers-cv');

create policy "auth read cv"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'careers-cv');

create policy "auth delete cv"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'careers-cv');
