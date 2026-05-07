# Kanaan — Data Replacement Checklist

Everything Kanaan must provide before launch. The site is fully functional with placeholders; replace these and the site is launch-ready.

---

## A. Brand assets

| Item | Where | Currently |
|---|---|---|
| Logo SVG | `assets/img/logo.svg` | Missing — using text-based "KANAAN." everywhere |
| Logo mark (icon) | `assets/img/logo-mark.svg` | Missing |
| Favicon | `assets/img/favicon.svg` | Generated placeholder (gold "K" on obsidian) — replace with branded SVG |
| Open Graph default image | `assets/img/og-default.svg` | Generated placeholder — replace with branded 1200×630 PNG/JPG |
| Apple touch icon (180×180 PNG) | `assets/img/apple-touch-icon.png` | Missing |
| Brand hex codes | `content/site.json` → `brand.primaryHex`, `brand.accentHex` | `#0E0F11` + `#C8A04A` (proposed) — confirm or replace |

---

## B. Branch data (×10)

Edit via **Admin Panel → Branches**, or directly in `content/branches.json`. After saving, run:

```
node generate-branches.js
node generate-ar-branches.js
node generate-sitemap.js
```

Per branch (10 branches × these fields):

- [ ] Real address (EN + AR) — currently placeholder
- [ ] Real phone number — currently `+97150000000X` placeholder
- [ ] Real WhatsApp number — currently same placeholder
- [ ] Real working hours per day (Sun–Sat)
- [ ] Real Google Maps query (or coordinates) — drives the embedded map
- [ ] Real branch hero photo URL — currently Unsplash stock
- [ ] At least 6 real branch interior photos for gallery — currently shared Unsplash stock

---

## C. Service pricing & descriptions

Edit `generate-services.js` (EN) and `generate-ar-services.js` (AR), then re-run both.

For each of 7 categories (Hair & Beard, Facial & Skin, Massage, Moroccan Bath, Manicure & Pedicure, Hair Treatment, Grooming Packages):

- [ ] Confirm or replace each treatment name
- [ ] Confirm or replace each treatment price (or "Ask for price" / "Book consultation")
- [ ] Confirm or replace each treatment duration
- [ ] Confirm description copy

---

## D. Tracking & analytics IDs

Edit via **Admin Panel → Integrations**, or directly in `assets/js/config.js`:

- [ ] Google Tag Manager ID (`GTM-XXXXXXX`)
- [ ] Google Analytics 4 measurement ID (`G-XXXXXXXXXX`)
- [ ] Meta (Facebook/Instagram) Pixel ID (15-digit)
- [ ] TikTok Pixel ID
- [ ] Snapchat Pixel ID
- [ ] (Optional) Google Ads ID (`AW-XXXXXXXXX`)

Pixels only fire after the user accepts marketing cookies — already wired.

---

## E. Booking webhook

Edit via **Admin Panel → Integrations**, or directly in `assets/js/config.js`:

- [ ] `booking.webhookUrl` — Make.com / Zapier endpoint
- [ ] Import the scenario blueprint at `assets/make-scenario.json` into Make.com
- [ ] Connect Google Sheets module to a master Lead Sheet with these columns:
  ```
  timestamp, name, phone, branch, service, date, time, message,
  bookingId, utm_source, utm_medium, utm_campaign, gclid, fbclid,
  ttclid, sc_click_id, locale
  ```
- [ ] (Optional) Connect WhatsApp Cloud API for branch + client confirmations
- [ ] (Optional) Connect chosen CRM: **Fresha**, **Salonist**, or **Zoho Bookings/CRM** — adapter notes in Admin → Integrations

---

## F. Leads dashboard CSV URL

Edit via **Admin Panel → Settings**:

- [ ] Publish your master Google Sheet → File → Share → Publish to web → CSV → copy URL → paste into Settings
- [ ] After saving, the **Leads** dashboard shows live data filterable by branch, source, date

---

## G. Bilingual content review

- [ ] Have the Arabic copy reviewed by a UAE-native copywriter (the PDF requires this)
  - All Arabic content is in `ar/*.html` and via the AR generators
- [ ] Confirm Arabic spellings of branch names and area names

---

## H. Social profiles

Edit via **Admin Panel → Banners** → Social section, or directly in `content/site.json`:

- [ ] Instagram URL
- [ ] TikTok URL
- [ ] Snapchat URL
- [ ] Google Business Profile URL (per branch — manage in Google Business)

---

## I. Real-time slot availability (v2)

The booking funnel currently mocks slot availability (always returns ~70% of slots free). When you have a CRM API:

- [ ] Replace the `checkAvailability(branch, date)` function in `assets/js/main.js` with a real API call:

```js
async function checkAvailability(branch, date) {
  const res = await fetch(`/api/availability?branch=${branch}&date=${date}`);
  return res.json(); // expected shape: ['10:00', '10:30', ...]
}
```

This is a single function — no other front-end change needed.

---

## J. Domain & hosting

- [ ] Domain registered (kanaan.ae or similar)
- [ ] DNS pointed to hosting (Cloudflare Pages / Netlify / Vercel / Cloudways recommended)
- [ ] SSL certificate active
- [ ] Update all `https://kanaan.ae` references in:
  - `sitemap.xml` (regenerate via `node generate-sitemap.js` after editing the SITE constant in `generate-sitemap.js`)
  - `robots.txt`
  - All OG tags (re-run `node enhance-pages.js`)

---

## K. Admin password

- [ ] On first login, the admin password is `kanaan2026`
- [ ] Change it immediately via Admin → Settings → Change password
- [ ] (Optional, recommended for production) Migrate admin to a real auth provider (Auth0, GitHub OAuth, etc.) since the static-site password is shared/local

---

## When all of the above are done

The site is launch-ready. Run a final pass:

1. `node generate-branches.js` (EN branches with real data)
2. `node generate-ar-branches.js` (AR branches)
3. `node generate-services.js` (EN service details)
4. `node generate-ar-services.js` (AR service details)
5. `node enhance-pages.js` (OG tags, favicon, utility bar, newsletter — idempotent)
6. `node generate-sitemap.js` (sitemap with real URLs)
7. Submit `sitemap.xml` to Google Search Console + Bing Webmaster Tools
8. Verify each branch's Google Business Profile is linked and consistent
