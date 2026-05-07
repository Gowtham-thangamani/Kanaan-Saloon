# Kanaan Acceptance Criteria

Gherkin-style Given/When/Then for every functional requirement. Use these as QA test scripts.

## Booking funnel

### BK-001 — Happy path
- **Given** branch + service + date + time + name + phone + consent are filled
- **When** the user submits step 4
- **Then** the form POSTs to `KANAAN_CONFIG.booking.webhookUrl` with status 200
- **And** the user is redirected to `/thank-you.html?branch=…&service=…&date=…&time=…&id=KNN-XXX-XXX`
- **And** `booking_submit` event fires in `dataLayer`

### BK-002 — Past date blocked
- **Given** the user opens step 3
- **When** the date input is rendered
- **Then** the `min` attribute equals today's ISO date

### BK-003 — Friday-aware time slots
- **Given** branch=any and date=Friday
- **When** step 3 loads slots
- **Then** the slot list contains no times before 14:00

### BK-004 — Outside-hours / closed-day blocked
- **Given** branch=Baniyas Spa and date=Friday
- **When** the slot list loads
- **Then** every offered slot falls within the branch's Friday hours from `branches.json`

### BK-005 — Phone format validated
- **Given** phone field contains `< 7 digits`
- **When** step 4 submits
- **Then** the phone field shows error border + scroll-to behaviour

### BK-006 — Required fields gated
- **Given** any required field empty
- **When** the user clicks Continue/Submit
- **Then** the wizard does not advance + the offending field shows error border

### BK-007 — Consent unchecked blocks
- **Given** consent checkbox unchecked
- **When** Submit is clicked
- **Then** browser-native required validation blocks submit

### BK-008 — Webhook 5xx retries 3 times
- **Given** webhook returns 500/502/503/504/429
- **When** booking submits
- **Then** `main.js` retries with delays 0s, 2s, 8s
- **And** if all 3 fail, payload is queued in `localStorage['kanaan_lead_queue']`
- **And** user still sees thank-you page (no failure message)

### BK-009 — Offline queue drains on next page load
- **Given** queue has items in `kanaan_lead_queue`
- **When** any page loads with valid `webhookUrl`
- **Then** each item is replayed; successes removed; failures retained

### BK-010 — Booking ID format
- **Given** any successful submit
- **When** `bookingId` is generated
- **Then** it matches pattern `KNN-[A-Z]{1,3}-[A-Z0-9]+`

### BK-011 — RTL flow
- **Given** locale=ar
- **When** booking submits
- **Then** the user is redirected to `/ar/thank-you.html` (not `/thank-you.html`)

### BK-012 — Geolocation auto-suggest
- **Given** user grants `navigator.geolocation` permission
- **When** step 1 loads
- **Then** the nearest branch is pre-selected and a gold hint message appears

### BK-013 — Geolocation denial silent
- **Given** user denies permission
- **When** step 1 loads
- **Then** no error is shown; no branch pre-selected

### BK-014 — UTM persistence
- **Given** user lands on `?utm_source=meta&utm_campaign=eid`
- **When** later submits a booking
- **Then** payload contains `utm_source: meta, utm_campaign: eid`

### BK-015 — Slot intersection (CRM API + day filter)
- **Given** CRM returns `['09:00','10:00','11:00']` and date=Friday
- **When** slot list renders
- **Then** `09:00` is excluded (Friday opens 14:00) — only intersection is shown

### BK-016 — Reschedule link prefilled
- **Given** thank-you page loads with `?id=KNN-KHA-ABC&branch=Khalifa+City&date=2026-05-15&time=14:00`
- **When** user clicks "Reschedule / Cancel"
- **Then** WhatsApp opens with text `"Hi Kanaan, I need to reschedule or cancel booking KNN-KHA-ABC (Khalifa City, 2026-05-15 14:00). Thank you."`

## Quick-book (homepage)

### QB-001 — Quick-book passes prefill to /book.html
- **Given** user fills branch=Khalifa City + service=Hair & Beard
- **When** user clicks Continue
- **Then** browser navigates to `/book.html?branch=Khalifa City&service=Hair %26 Beard...`

## Forms

### FM-001 — Newsletter visual confirmation
- **Given** valid email submitted
- **When** form fires submit
- **Then** button text becomes "Sent ✓" then resets after 4s

### FM-002 — Contact form fires
- **Given** valid name + phone + email + message
- **When** submit
- **Then** POST → `forms.contact` URL (or fall back to booking webhook)

### FM-003 — Careers multipart
- **Given** form contains `<input type="file">` with PDF
- **When** submit
- **Then** request body is `multipart/form-data` (not JSON)

### FM-004 — File size limit (browser-side)
- **Given** file > 5MB
- **When** chosen
- **Then** browser-native size enforcement (manual; Make.com should also reject)

### FM-005 — reCAPTCHA injected when key configured
- **Given** `KANAAN_CONFIG.tracking.recaptchaSiteKey` set
- **When** any form submits
- **Then** payload contains `recaptchaToken`

## Tracking

### TR-001 — Pixels gated on consent
- **Given** marketing cookies denied
- **When** page loads
- **Then** no `connect.facebook.net`, `analytics.tiktok.com`, `sc-static.net` request fires

### TR-002 — Consent default-deny set before GTM
- **Given** any first visit
- **When** GTM script begins loading
- **Then** `gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' })` was already called

### TR-003 — Booking event has full params
- **Given** booking submits
- **When** event arrives in GA4 DebugView
- **Then** `booking_submit` event has params: `branch`, `service`, `bookingId`

### TR-004 — UTM persists 30 days
- **Given** first visit with `?utm_source=meta`
- **When** user returns within 30 days
- **Then** `localStorage.kanaan_attribution.utm_source === 'meta'`

