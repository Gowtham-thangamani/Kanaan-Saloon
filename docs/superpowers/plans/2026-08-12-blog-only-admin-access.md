# Blog-only Admin Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user tagged `app_metadata.role = 'editor'` fully manage blog posts (via the existing `admin/blog.html` panel) while being denied read/write on every other Supabase table and storage bucket — enforced by Postgres RLS, not just hidden in the UI.

**Architecture:** Supabase embeds a user's `app_metadata` in the JWT it issues, so a single SQL migration adds a `role <> 'editor'` condition to every non-blog table/bucket's existing `to authenticated` policies. `blog_posts` and the `blog-images` bucket are left untouched. `admin/admin.js`'s existing `requireAuth()` — already called by all 12 admin pages — gets one small extension to redirect an editor to `blog.html`, plus a DOM pass to hide the other sidebar links there.

**Tech Stack:** Static HTML/vanilla JS admin panel, Supabase Postgres + Auth + Storage (REST, no server). No build step, no test runner, no CI — this repo has no `package.json`/test framework, so verification is manual: SQL Editor role-simulation queries for the DB layer, browser/localStorage checks for the JS layer. Deploy is a manual file upload (Hostinger hPanel) done separately, outside this plan.

## Global Constraints

- Every RLS policy added or rewritten in this plan must use the exact condition `coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor'` verbatim — a normal admin has no `role` claim at all, so this evaluates `true` (unaffected) for them and `false` only for a tagged editor.
- `blog_posts` and the `blog-images` storage bucket policies (from `20260518000000_blog_posts.sql` and `20260519100000_blog_images_bucket.sql`) are **not** touched by this plan — the editor keeps full CRUD there via their existing "any authenticated user" policies.
- All DB/schema changes are additive drop-and-recreate of existing named policies, matching this repo's existing migration convention (see `supabase/migrations/20260514000000_fix_bookings_rls.sql` for the pattern). No new tables, no new columns.
- I (the agent/implementer) have no live Supabase credentials and cannot run SQL against production. Tasks 1 and 2 produce files; actually applying them (pasting into the Supabase SQL Editor, creating the Auth user) is a manual step the repo owner performs afterward — each task calls out exactly which sub-steps are "you do this outside the repo."

---

### Task 1: RLS migration — exclude the `editor` role from every non-blog table

**Files:**
- Create: `supabase/migrations/20260812000000_editor_role_exclusion.sql`

**Interfaces:**
- Consumes: existing policy names on `public.bookings`, `public.blocked_slots`, `public.contacts`, `public.newsletter`, `public.careers`, `public.vouchers`, `public.content_sections`, `public.pages`, and the `careers-cv` bucket's `storage.objects` policies (all defined in earlier migrations, listed in the file below).
- Produces: the string `coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'editor'` — this exact condition is the contract Task 3/4's manual verification and any future migration must reuse to keep a table admin-only.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260812000000_editor_role_exclusion.sql` with this exact content:

```sql
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
```

- [ ] **Step 2: Append the verification block to the same file**

Add this to the bottom of the same migration file — it is documentation for a manual check, not something that runs automatically:

```sql

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
```

- [ ] **Step 3: (you do this outside the repo) Apply and verify in Supabase**

