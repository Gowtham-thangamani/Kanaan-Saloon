# Kanaan Salon — Launch Checklist

Everything in this file requires action **outside the codebase** (Supabase dashboard, Resend, Google, etc.). The code changes from the QA fix pass are already in place — see `git log`.

---

## 1. Apply the new Supabase migrations (REQUIRED)

The audit found that the original RLS policies let anyone with the publishable anon key read/update every booking. Two new migrations fix this and add tables for the contact / newsletter / careers / voucher forms.

```bash
# from the project root
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste the contents of these three files into the Supabase SQL Editor in order:

- `supabase/migrations/20260507000000_init_bookings.sql`
- `supabase/migrations/20260509000000_add_forms_tables.sql`
- `supabase/migrations/20260511000000_availability.sql` — adds slot-availability logic so the booking page no longer shows mocked times.

After this, **anonymous users can only INSERT.** Reading/updating/deleting requires a Supabase Auth session. The availability check (third migration) exposes only a SECURITY DEFINER function — anon can call `get_taken_slots(branch, date)` to learn which times are taken, but cannot read the bookings table directly.

---

## 2. Create admin auth users (REQUIRED)

The admin panel no longer uses a hard-coded password. To grant access:

1. Supabase dashboard → **Authentication → Providers** → enable **Email**.
2. **Authentication → Users → Add user → Create new user**.
3. Fill in the admin's email + a strong password. Tick **Auto Confirm User**.
4. Repeat for each admin (no shared accounts).

Admins log in at `/admin/index.html` with their email + password. They can rotate their own password from `/admin/settings.html`.

### 2a. Allowlist the password-reset redirect URL (REQUIRED for the "Forgot password?" flow)

The login page has a **Forgot password?** link that emails a one-time reset link landing on `/admin/reset.html`. Supabase only redirects to URLs you've explicitly allowed:

1. Supabase dashboard → **Authentication → URL Configuration**.
2. **Site URL**: `https://kanaanspa.ae` (your production domain — no trailing slash).
3. **Redirect URLs**: add the following two patterns, one per line, click **Save** after each:
   - `https://kanaanspa.ae/admin/reset.html`
   - `https://kanaanspa.ae/admin/**` (covers any future admin pages)
4. While testing locally, also add `http://127.0.0.1:5500/admin/reset.html` (or whatever port your local server uses).

If a reset link in the email goes to `localhost:3000` or any URL Supabase doesn't recognise, the user lands on the login page with no error — that means this allowlist step was skipped.

### 2b. Customise the reset email (optional, recommended)

Supabase's default reset email is plain. To brand it:

1. **Authentication → Email Templates → Reset Password**.
2. Replace the default HTML with a Kanaan-branded version (you can keep the `{{ .ConfirmationURL }}` placeholder — Supabase substitutes it).
3. Save.

The link in the template must use `{{ .ConfirmationURL }}`; that resolves to a URL like `https://kanaanspa.ae/admin/reset.html#access_token=…&refresh_token=…&type=recovery`.

---

## 3. Deploy the booking-notification edge function (RECOMMENDED)

Without this, you only see new bookings if you check `/admin/leads.html` manually.

### 3a. Get a Resend API key

1. Sign up at <https://resend.com> with `kanaansaloon@gmail.com` (free tier = 100 emails/day, 3 000/month).
2. **API Keys → Create API Key** → copy the key (starts with `re_...`).
3. Verify your sending domain (or use the test sender during setup).

### 3b. Deploy the function

```bash
npx supabase functions deploy notify-booking
npx supabase secrets set RESEND_KEY=re_xxxxxxxxxxxx
```

### 3c. Wire the database webhook

1. Supabase dashboard → **Database → Webhooks → Create new hook**.
2. Name: `booking-notify`. Table: `bookings`. Events: **INSERT**.
3. Type: **Supabase Edge Functions** · Function: `notify-booking`.
4. **Create**.

Smoke-test by submitting a test booking; the email should arrive at `kanaansaloon@gmail.com` within ~5 seconds. Repeat the wiring for `contacts`, `newsletter`, `careers`, and `vouchers` if you want notifications for those too (the same edge function will handle any payload — adapt the table name in the webhook).

### 3d. Set the SITE_URL secret (so the QR in the customer email points at the live domain)

The customer confirmation email contains an inline QR + a deep link to the booking confirmation page. The edge function builds those URLs from a `SITE_URL` env var. **Set this when you deploy:**

```bash
npx supabase secrets set SITE_URL=https://your-domain.com
```