## Admin

### AD-001 — Default password works first time
- **Given** no prior login
- **When** password=`kanaan2026` submitted
- **Then** session created, redirect to `/admin/dashboard.html`

### AD-002 — Wrong password rejected
- **Given** any non-matching password
- **When** submit
- **Then** "Wrong password" message shown

### AD-003 — Password change validation
- **Given** new password < 8 chars OR mismatch
- **When** Update clicked
- **Then** toast error; password not changed

### AD-004 — Offer edit persists locally
- **Given** any offer field edited
- **When** Save Locally clicked
- **Then** `localStorage['kanaan_content_content/offers.json']` contains modified data

### AD-005 — Download writes JSON
- **Given** any draft
- **When** Download clicked
- **Then** browser downloads file with current draft contents

### AD-006 — Branch hide reflects on hub
- **Given** branch.active=false saved + JSON deployed
- **When** `/branches.html` reloads
- **Then** that branch's card is not in DOM

### AD-007 — Lead state persists per booking ID
- **Given** any lead row visible in `/admin/leads.html`
- **When** state dropdown changed to "Confirmed"
- **Then** `localStorage['kanaan_lead_states'][bookingId] === 'confirmed'`
- **And** state pill colour updates without page reload

### AD-008 — CSV URL save
- **Given** valid published-CSV URL pasted
- **When** Save URL clicked
- **Then** `localStorage['kanaan_leads_csv_url']` set; leads dashboard fetches from URL on next load

### AD-009 — Logout clears session
- **Given** logged-in admin
- **When** Sign out clicked
- **Then** sessionStorage cleared, redirect to `/admin/index.html`

## Runtime

### RT-001 — Site.json populates hero
- **Given** `/index.html` loads
- **When** runtime.js fetches site.json
- **Then** `.hero__title` contains `homepage_hero.headline_html` value

### RT-002 — Offers list filtered by URL branch param
- **Given** URL `/offers.html?branch=baniyas-spa`
- **When** offers render
- **Then** every shown card has `branches` array containing 'all' OR 'baniyas-spa'

### RT-003 — Offer date filter excludes expired
- **Given** offer.valid_to < today
- **When** offers render
- **Then** that offer is not in DOM

### RT-004 — Bilingual binding picks correct lang
- **Given** `/ar/offers.html`
- **When** offers render
- **Then** card title is the `name_ar` value (Arabic text)

## Schema

### SC-001 — LocalBusiness validates
- **Given** any branch detail page
- **When** Rich Results Test runs
- **Then** 0 errors; LocalBusiness type detected

### SC-002 — FAQPage detected on services
- **Given** `/services/hair-beard.html`
- **When** Rich Results Test runs
- **Then** FAQPage type with 5 questions detected

### SC-003 — BreadcrumbList present
- **Given** any service detail page
- **When** Rich Results Test runs
- **Then** BreadcrumbList with 3 items

### SC-004 — hreflang reciprocal
- **Given** `/services/hair-beard.html`
- **When** parsed
- **Then** alternate hreflang=ar points to `/ar/services/hair-beard.html`
- **And** that AR page links back with hreflang=en

## SEO

### SEO-001 — Each page has unique title
- **Given** any HTML page
- **When** title is parsed
- **Then** title is non-empty AND unique site-wide

### SEO-002 — Meta description present
- **Given** any HTML page
- **When** parsed
- **Then** `<meta name="description">` present and 50-160 chars

### SEO-003 — Sitemap present
- **Given** GET `/sitemap.xml`
- **When** XML parsed
- **Then** ≥75 URLs with hreflang pairs

### SEO-004 — robots.txt allows crawl
- **Given** GET `/robots.txt`
- **Then** `User-agent: *` and `Allow: /` present
- **And** `Disallow: /admin/` and `Disallow: /thank-you.html`

## Accessibility

### A11Y-001 — One H1 per page
- **Given** any page
- **When** parsed
- **Then** exactly 1 `<h1>` element

### A11Y-002 — Focus visible
- **Given** keyboard tab through any page
- **When** focus lands on any link/button
- **Then** 2px gold outline visible

### A11Y-003 — Reduced motion respected
- **Given** OS setting prefers-reduced-motion: reduce
- **When** any animation would play
- **Then** transition-duration is ≤1ms

### A11Y-004 — RTL parity
- **Given** any AR page
- **When** parsed
- **Then** `<html dir="rtl">` present
- **And** primary text is right-aligned

## Performance

### PF-001 — LCP target
- **Given** mobile 4G simulation
- **When** PageSpeed Insights runs on `/index.html`
- **Then** LCP ≤ 2.0s

### PF-002 — CLS target
- **Given** same
- **Then** CLS ≤ 0.05

### PF-003 — Total page weight
- **Given** any page (post-launch with real images)
- **When** measured
- **Then** total transfer ≤ 1.5 MB

## Security

### SEC-001 — HTTPS enforced
- **Given** request to `http://kanaan.ae/...`
- **When** processed
- **Then** 301 redirect to `https://...`

### SEC-002 — Admin not indexed
- **Given** GET `/admin/*`
- **When** response inspected
- **Then** `X-Robots-Tag: noindex, nofollow` header present

### SEC-003 — CSP blocks inline JS from unknown origins
- **Given** browser parses CSP header
- **When** a 3rd-party script tries to inject
- **Then** browser blocks unless origin is in CSP allowlist

## Out of scope (v2 / future)

- Real-time slot inventory with 5-min hold (currently mocked)
- Stripe deposit on booking (currently no payment)
- Loyalty programme / repeat-customer detection
- Public client login portal
- Native mobile app
