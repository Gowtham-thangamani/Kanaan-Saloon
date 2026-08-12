# Granting blog-only "editor" access

Use this whenever someone needs create/edit access to blog posts only,
without full admin access to bookings, leads, or site content. Currently
used for the SEO specialist: israhsaleh2000@gmail.com.

**Prerequisite:** `supabase/migrations/20260812000000_editor_role_exclusion.sql`
must already be applied (Supabase Dashboard → SQL Editor → paste → Run).
Without it, the account below would be a normal full admin.

**Important — keep it last:** if anyone ever re-pastes an earlier
migration (the ones named in `START_HERE.md` / `LAUNCH_CHECKLIST.md`) or
re-runs `tools/apply-all-missing-migrations.sql` — for example while
troubleshooting an unrelated problem — it will silently undo this editor
restriction with no error and no visible change in the admin panel. The
account will quietly become a full admin again. If that ever happens,
immediately re-paste and re-run
`supabase/migrations/20260812000000_editor_role_exclusion.sql` in the SQL
Editor to restore the restriction.

## 1. Create her Auth user

Supabase Dashboard → Authentication → Users → Add user → Create new user.
- Email: the account's email (e.g. `israhsaleh2000@gmail.com`)
- Tick **Auto Confirm User**
- Leave the password blank if she'll set her own via step 3 (recommended);
  otherwise set a temporary one and share it over a secure channel.

## 2. Tag the account as an editor

SQL Editor → New query → paste, editing the email → Run:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'editor')
where email = 'israhsaleh2000@gmail.com';
```

Verify it took:

```sql
select email, raw_app_meta_data -> 'role' as role
from auth.users
where email = 'israhsaleh2000@gmail.com';
```

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