If you skip this step, the function falls back to `https://kanaanspa.ae`. That's fine if that's your live domain — broken if it's something else (the QR in the email will encode the wrong URL).

---

## 3.5 Apple / Google Wallet integration (OPTIONAL)

The thank-you page has hidden **Add to Apple Wallet** + **Save to Google Wallet** buttons. They auto-show when you populate the `wallet` block in `assets/js/config.js` with two backend endpoints:

```js
wallet: {
  applePassEndpoint:  'https://api.kanaanspa.ae/wallet/apple/{id}',  // returns application/vnd.apple.pkpass
  googleSaveEndpoint: 'https://api.kanaanspa.ae/wallet/google/{id}'  // returns { saveUrl: 'https://pay.google.com/gp/v/save/<JWT>' }
}
```

Why a backend is required:

- **Apple Wallet** `.pkpass` files must be cryptographically signed using a Pass Type ID certificate from an Apple Developer account ($99/yr). There is no purely client-side path.
- **Google Wallet** save links are JWTs signed by a Google Cloud service account. Client-side signing would expose the private key.

If you don't want to set this up, leave both endpoints empty — the buttons stay hidden, and the **Download QR** button + the QR embedded in the customer email still cover the "don't lose your booking" use case end-to-end.

Reference docs when you're ready to add this:

- Apple Wallet: <https://developer.apple.com/documentation/walletpasses>
- Google Wallet (generic class): <https://developers.google.com/wallet/generic/web/prerequisites>

A small Cloudflare Worker, a tiny Node service on Hostinger, or a Supabase Edge Function can host both endpoints in ~200 lines of code total. We've shipped only the front-end buttons; the server side is your call.

---

## 4. Configure analytics & tracking pixels (OPTIONAL)

All tracking IDs in `assets/js/config.js` are intentionally empty. Pixels won't fire (and consent banner is inert) until you populate them. Edit `assets/js/config.js`:

```js
tracking: {
  gtmId: 'GTM-XXXXXXX',
  ga4Id: 'G-XXXXXXXXXX',
  metaPixelId: '123456789012345',
  tiktokPixelId: 'CXXXXXXXXXXXXXXXX',
  snapPixelId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  googleAdsId: 'AW-XXXXXXXXX',
  recaptchaSiteKey: '6LcXXXXXXXXXX'
}
```

Reupload `config.js` (or use `/admin/integrations.html` to generate it). Pixels respect the cookie-consent banner — they only load after the user accepts marketing cookies.

---

## 5. Slot availability — done by default; external CRM adapter is OPTIONAL

After applying migration `20260511000000_availability.sql`, the booking page uses **Supabase itself** as the source of truth for slot availability:

- Existing bookings (status `new` or `confirmed`) automatically block their slots based on their service duration.
- Admins can manually block slots at `/admin/blocks.html` (therapist on leave, equipment maintenance, public holiday, private event).
- The booking page calls a SECURITY DEFINER RPC `get_taken_slots(branch, date)` — anon can call it but cannot read the underlying tables, so customer PII stays protected.

That covers the online-bookings + admin-block use case end to end. **No external CRM is needed for a soft launch.**

### When you do need an external CRM

If your staff also use Fresha / Salonist / Zoho / Booksy and you want walk-ins + phone bookings to also block online slots, populate the CRM adapter — the front-end will prefer it over Supabase's view:

```js
crm: {
  availabilityUrl: 'https://api.fresha.com/v1/availability',  // or Salonist / Zoho
  apiKey: '...',
  provider: 'fresha'
}
```

The endpoint must return either an array of `HH:MM` strings or `{ "slots": ["10:00", ...] }`, scoped by `?branch=<id>&date=<yyyy-mm-dd>`. The page falls back to Supabase if the CRM call fails.

### Service durations used by the booking page

The booking insert stores `duration_minutes` based on a static map in `main.js`:

| Service | Minutes |
|---|---|
| Hair & Beard | 45 |
| Facial & Skin | 45 |
| Massage | 60 |
| Moroccan Bath | 60 |
| Manicure & Pedicure | 60 |
| Hair Treatment | 75 |
| 8-Service Package | 120 |
| 6-Service Package | 90 |
| VIP Hour | 60 |

A 60-minute booking at 14:30 blocks both the 14:30 and 15:00 30-min slots. Adjust the map in `main.js` if your real service durations differ.

### Smoke test the new availability flow

