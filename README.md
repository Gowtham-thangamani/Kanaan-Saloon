# Kanaan Gents Salon & Spa — Website

Premium, bilingual (English / Arabic), mobile-first website with a working **admin panel + leads CRM**.

Built to mirror the requirements in `Kanaan Website Development Requirements.pdf`, benchmarked against the luxury presentation of `1847formen.com`.

---

## What's in the box (75+ pages, 5 generators, full admin)

### Public site (English + Arabic, RTL)
- **Home** · **About** · **Services hub** · **7 service detail pages** · **Offers** · **Branches hub** · **10 branch detail pages with photo galleries** · **Gallery** · **Booking funnel** · **Thank-you** · **Contact** · **Privacy** · **Terms** · **Cookie Policy** · **Accessibility** · **404** · **Search**
- **Blog/Insights hub + 1 sample article** ("A Moroccan bath, properly explained")
- **Marketing landing page** template (`/lp/eid-offer.html`) — paid-ads optimised, single-CTA, stripped header

### Admin panel (`/admin/`)
Password-gated (default `kanaan2026`, change on first login):
- **Dashboard** — leads-this-week, top branches, system health (which IDs/integrations are configured)
- **Leads · CRM** — live feed from your Google Sheet (configurable CSV URL), filterable by branch/source/date, export to CSV
- **Offers editor** — bilingual, branch-scoped, limited-time scheduling, save locally → download `offers.json`
- **Branches editor** — address, phone, WhatsApp, working hours per day, hero image
- **Banners** — homepage hero, brand text, central contact, social URLs
- **Integrations** — GTM/GA4/Meta/TikTok/Snapchat IDs, booking webhook URL, CRM adapter selector (Fresha/Salonist/Zoho/Custom). Saves and downloads an updated `config.js`
- **Settings** — change admin password, paste Google Sheet CSV URL, clear drafts

### CRM & booking infrastructure
- `assets/js/tracking.js` — GTM + GA4 + Meta + TikTok + Snapchat with consent gating
- `assets/js/consent.js` — bilingual cookie banner (UAE PDPL / EU GDPR)
- `assets/js/config.js` — single source of truth for all IDs and webhook URLs
- `assets/make-scenario.json` — Make.com scenario blueprint (import & connect Google account, etc.)
- Booking form → JSON POST to webhook → Make.com → Email + Sheet + WhatsApp + (optionally) CRM
- Per-form attribution: UTM, gclid, fbclid, ttclid, sc_click_id persist to localStorage on first touch
- Auto-fired events: `book_now_click`, `whatsapp_click`, `call_click`, `branch_page_view`, `offer_page_view`, `form_submit`, `booking_submit`

### Booking funnel intelligence
- 4-step stepper: Branch → Service → Date & Time → Details
- **Geolocation auto-suggest** — proposes nearest branch when user grants location
- **Mock slot availability** — date+branch driven, ready for drop-in CRM API
- Generated booking ID (`KNN-[branchCode]-[ts36]`)
- Server-rendered Thank-you page with booking summary and add-to-calendar buttons

### SEO & performance
- 75-URL `sitemap.xml` with hreflang annotations
- `robots.txt`
- Organization + WebSite + LocalBusiness/HairSalon/DaySpa schema (JSON-LD per branch)
- Article schema on blog posts
- OG + Twitter card tags on every page
- `manifest.json` + favicon SVG + theme-color
- Canonical URLs + hreflang on every page

### Accessibility (WCAG 2.1 AA-targeted)
- Semantic HTML, ARIA on icon-only controls
- Visible 2px gold focus ring everywhere
- `prefers-reduced-motion` respected
- Full RTL parity for Arabic

---

## Run locally

```
python -m http.server 8765
```

Open <http://127.0.0.1:8765/>. Admin at <http://127.0.0.1:8765/admin/>.

(Or any other static server — `npx serve`, `php -S`, etc.)

---

## Generators (run with `node`)

| Script | Purpose |
|---|---|
| `generate-branches.js` | Builds the 10 EN branch detail pages from `content/branches.json` |
| `generate-ar-branches.js` | Builds the 10 AR branch detail pages |
| `generate-services.js` | Builds the 7 EN service detail pages |
| `generate-ar-services.js` | Builds the 7 AR service detail pages |
| `generate-sitemap.js` | Builds `sitemap.xml` from all `.html` files |
| `enhance-pages.js` | Idempotent batch: adds OG tags, favicon, utility bar, newsletter to every page |
| `update-scripts.js` | Idempotent batch: ensures every page loads `config.js`, `tracking.js`, `consent.js` |

---

## Pre-launch data replacement

See `DATA-TO-REPLACE.md` for the full punch list. In short:

1. **Brand** — logo, hex codes, OG image, favicon
2. **Branches** — real addresses, phones, WhatsApp, hours, photos (×10)
3. **Services** — real prices and descriptions
4. **Tracking IDs** — paste into Admin → Integrations
5. **Webhook** — Make.com scenario URL into Admin → Integrations
6. **Leads Sheet** — published CSV URL into Admin → Settings
7. **Arabic copy review** — UAE-native copywriter pass (PDF requirement)

---

## File map

```
.
├── index.html, about.html, services.html, offers.html,
├── branches.html, gallery.html, book.html, thank-you.html,
├── contact.html, privacy-policy.html, terms.html, cookie-policy.html,
├── accessibility.html, 404.html, search.html, blog.html
├── services/      (7 service detail pages)
├── branches/      (10 branch detail pages, each with gallery + map + schema)
├── blog/          (sample article)
├── lp/            (marketing landing pages — eid-offer.html sample)
├── ar/            (full Arabic mirror — 35+ pages, RTL)
├── admin/         (login, dashboard, offers, branches, banners, integrations, settings, leads)
├── content/       (offers.json, branches.json, site.json, testimonials.json — admin-editable)
├── assets/
│   ├── css/style.css           — design system
│   ├── js/main.js              — interaction (header, stepper, form, geolocation, slot check)
│   ├── js/data.js              — shared data
│   ├── js/config.js            — IDs & webhook URLs
│   ├── js/tracking.js          — GTM + pixels with consent
│   ├── js/consent.js           — cookie banner
│   ├── make-scenario.json      — Make.com scenario blueprint
│   └── img/                    — favicon, og-default, branch images
├── generate-*.js               — content generators
├── enhance-pages.js            — batch page enhancer (idempotent)
├── update-scripts.js           — batch script updater (idempotent)
├── manifest.json, robots.txt, sitemap.xml
├── DATA-TO-REPLACE.md          — pre-launch checklist
└── README.md
```

---

## How to migrate to WordPress later

Each piece maps cleanly:

| Static piece | WordPress equivalent |
|---|---|
| `content/branches.json` | `branch` CPT + ACF fields |
| `content/offers.json` | `offer` CPT + ACF fields |
| `content/site.json` | ACF Options Page (Global) |
| `content/testimonials.json` | `testimonial` CPT |
| `assets/js/tracking.js` | GTM via plugin (e.g., GTM4WP) |
| Booking webhook | Fluent Forms + same Make.com webhook |
| Admin panel | WP-Admin + ACF + role-based permissions |
| Bilingual EN/AR | WPML or Polylang |

The booking webhook abstraction means swapping in Salonist/Fresha/Zoho is a Make.com change — no front-end rework.
