# Kanaan Booking DB — Supabase Setup

Total time: ~30 minutes. Cost: **$0/month** as long as you stay under 500 MB.
Result: every booking, contact form, newsletter signup, careers application, and gift voucher → row in Supabase Postgres. Admin panel reads cross-device in real time using Supabase Auth.

**Capacity:** ~500 MB on free tier. Realistic load = 10 branches × 30 bookings/day × 365 = 110 k rows/year → roughly **5+ years before you hit the limit**. The admin dashboard will warn you at 80% (≈ 400 MB).

---

## STEP 1 — Create the Supabase project

1. Go to **[supabase.com](https://supabase.com)** → **Start your project** (sign in with GitHub or kanaansaloon@gmail.com).
2. Click **New project**:
   - **Name:** `kanaan-bookings`
   - **Database password:** generate a strong one and save it in a password manager
   - **Region:** **Frankfurt (eu-central-1)** — closest to UAE for low latency
   - **Pricing plan:** **Free**
3. Click **Create new project**. Wait ~2 minutes for provisioning.

---

## STEP 2 — Apply the migrations

Two migration files live in `/supabase/migrations/`:

- `20260507000000_init_bookings.sql` — `bookings` table + tightened RLS (anon INSERT only; reads/updates require an authenticated admin).
- `20260509000000_add_forms_tables.sql` — `contacts`, `newsletter`, `careers`, `vouchers` tables and the `careers-cv` Storage bucket.

You have two ways to apply them:

### Option A — Supabase CLI (recommended)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### Option B — Paste into SQL Editor

1. Left sidebar → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/20260507000000_init_bookings.sql` → **Run**.
3. Repeat for `supabase/migrations/20260509000000_add_forms_tables.sql`.

You should see "Success. No rows returned." after each one.

---

## STEP 2.5 — Create the admin auth users

The admin panel logs in via **Supabase Auth** (not a hard-coded password). To add an admin:

1. Sidebar → **Authentication → Providers** → ensure **Email** is enabled.
2. Sidebar → **Authentication → Users** → **Add user → Create new user**.
3. Enter the admin's email (e.g. `kanaansaloon@gmail.com`) and a strong password. Tick **Auto Confirm User**.
4. Repeat for any additional admin staff. Each gets their own email + password — no shared credentials.

To **remove** access: delete the user from this same screen. To **rotate** a password: ask the admin to change it from `/admin/settings.html`, or use the dashboard's "Send password recovery" button.

> **Why this matters:** the new RLS policies only let `authenticated` users read or update bookings. The publishable anon key alone can't read your customer data — anyone trying to scrape it without a session token gets nothing back.

---

## STEP 3 — Get your API URL + anon key

1. Left sidebar → **Project settings** (gear icon) → **API**.
2. Copy these two values:
   - **Project URL:** looks like `https://xxxxxxx.supabase.co`
   - **anon / public key:** starts with `eyJ...` (long JWT)

These two values are what your website needs.

---

## STEP 4 — Wire into the website

Open **`assets/js/config.js`** and find the `supabase` block. Paste your two values:

```js
supabase: {
  url:     'https://xxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....',
  table:   'bookings',
  maxSizeMB: 500
},
```

Save the file. **Hard-refresh the booking page** in the browser.

That's it. Bookings now flow into Supabase. The admin panel reads from the same DB.

---

## STEP 5 — Email + WhatsApp notifications (FREE, optional)

Supabase doesn't send emails on its own. Add a **Database Webhook** that calls Resend (free email service) on every new booking.

### 5a. Sign up at Resend (2 minutes)
1. **[resend.com](https://resend.com)** → sign up with kanaansaloon@gmail.com → free tier = 100 emails/day, 3 000/month (~ plenty)
2. Go to **API Keys** → create a key → copy it (starts with `re_...`)
3. Verify your sending domain (or skip and use the test sender for now)

### 5b. Create a Supabase Edge Function
1. Supabase sidebar → **Edge Functions** → **Create a function** → name it `notify-booking`
2. Paste this code:

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_KEY")!;

serve(async (req) => {
  const { record } = await req.json();
  const phoneClean = (record.phone || "").replace(/[^0-9]/g, "");
  const html = `
    <h2>New booking · Kanaan</h2>
    <p><strong>${record.name || ""}</strong> — ${record.phone || ""}</p>
    <ul>
      <li>Branch: ${record.branch || ""}</li>
      <li>Service: ${record.service || ""}</li>
      <li>When: ${record.booking_date || ""} ${record.booking_time || ""}</li>
      <li>ID: ${record.id || ""}</li>
    </ul>
    ${record.message ? `<p>Notes: ${record.message}</p>` : ""}
    <p><a href="https://wa.me/${phoneClean}">Reply on WhatsApp</a></p>
  `;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Kanaan Bookings <bookings@kanaanspa.ae>",
      to:   ["kanaansaloon@gmail.com"],
      subject: `New booking · ${record.branch || ""} · ${record.name || ""}`,
      html
    })
  });
  return new Response("ok");
});
```

3. **Edge Functions → Manage secrets** → add `RESEND_KEY` = your Resend API key
4. Deploy the function

### 5c. Trigger it on every new booking
1. Supabase sidebar → **Database → Webhooks** → **Create new hook**
2. Name: `booking-notify`
3. Table: `bookings` · Events: `INSERT`
4. Type: **Supabase Edge Functions** · Function: `notify-booking`
5. Click **Create**

Now every new row → email lands in kanaansaloon@gmail.com within ~3 seconds.

**WhatsApp** — already wired separately. The booking form opens WhatsApp pre-filled with everything. That flow doesn't depend on Supabase.

---

## STEP 6 — Auto-cleanup at 2 years (optional, prevents hitting 500 MB cap)

In SQL Editor, run:

```sql
-- Enable pg_cron extension (free tier supports it)
create extension if not exists pg_cron;

-- Delete bookings older than 2 years, every Sunday at 03:00 UTC
select cron.schedule(
  'cleanup-old-bookings',
  '0 3 * * 0',
  $$delete from public.bookings where created_at < now() - interval '2 years'$$
);
```

This runs forever, no maintenance needed. Adjust the `2 years` interval if you want shorter retention.

---

## Test it

1. Hard-refresh the booking page on your site.
2. Submit a test booking.
3. Within 5 seconds:
   - **A new row** in Supabase → Table Editor → `bookings`
   - **An email** at kanaansaloon@gmail.com (if you did Step 5)
   - **A WhatsApp message** at +971 50 555 6795 (independent flow, already works)
   - **The admin panel** at `/admin/leads.html` shows it (refresh)

---

## Capacity monitoring

The admin panel shows a usage bar (in **Settings**) — refreshed on every visit:

> 🟢 1 247 bookings · ~4.2 MB / 500 MB (0.8 %)

When you hit **80 %** the bar turns amber and warns you. At 95 % it turns red.

To see the precise size in Supabase: **Project settings → Usage**.

---

## Troubleshooting

- **400 / 401 errors in console:** wrong `anonKey` in config.js, or RLS policies missing
- **CORS errors:** double-check the URL — must be your project URL, not the dashboard URL
- **No bookings appearing:** check the table has rows in Supabase → Table Editor first; if rows exist but admin panel is empty, your CSV URL setting is overriding — clear it in admin Settings
- **Row count not refreshing:** admin panel uses `network-first` for JSON now (since SW v3); if stale, do a hard-refresh once
- **Email not arriving:** check Resend dashboard → logs; check spam folder; verify the Edge Function deployed (status = ACTIVE)

That's the full system. Real Postgres DB, free up to 500 MB, no monthly fees, you own everything.