1. Book a service on the live site for a known date/time (e.g. Khalifa City, tomorrow, 14:30).
2. In a fresh browser tab, start a new booking for the same branch + date.
3. Pick the same date — the 14:30 slot (and 15:00 too if the first booking was 60+ min) should be absent from the time dropdown.
4. Sign in to `/admin/blocks.html` → add a manual block (e.g. Khalifa City, tomorrow, 11:00, 2 hours, "Therapist on leave").
5. Refresh the booking page — 11:00, 11:30, and 12:30 should all be missing from the time dropdown for that date+branch.
6. Click **Unblock** on the admin row → refresh the booking page → those times reappear.

---

## 5.5 Placeholder content to replace before launch

These items ship as visible placeholders so you see structure on day one — but they should be replaced with real content before the site is announced to customers.

| Item | File / Location | Replace with |
|---|---|---|
| **Testimonials** | `content/testimonials.json` + the 3 quote cards on `index.html` (in the "from 2,400+ Google reviews" block) | 3 real customer quotes (with first name + branch + service). Permission required. |
| **Google rating** (currently "4.7 · 2,400+") | `index.html` "Google rating" block under the trust strip | Real number from Google Business Profile when domain is verified. Or remove the block until then. |
| **Team portraits** | `about.html` "The Team" section — 4 cards with `[Name — Master Barber]` placeholders + initial avatars | 4-6 real master-barber / therapist headshots (square 800×800 webp) + real names + role + branch. |
| **Before/After photos** | `before-after.html` — 4 placeholder pairs | 12-24 real paired photos (same crop/lighting if possible) tagged with the service performed. |
| **Empty Arabic translations** | `content/prices.json` — 72 items with empty `name_ar` | Translation pass for new menu items (massage variants, body treatments, hair-removal options). |
| **Sample voucher image** | `gift-voucher.html` | A mockup of the digital voucher PDF so buyers see what they're sending. |
| **Press / Awards** | Not yet on the site | If applicable, add a press strip below the homepage hero with Time Out Abu Dhabi / What's On / etc. logos. |
| **Social URLs** | `content/site.json` — `social.instagram`, `social.tiktok`, `social.snapchat` | Real handles. Until set, footer icons link to `#`. |
| **Tracking pixel IDs** | `assets/js/config.js` — `tracking.*` | GA4 (recommended), Meta Pixel + TikTok Pixel (only if running ads). |
| **CRM endpoint** | `assets/js/config.js` — `crm.availabilityUrl` | Only if you're integrating a real CRM (Fresha / Salonist) — otherwise Supabase RPC covers availability. |
| **Wallet endpoints** | `assets/js/config.js` — `wallet.applePassEndpoint`, `wallet.googleSaveEndpoint` | Only if you've built the server-side `.pkpass` / JWT signing service. Otherwise the buttons stay hidden. |

The site is fully launch-eligible without any of these replaced — they're all "visible improvement" items, not "broken without".

---

## 6. Domain & DNS (REQUIRED before going live)

- Point `kanaanspa.ae` (and `www.kanaanspa.ae`) to your hosting (Netlify / Cloudflare Pages / Vercel).
- The site already includes `_redirects`, `_headers`, `manifest.json`, `robots.txt`, and `sitemap.xml`. They reference `https://kanaanspa.ae`. If your domain is different, update `set-domain.js` and re-run.
- Issue an SSL certificate (your host likely does this automatically).

---

## What's already wired (no action needed)

### Backend / data layer

