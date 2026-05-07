/* ============================================================
   KANAAN — Site configuration
   Replace placeholder IDs and the booking webhook URL with real values.
   ============================================================ */

window.KANAAN_CONFIG = {

  /* ============================================================
     TRACKING IDS — replace each placeholder when ready
     ============================================================ */
  tracking: {
    gtmId: '',          // e.g. 'GTM-XXXXXXX'  — Google Tag Manager
    ga4Id: '',          // e.g. 'G-XXXXXXXXXX' — Google Analytics 4 (only if not loaded via GTM)
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
    // Optional Make.com / Google Apps Script webhook (legacy fallback).
    // If supabase.url is set below, Supabase is used instead.
    webhookUrl: '',
    fallbackEmail: 'kanaansaloon@gmail.com',
    confirmRedirect: 'thank-you.html'
  },

  /* ============================================================
     SUPABASE — primary booking store
     Setup guide: see SUPABASE_SETUP.md
     Free tier: 500 MB. Admin panel warns at 80%.
     ============================================================ */
  supabase: {
    url:      '',     // e.g. 'https://xxxxxxx.supabase.co'
    anonKey:  '',     // your anon/public key from Project Settings → API
    table:    'bookings',
    maxSizeMB: 500
  },

  /* ============================================================
     CONTACT
     ============================================================ */
  contact: {
    centralPhone: '+971505556795',
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
