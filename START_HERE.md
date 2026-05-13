# Kanaan Salon Website — Hosting Handoff (Read this first)

You've been handed a zip of the Kanaan Gents Salon & Spa website. This single document walks you through getting it live. Total realistic time: **45–90 minutes** (most of which is waiting for Supabase / DNS).

---

## 1. What this is

- **Static HTML/CSS/JS site.** No build step. No bundler. No npm install needed to deploy.
- **Backend = Supabase** (Postgres + Auth + Storage + Edge Functions). Free tier is sufficient for at least the first 12 months.
- **Bilingual** EN + AR with hreflang.
- 10 branch pages, 7 service pages, 3 blog posts, 11 SEO landing pages, an admin panel at `/admin/`.

You don't need to write code to ship this. You need to (a) host the static files, (b) connect Supabase, (c) wire the booking-notification email.

---

## 2. Files in the zip

| Path | What it is |
|---|---|
| `index.html`, `about.html`, `services.html`, `book.html`, etc. | All public pages |
| `branches/`, `services/`, `blog/`, `lp/` | Section pages |
| `ar/` | Arabic mirror (mirrors every EN page) |
| `admin/` | Admin panel (Supabase-Auth gated) |
| `assets/css/`, `assets/js/`, `assets/img/`, `assets/fonts/` | All site assets |
| `content/` | Editable content JSON (branches, offers, prices, testimonials, site-wide settings) |
| `supabase/migrations/` | Two SQL files — the database schema |
| `supabase/functions/notify-booking/` | The booking-notification edge function |
| `pricelists/` | Per-branch price-list JPEGs |
| `_headers`, `_redirects`, `.htaccess`, `manifest.json`, `robots.txt`, `sw.js` | Hosting config |
| `sitemap.xml` | Auto-generated; re-run `node generate-sitemap.js` if you change pages |
| `LAUNCH_CHECKLIST.md` | The full checklist of post-deploy tasks (you'll come back to this) |
| `SUPABASE_SETUP.md` | Detailed Supabase setup walk-through |
| `BOOKING_SETUP.md`, `README.md`, `ACCEPTANCE.md`, `DATA-TO-REPLACE.md` | Reference docs |

---

## 3. Test locally before deploying (5 minutes)

This validates the zip extracted correctly.

1. Unzip somewhere convenient.
2. In VS Code: install the **Live Server** extension, right-click `index.html` → **Open with Live Server**. (Or any other static server: `npx serve`, `python -m http.server`, etc.)
3. Browser opens at `http://127.0.0.1:5500` (or similar). You should see the homepage with hero image, services strip, branch grid.
4. Click around. The booking form (`/book.html`) will work end-to-end against the live Supabase project — submitted bookings will land in the `bookings` table immediately. You'll see the WhatsApp tab open. Don't submit fake bookings repeatedly; they'll show up in admin.

> If the homepage loads blank, open DevTools → Console. The most common cause is a CORS error pulling `content/*.json`; that's expected on `file://` and resolves the moment you serve via http.

---

## 4. Choose a host

The project is configured for **Netlify** and **Cloudflare Pages** out of the box (both honour `_headers` and `_redirects`). Pick one:

### Option A — Netlify (easiest, free)

1. Sign up / sign in at <https://netlify.com>.
2. **Add new site → Deploy manually**.
3. Drag the unzipped project folder onto the page.
4. Wait ~30 seconds. You'll get a `*.netlify.app` URL. Test it.
5. **Site settings → Domain management** → add `kanaanspa.ae` (or whichever domain). Netlify will guide you through the DNS records.

### Option B — Cloudflare Pages (fast, free, edge-cached)

1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Upload assets**.
2. Drag the unzipped folder.
3. Click **Deploy**.
4. Add custom domain in the Pages project settings.

### Option C — Vercel

Same idea as Netlify; drag-drop or `vercel deploy`.

### Option D — Traditional shared hosting (cPanel, Hostinger, GoDaddy)

Upload the unzipped folder contents to `public_html/` via FTP or the file manager. Make sure `index.html` is at the web root. Confirm `.htaccess` was uploaded (it's hidden by default in some FTP clients).

---

## 5. Critical Supabase setup (do this once, ~15 minutes)

The site already points at the Supabase project (`https://ckqioeixkwuxrcybsoew.supabase.co` in `assets/js/config.js`). What's left:

### 5.1 Apply the two database migrations

Open the Supabase dashboard → **SQL Editor → New query**. Paste the entire contents of each of these two files **in order**, clicking Run after each:

1. `supabase/migrations/20260507000000_init_bookings.sql` — creates the `bookings` table + RLS policies.
2. `supabase/migrations/20260509000000_add_forms_tables.sql` — creates `contacts`, `newsletter`, `careers`, `vouchers` tables + the `careers-cv` Storage bucket.

You should see "Success. No rows returned." after each one.

> **CLI alternative:** `npx supabase login && npx supabase link --project-ref ckqioeixkwuxrcybsoew && npx supabase db push`.

### 5.2 Create the admin user

The admin panel uses Supabase Auth — there is no default password.

1. Supabase dashboard → **Authentication → Providers** → confirm **Email** is enabled (it is by default).
2. **Authentication → Users → Add user → Create new user**.
3. Enter the admin's email + a strong password.
4. **Tick "Auto Confirm User"** so they can log in without an email-verify step.
5. Click **Create user**.

Now go to `https://<your-domain>/admin/` and log in.

#### 5.2a Allowlist the reset-link URL (one-time, takes 30 seconds)

The login page has a **Forgot password?** link. For the reset email's link to be trusted by Supabase, allowlist the page it lands on:

1. **Authentication → URL Configuration**.
2. **Site URL** = `https://<your-domain>` (no trailing slash).
3. **Redirect URLs** — add `https://<your-domain>/admin/reset.html` (and `https://<your-domain>/admin/**` for future flexibility).
4. Click **Save**.

If you skip this, "Forgot password?" emails will be sent, but clicking the link will silently bounce the user back to the login page without unlocking the password form.

### 5.3 Deploy the booking-notification email function

Without this, bookings land in the database but no one gets an email. Ten minutes of work.

1. Sign up at <https://resend.com> (free tier: 100 emails/day, 3 000/month). Create an API key (`re_...`).
2. Verify the sending domain in Resend (or use their test sender for now).
3. Deploy the function:
   ```bash
   npx supabase login
   npx supabase functions deploy notify-booking
   npx supabase secrets set RESEND_KEY=re_xxxxxxxxxxxx
   ```
4. Wire the webhook: Supabase dashboard → **Database → Webhooks → Create new hook**:
   - Name: `booking-notify`
   - Table: `bookings`
   - Events: **INSERT**
   - Type: **Supabase Edge Functions**
   - Function: `notify-booking`
   - Save.
5. (Optional) repeat the webhook step for `contacts`, `newsletter`, `careers`, `vouchers` if you want notifications for those forms too. The same edge function handles all five tables.

Smoke-test: submit a test booking on the live site. Within ~5 seconds:
- A row should appear in **Database → Tables → bookings**.
- An email should arrive at `kanaansaloon@gmail.com`.
- The customer (if they entered an email) should also get a confirmation email.

---

## 6. Domain & SEO (5 minutes, after hosting + Supabase)

The site assumes `https://kanaanspa.ae` in canonical tags, OG metadata, and the sitemap. If you're using a different domain:

1. Open a terminal in the project root.
2. Run: `node set-domain.js https://your-domain.com`
3. Run: `node generate-sitemap.js`
4. Re-deploy.

If you're using `kanaanspa.ae` as planned, no change needed.

After the domain resolves and HTTPS is active:

- **Google Search Console** — add the domain, verify, submit `https://your-domain.com/sitemap.xml`.
- **Bing Webmaster Tools** — same.

---

## 7. Optional but recommended

These are listed in `LAUNCH_CHECKLIST.md` and aren't blocking, but you should do them within the first month:

| Task | Where | Why |
|---|---|---|
| Set tracking pixel IDs (GA4, Meta, GTM, TikTok, Snap, reCAPTCHA) | `assets/js/config.js` → `tracking:` block | Until set, no analytics. Pixels respect the cookie consent banner. |
| Wire real CRM availability (Fresha / Salonist / Zoho) | `assets/js/config.js` → `crm:` block | Currently slots are **mocked at ~70% availability**. The salon will overbook if real customers use this on the live site without a real CRM connected. **Treat this as a hard blocker if real customers are using the booking form.** |
| Replace static Instagram block | `index.html` (the IG section) | Right now it's 6 fixed photos linking to the Instagram URL. Use Elfsight or EmbedSocial for a live feed. |
| Add real testimonials | `content/testimonials.json` | Currently has placeholder text. |
| Add real before/after pairs | `before-after.html` | Currently the page exists but has no real paired imagery. |

---

## 8. Known gotchas

1. **The `assets/js/config.js` file contains a Supabase publishable anon key.** This is *meant* to be in client code (it's how the browser talks to Supabase). The migrations restrict reads/updates to authenticated admins, so the key alone gives no access to customer data. Don't worry about it being visible in DevTools — that's by design.
2. **The booking flow Calendar slots are fake** until step 7's CRM is wired. See above.
3. **Admin panel changes to Banners / Branches / Offers download a JSON file but don't auto-publish.** The admin editor saves to localStorage, then offers a "Download JSON" button. To publish: download the file, replace the matching file in `content/`, redeploy. (Multi-admin content editing requires a backend; not in scope.)
4. **The QR code on the booking confirmation page** encodes the absolute URL of that customer's confirmation page. It only works cross-device when the site is on a public domain. Localhost QR codes won't open from a different phone.
5. **Service worker (`sw.js`)** caches HTML and JSON network-first, photos cache-first. After deploying a content change, ask users to hard-refresh (Ctrl+Shift+R). The cache version is `kanaan-v3`; bump this string in `sw.js` to force-evict the old cache for everyone.

---

## 9. The 5-step launch checklist (TL;DR)

1. **Upload** the zip contents to a static host (Netlify drag-drop is the fastest).
2. **Apply** the two SQL migrations in the Supabase SQL editor.
3. **Create** an admin user in Supabase → Authentication → Users.
4. **Deploy** the `notify-booking` edge function + set `RESEND_KEY` + wire the webhook.
5. **Point** the domain at the host; verify HTTPS; submit the sitemap to Google Search Console.

If real customers will be booking through the live site immediately, **also do step 7's CRM wiring before announcing**. Otherwise the booking page will accept appointments at slots that are already taken.

---

## 10. Where to look when stuck

| Problem | Read |
|---|---|
| Step-by-step Supabase setup | `SUPABASE_SETUP.md` |
| What's already wired vs what needs config | `LAUNCH_CHECKLIST.md` |
| Booking form architecture | `BOOKING_SETUP.md` |
| Original product brief / acceptance | `ACCEPTANCE.md` |
| Replacing placeholder data | `DATA-TO-REPLACE.md` |
| Project overview / repo conventions | `README.md` |

If you're really stuck, the quickest debug path is: open DevTools → Network → submit a booking → inspect the `POST /rest/v1/bookings` request. A 401 means the migrations didn't apply. A 403 means RLS is wrong. A 200 means the booking landed and the rest is webhook/email config.

---

Good luck. The site is structurally ready; almost all remaining work is configuration in dashboards, not code.
