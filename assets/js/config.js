/* ============================================================
   KANAAN — Site configuration
   Replace placeholder IDs and the booking webhook URL with real values.
   ============================================================ */

window.KANAAN_CONFIG = {

  /* ============================================================
     SITE — public production URL used in the QR code on thank-you.html.
     The QR encodes `<site.url>/thank-you.html?id=…` so scanning works on
     any phone after deploy. In local dev this means the QR still encodes
     the live URL instead of 127.0.0.1 (which a phone scanner can't reach).
     ============================================================ */
  site: {
    url: 'https://kanaanspa.ae'
  },

  /* ============================================================
     TRACKING IDS — replace each placeholder when ready
     ============================================================ */
  tracking: {
    gtmId: '',          // e.g. 'GTM-XXXXXXX'  — Google Tag Manager
    ga4Id: 'G-7GVEFWMT85', // Google Analytics 4 (only if not loaded via GTM)
    metaPixelId: '',    // e.g. '123456789012345' — Meta (Facebook/Instagram) Pixel
    tiktokPixelId: '',  // e.g. 'CXXXXXXXXXXXXXXXX' — TikTok Pixel
    snapPixelId: '',    // e.g. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' — Snapchat Pixel
    googleAdsId: '',    // e.g. 'AW-XXXXXXXXX' — Google Ads (optional)
    recaptchaSiteKey: ''// e.g. '6LcXXXXXXXXXX' — reCAPTCHA v3 site key (added to all forms)
  },

  /* Per-form webhook overrides — fall back to booking.webhookUrl */
  forms: {
    contact: '',     // POST destination for /contact.html
    newsletter: '',  // POST destination for footer signup (e.g. Mailchimp/Zoho subscriber endpoint)
    careers: '',     // POST destination for /careers.html (with CV upload, multipart/form-data)
    landing: ''      // POST destination for /lp/* forms
  },

  /* CRM availability adapter — when set, the booking page calls this URL with
     ?branch=<id>&date=<yyyy-mm-dd> and expects a JSON array of free slot strings.
     Leave empty to use the built-in mock that returns ~70% of slots. */
  crm: {
    availabilityUrl: '',  // e.g. 'https://api.fresha.com/v1/availability'
    apiKey: '',           // sent as X-API-Key header
    provider: 'mock'      // 'mock' | 'fresha' | 'salonist' | 'zoho' | 'custom'
  },

  /* ============================================================
     BOOKING WEBHOOK
     v1: form submits via POST to this URL.
     Recommended: Make.com / Zapier scenario that fans out to:
       - Admin email
       - Google Sheet row append
       - WhatsApp Cloud API notification
       - (later) Salonist / Fresha / Zoho Bookings
     ============================================================ */
  booking: {
    // Internal website booking form DISABLED per marketing Work Order —
    // all bookings moved to Salonist. This only guards the form submit; the
    // form code + backend handler are kept intact for a 2-week rollback.
    // To restore the old form, set this back to false.
    disabled: true,
    // Optional Make.com / Google Apps Script webhook (legacy fallback).
    // If supabase.url is set below, Supabase is used instead.
    webhookUrl: '',
    fallbackEmail: 'kanaansaloon@gmail.com',
    confirmRedirect: 'thank-you'
  },

  /* ============================================================
     SUPABASE — primary booking store
     Setup guide: see SUPABASE_SETUP.md
     Free tier: 500 MB. Admin panel warns at 80%.
     ============================================================ */
  supabase: {
    url:      'https://ckqioeixkwuxrcybsoew.supabase.co',
    anonKey:  'sb_publishable_UQDMxcrZKcQBJc2UQffe0Q_NLTnuyjh',
    table:    'bookings',
    maxSizeMB: 500
  },

  /* ============================================================
     LEADS SHEET — optional CSV-published Google Sheet whose rows are
     merged into the admin dashboard alongside Supabase bookings.
     Used for ad-platform leads (Meta/TikTok Lead Ads), walk-ins, and
     manual entries. Expected header row (in this exact order):
       bookingId, timestamp, status, branch, service, date, time,
       name, phone, email, dob, message, source, campaign
     Set csvUrl to a Google Sheet "Publish to web → .csv" URL.
     ============================================================ */
  leadsSheet: {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_o492-nQXb5R87_M48BrrPrzJzGlWj6sYNoYvkiiEc8TBUwuSWtwuOVDtYfRFFriSRVAxRi60sNLF/pub?gid=0&single=true&output=csv'
  },

  /* ============================================================
     APPLE / GOOGLE WALLET
     Both buttons on the thank-you page stay hidden until the
     respective endpoint is configured. Apple needs a server-side
     route that returns a signed `.pkpass` for a booking ID.
     Google needs a service-account-signed JWT.
     See LAUNCH_CHECKLIST.md → "Wallet integration" for setup.
     ============================================================ */
  wallet: {
    applePassEndpoint:  '',  // e.g. 'https://api.kanaanspa.ae/wallet/apple/{id}'
    googleSaveEndpoint: ''   // e.g. 'https://api.kanaanspa.ae/wallet/google/{id}'
  },

  /* ============================================================
     CONTACT
     ============================================================ */
  contact: {
    centralPhone: '+971 50 555 6795',
    centralWhatsApp: '971505556795',
    email: 'kanaansaloon@gmail.com'
  },

  /* ============================================================
     CONSENT
     UAE PDPL / EU GDPR friendly defaults — pixels stay disabled
     until the user accepts marketing cookies.
     ============================================================ */
  consent: {
    cookieName: 'kanaan_consent',
    defaultMarketing: false   // marketing cookies OFF by default
  }
};