- ✅ Supabase URL + anon key in `assets/js/config.js`.
- ✅ `bookings` table inserts work today; new RLS will keep public inserts working but block public reads.
- ✅ Contact, newsletter, careers, gift-voucher forms now write to their respective Supabase tables.
- ✅ Careers form uploads CV files to the `careers-cv` Storage bucket; admins can fetch signed URLs from the dashboard.
- ✅ Admin Leads page now PATCHes status changes back to Supabase, and supports Approve / Cancel / Delete plus WhatsApp & email follow-up buttons.
- ✅ Calendar capped at +90 days; phone normalized; `booking_time` properly formatted.
- ✅ Booking errors surface inline on submit failure with a `mailto:` fallback (uses `booking.fallbackEmail`).
- ✅ Generic edge function (`notify-booking`) handles *all* form tables (bookings/contacts/newsletter/careers/vouchers); also sends a customer confirmation email when a booking has an `email`.
- ✅ Customer confirmation email embeds a **per-booking QR** (encoded with the unique confirmation URL) so customers always have it in their inbox even if they close the thank-you tab.
- ✅ Admin **Scan booking** page (`/admin/scan.html`) — staff can point a phone camera at a customer's QR (or upload a screenshot) and the booking pulls up instantly with **Mark arrived** / **Mark confirmed** / **Mark no-show** / **WhatsApp** / **Email** actions. Manual ID lookup also supported.
- ✅ Real slot availability — the booking page now calls `get_taken_slots(branch, date)` (Supabase RPC) so already-booked times disappear from the time dropdown in real time. Admin can manually block slots at `/admin/blocks.html` for therapist leave, holidays, equipment maintenance, etc. The mock fallback only runs if Supabase is unreachable.
- ✅ Menu-driven booking entry — clicking **Services** in the nav shows a **branch picker** (10 cards with from-price + service count, driven by `content/prices.json`). Each branch links to `/menu.html?branch=<slug>` which renders that branch's full menu grouped by category, with **Book** buttons next to every line item. The booking page (`/book.html`) reads `?service=X&branch=Y&item=Z&price=N` and pre-fills steps 1 + 2 of the wizard, then shows a "**You're booking: Hair Cutting Normal · 25 AED**" banner above the stepper. The 7 editorial `/services/<name>.html` pages stay (SEO content) and now include a "**See live prices at all 10 branches →**" CTA right under the hero. Both EN and AR fully wired.

### Front-end UX (post-consultancy pass)

- ✅ Booking flow reordered: **Service → Branch → Date+Time → Details** (matches user intent — what before where). Branches in step 2 are grouped by city.
- ✅ Service-step options now show "**~XX min · from YY AED**".
- ✅ Step 4 has optional fields collapsed under a `+ Add email/birthday/notes` toggle.
- ✅ Reassurance row above the submit button: *Free to cancel · WhatsApp confirmation in 5 minutes · No payment now*.
- ✅ Both EN and AR booking pages mirror this restructure.
- ✅ Homepage service cards display "**From XX AED · ~ZZ min**".
- ✅ Homepage section reorder: testimonials now precede the Instagram block (real social proof first).
- ✅ Hero image swapped to a service-moment shot (was generic stairs).
- ✅ Static "For a live Instagram feed…" dev-message removed from the homepage.
- ✅ Thank-you page: prominent **Add to Calendar** (`.ics`) + a "What happens next" 3-step block (confirm → reminder → arrive 5 min early).
- ✅ Mobile sticky FAB **Book** button now appears site-wide on small screens (was only `/services`, `/branches`, `/blog`).
- ✅ Confetti capped at 30 particles on `<= 640 px` to avoid jank.
- ✅ Calendar fades in (200 ms) and tightens to a single-column-friendly grid on `<= 420 px`.
- ✅ Form-error boxes slide in (200 ms) instead of popping.
- ✅ `data-scroll-text` rendered solid (no dim/lit transition) on `<= 480 px` so body copy reads cleanly on small screens.

### Image-relevance pass

- ✅ The over-used `service-hair-barber-stations` hero image is no longer on 19 pages — it's now on 7, **all topically about hair/beard/barber**.
- ✅ Blog post heroes match topic: `choosing-the-right-facial` → facial-candlelit, `moroccan-bath-guide` → moroccan-bath.
- ✅ AR mirror pages (about, blog, book, branches, careers, contact, gallery, offers) each have a topic-correct hero, no longer cloning each other.
- ✅ AR service-detail split images (facial, hair-treatment, mani-pedi, massage, moroccan-bath) match the service.
- ✅ `services/grooming-packages` hero swapped to a multi-service editorial shot.
- ✅ `before-after.html` hero upgraded to the `-1600` variant.
- ✅ `lp/eid-offer` hero swapped to the warmer `service-facial-candlelit`.
- ✅ `<link rel="preload">` tags re-aligned to match the new heroes (no wasted bandwidth on stale LCP images).

### Hygiene

- ✅ Branch-page footers use bound SVG icons; lightbox `<img>` elements have meaningful `alt` text.
- ✅ Sitemap excludes `/admin/*` and `/supabase/*` automatically (`generate-sitemap.js`).
- ✅ All 3 blog posts have an author byline ("By the Kanaan grooming desk · Reviewed by our master barbers").
- ✅ Contact page now leads with a 5-question FAQ deflector before the form (book / cancel / pricing / walk-ins / careers).

---

## Post-launch: monitor

- Supabase dashboard → **Database → Tables** → eyeball recent rows in each table once a day for the first week.
- Resend dashboard → **Logs** → confirm notification emails are delivered.
- `/admin/dashboard.html` shows the 500 MB usage bar; the panel warns at 80%.
