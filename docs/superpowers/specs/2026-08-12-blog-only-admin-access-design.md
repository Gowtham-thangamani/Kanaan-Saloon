# Blog-only admin access for the SEO specialist

## Context

The client asked to give an SEO specialist (`israhsaleh2000@gmail.com`) access to
create/edit blog posts, explicitly **not** full backend access. The current admin
panel (`/admin/*`) has a single flat Supabase Auth login: any signed-in user reaches
every admin page and, more importantly, every Supabase table — including customer
PII (`bookings`, `contacts`, `careers` with CVs, `newsletter`, `vouchers`) and site
config (`content_sections`, `pages`, `blocked_slots`). There is no existing
role/permission system to scope her to blog only.

## Goal

Give her a normal admin login that can fully manage blog posts (create, edit,
publish/unpublish, delete — full CRUD on `blog_posts` and the `blog-images`
storage bucket) while being unable to read or write anything else — enforced at
the database level, not just hidden in the UI.

## Approach

**Tag her user with an `app_metadata.role = 'editor'` claim, exclude that role from
every non-blog RLS policy, and centralize the redirect/UI-hiding in the one shared
auth helper every admin page already calls.**

Supabase embeds a user's `app_metadata` directly into the JWT it issues at login
(and on every token refresh), so `auth.jwt() -> 'app_metadata' ->> 'role'` is
available to Postgres RLS policies with no extra plumbing (no auth hooks, no new
tables). This makes the database itself the enforcement boundary — even if
browser-side state were tampered with, her bearer token still can't read rows
outside `blog_posts`.

### Why this over the alternatives

- **A serverless proxy restricting API access per table** — the site is static
  and has no server today; this would mean standing up new infrastructure for a
  one-person, low-risk need. Rejected as overkill.
- **A standalone lightweight blog-only tool with a shared password** — less code,
  but no per-user audit trail (`created_by`/session tied to her own account), no
  forgot-password flow, and it duplicates the Quill rich-text editor `admin/blog.html`
  already has. Reusing the existing panel via role-gating reuses proven code for
  much less work.

## Architecture

### 1. Database (RLS policy changes, one new migration file)

`blog_posts` and the `blog-images` storage bucket keep their existing "any
authenticated user has full access" policies — unchanged, so she (and every other
admin) keeps full CRUD there.

Every other authenticated-write policy gets rewritten to add
`coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor'` to its `USING`
/`WITH CHECK` clause, so the `editor` role is excluded while every existing admin
(who has no `role` claim at all) is unaffected:

- `public.bookings`
- `public.blocked_slots`
- `public.contacts`
- `public.newsletter`
- `public.careers` (table) + the `careers-cv` storage bucket policies
- `public.vouchers`
- `public.content_sections` (branches/offers/testimonials/banners)
- `public.pages`

This is a mechanical drop-and-recreate of each existing policy (same pattern the
codebase already uses for re-runnable migrations), not a schema change — no new
columns, no new tables.

### 2. Account provisioning (manual, in the Supabase dashboard — no live DB access
   from here)

1. Create her Auth user the same way as any admin: Authentication → Users → Add
   user, tick **Auto Confirm User** (same step documented in `SUPABASE_SETUP.md`
   Step 2.5).
2. Run one SQL statement (provided in the migration/instructions) that sets
   `raw_app_meta_data = raw_app_meta_data || '{"role":"editor"}'::jsonb` for her
   specific email — this is what the RLS policies above check.
3. She sets her own password via the existing "Forgot password?" link on
   `/admin/index.html` — no shared credentials, same flow every admin already uses.

### 3. Frontend (`admin/admin.js` only — no per-page edits)

Every one of the 12 admin pages already calls `KANAAN_ADMIN.requireAuth()` at
load. That function is extended to:

- Read `role` off the already-stored login response (`session.user.app_metadata.role`
  — Supabase's login response already includes this; no new fetch needed).
- If `role === 'editor'` and the current page isn't `blog.html` (or `index.html`/
  `reset.html`), redirect to `blog.html`.
- Hide every sidebar nav link except **Blog** and **Sign out** when role is
  `editor`, via a DOM pass over `.admin-side__nav a` (the nav markup is identical
  and duplicated inline across pages, so one generic pass covers all of them
  rather than editing markup in 12 files).

This redirect/hide is a UX convenience only — the actual access boundary is the
RLS layer in step 1, so there's no privilege-escalation risk if this logic were
ever bypassed client-side.

## Error handling

- If the SQL to tag her role is never run (human error), she'd log in as a normal
  full admin — a fail-open risk worth calling out explicitly in the hand-off
  instructions, with a one-line verification query to confirm the tag took before
  sharing her password.
- If a future table is added following the existing "any authenticated user"
  pattern and this exclusion is forgotten, she'd have access to it by default —
  documented as a known limitation (see below), not solved now.

## Known limitation

This is a deny-list, not an allow-list: new tables added later must explicitly
add the same `role <> 'editor'` exclusion or they default to open. The migration
file will carry a comment flagging this so future schema work doesn't silently
regress it.

## Out of scope

- The separate Google Search Console verification task (tracked/handled outside
  this spec — no code dependency between the two).
- Building a general-purpose multi-role permission system. This is a single
  hard-coded `editor` vs. default-admin distinction, sized to the one account
  being requested.