In the Supabase Dashboard → SQL Editor:
1. Paste the full migration file (Steps 1+2's content) → Run. Expect "Success. No rows returned."
2. Run verification block 1 (editor simulation) → confirm every row is `0` except `blog_posts (expect > 0)`.
3. Run verification block 2 (normal admin simulation) → confirm counts are unchanged from before this migration (i.e., still whatever they were — this just proves normal admins aren't newly blocked).

If verification block 1 shows a nonzero count anywhere except `blog_posts`, do not proceed to Task 2 — that table's policy needs fixing first.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260812000000_editor_role_exclusion.sql
git commit -m "Add editor-role RLS exclusion so a tagged user only reaches blog_posts"
```

---

### Task 2: Provisioning runbook for granting editor access

**Files:**
- Create: `supabase/EDITOR_ACCESS.md`

**Interfaces:**
- Consumes: Task 1's migration must already be applied (documented as a prerequisite in this file).
- Produces: a reusable runbook — not just for `israhsaleh2000@gmail.com`, for any future blog-only account.

- [ ] **Step 1: Write the runbook**

Create `supabase/EDITOR_ACCESS.md`:

```markdown
# Granting blog-only "editor" access

Use this whenever someone needs create/edit access to blog posts only,
without full admin access to bookings, leads, or site content. Currently
used for the SEO specialist: israhsaleh2000@gmail.com.

**Prerequisite:** `supabase/migrations/20260812000000_editor_role_exclusion.sql`
must already be applied (Supabase Dashboard → SQL Editor → paste → Run).
Without it, the account below would be a normal full admin.

## 1. Create her Auth user

Supabase Dashboard → Authentication → Users → Add user → Create new user.
- Email: the account's email (e.g. `israhsaleh2000@gmail.com`)
- Tick **Auto Confirm User**
- Leave the password blank if she'll set her own via step 3 (recommended);
  otherwise set a temporary one and share it over a secure channel.

## 2. Tag the account as an editor

SQL Editor → New query → paste, editing the email → Run:

\`\`\`sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'editor')
where email = 'israhsaleh2000@gmail.com';
\`\`\`

Verify it took:

\`\`\`sql
select email, raw_app_meta_data -> 'role' as role
from auth.users
where email = 'israhsaleh2000@gmail.com';
\`\`\`

Expected: one row, `role` = `"editor"`. **If `role` is null, do not hand out
the login** — the account currently has full admin access.

## 3. Have her set her password

Send her to `https://www.kanaanspa.ae/admin/` → "Forgot password?" → enter
her email. She gets a reset link (valid 1 hour) and chooses her own
password — no shared credentials, same flow every admin already uses.

## 4. Confirm the scope

Log in as her (or watch her log in) and confirm:
- She lands on / can only reach `admin/blog.html`.
- The sidebar shows only "Blog" and "Sign out".
- Visiting `admin/leads.html` (or any other admin URL) directly bounces
  her back to `admin/blog.html`.

## Removing access later

Supabase Dashboard → Authentication → Users → find her → Delete user.
This immediately invalidates her session and login.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/EDITOR_ACCESS.md
git commit -m "Add runbook for provisioning blog-only editor accounts"
```

---

### Task 3: `admin.js` — role helper + redirect editors away from non-blog pages

**Files:**
- Modify: `admin/admin.js:63-70` (insert a new helper function after `clearSession()`)
- Modify: `admin/admin.js:240-243` (extend `requireAuth()`)

**Interfaces:**
- Consumes: `readSession()` (existing private function in the same closure, returns the stored Supabase login response or `null`).
- Produces: `editorRole()` — a new private function returning `'editor'` or `null`. Task 4 consumes this exact function name.

- [ ] **Step 1: Manually verify the "before" gap**

This repo has no JS test runner, so verification is a manual browser check using devtools.

1. Open `admin/branches.html` in a browser (double-click the file, or via your usual local server) while **not** logged in — you should land on / be redirected to `index.html`. This confirms the existing `requireAuth()` baseline still works before you change anything.
2. Open devtools console on `admin/branches.html` and run:
   ```js
   localStorage.setItem('kanaan_admin_supa_session', JSON.stringify({
     access_token: 'fake', expires_at: Math.floor(Date.now()/1000) + 3600,
     user: { app_metadata: { role: 'editor' } }
   }));
   location.reload();
   ```
3. **Current (pre-fix) behavior:** the page loads normally — an editor-tagged session reaches `branches.html` with no redirect. This is the gap Step 2 fixes. (Leave this fake session in localStorage — you'll reuse it in Step 4.)

- [ ] **Step 2: Add the `editorRole()` helper**

In `admin/admin.js`, find:

```js
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  /* Auth headers — uses access_token if logged in, otherwise anon key.
```

Replace with:

```js
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  /* Returns 'editor' for a blog-only account, or null for a normal admin
     (no role claim) or a signed-out visitor. Reads the role Supabase
     embedded in the login response's user.app_metadata — same value the
     server-side RLS policies check from the JWT, so this never grants
     UI access the database would refuse. */
  function editorRole() {
    const s = readSession();
    return (s && s.user && s.user.app_metadata && s.user.app_metadata.role) || null;
  }

  /* Auth headers — uses access_token if logged in, otherwise anon key.
```

- [ ] **Step 3: Extend `requireAuth()` to redirect editors**

In `admin/admin.js`, find:

```js
    requireAuth() {
      if (!this.isLoggedIn()) { location.href = 'index.html'; return false; }
      return true;
    },
```

Replace with:

```js
    requireAuth() {
      if (!this.isLoggedIn()) { location.href = 'index.html'; return false; }
      if (editorRole() === 'editor') {
        const page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
        if (page !== 'blog') { location.href = 'blog.html'; return false; }
      }
      return true;
    },
```

- [ ] **Step 4: Manually verify the fix**

With the fake editor session still in localStorage from Step 1:
1. Reload `admin/branches.html` → expect an immediate redirect to `blog.html`.
2. Navigate to `admin/blog.html` directly → expect it stays (no redirect). The page's own `loadBlogPosts()` call will fail/toast an error since the `access_token` is fake — that's expected and unrelated to what you're checking here.
3. Clean up so you don't confuse yourself later:
   ```js
   localStorage.removeItem('kanaan_admin_supa_session');
   ```
4. Log in normally as a real admin → confirm every admin page still loads with no redirect (the "no role claim" case is unaffected).

- [ ] **Step 5: Commit**

```bash
git add admin/admin.js
git commit -m "Redirect editor-role admin sessions to blog.html only"
```

---

### Task 4: `admin.js` — hide non-blog sidebar links for editors

**Files:**
- Modify: `admin/admin.js:28-43` (add a new `DOMContentLoaded` listener after the existing theme-toggle one)

**Interfaces:**
- Consumes: `editorRole()` (from Task 3).

- [ ] **Step 1: Manually verify the "before" gap**

1. In devtools console on `admin/blog.html`, set the fake editor session again:
   ```js
   localStorage.setItem('kanaan_admin_supa_session', JSON.stringify({
     access_token: 'fake', expires_at: Math.floor(Date.now()/1000) + 3600,
     user: { app_metadata: { role: 'editor' } }
   }));
   location.reload();
   ```
2. **Current (pre-fix) behavior:** the sidebar still shows every link (Dashboard, Leads, Scan, Blocked slots, Offers, Branches, Banners, Testimonials, Blog, Pages, Integrations, Settings) even though clicking any of them (per Task 3) would bounce her straight back. This is the cosmetic gap this task fixes.

- [ ] **Step 2: Add the nav-hiding listener**

In `admin/admin.js`, find the end of the existing theme-toggle block:

```js
      sideUser.appendChild(btn);
    });
```

Replace with:

```js
      sideUser.appendChild(btn);
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (editorRole() !== 'editor') return;
      document.querySelectorAll('.admin-side__nav a').forEach(a => {
        const href = (a.getAttribute('href') || '').replace(/\.html$/, '');
        if (href !== 'blog') a.remove();
      });
    });
```

(Note: this becomes the *second* `document.addEventListener('DOMContentLoaded', ...)` call in the file — both fire independently, which is fine.)

- [ ] **Step 3: Manually verify the fix**

With the fake editor session still set from Step 1, reload `admin/blog.html` → expect the sidebar now shows only "Blog" (the link) and the "Signed in · Sign out" row — every other link is gone.

Then:
```js
localStorage.removeItem('kanaan_admin_supa_session');
```
Reload and log in as a real admin → confirm the full sidebar still shows every link (unaffected).

- [ ] **Step 4: Commit**

```bash
git add admin/admin.js
git commit -m "Hide non-blog sidebar links for editor-role admin sessions"
```

---

## After this plan is merged

Follow `supabase/EDITOR_ACCESS.md` to actually apply the migration to production and create the SEO specialist's account — those are manual dashboard steps, not part of this plan's automated tasks.
