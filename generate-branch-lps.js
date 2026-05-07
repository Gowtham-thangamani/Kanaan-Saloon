// Generates per-branch paid-ads landing pages from content/branches.json.
// Output: /lp/{branch-id}-near-me.html
// Run: node generate-branch-lps.js
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'branches.json'), 'utf8'));
const branches = data.branches.filter(b => b.active !== false);

const tpl = (b) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Men's Salon in ${b.area_en} — Kanaan ${b.name_en}</title>
  <meta name="description" content="Premium men's grooming, barbering and spa in ${b.area_en}. Book your chair at Kanaan ${b.name_en} in 30 seconds." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/css/style.css" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Men's Salon in ${b.area_en} — Kanaan ${b.name_en}" />
  <meta property="og:image" content="${b.image}" />
  <link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg" />
  <link rel="apple-touch-icon" href="../assets/img/favicon.svg" />
  <link rel="manifest" href="../manifest.json" />
  <meta name="theme-color" content="#0E0F11" />
  <style>
    .lp-form { background: var(--c-carbon); padding: 32px; border: 1px solid var(--c-smoke); }
    .lp-grid { display: grid; grid-template-columns: 1fr 460px; gap: 48px; align-items: start; }
    @media (max-width: 900px) { .lp-grid { grid-template-columns: 1fr; gap: 32px; } }
  </style>
</head>
<body>

  <header class="site-header">
    <div class="site-header__inner">
      <a href="../index.html" class="logo">KANAAN<span>.</span></a>
      <div class="header-actions">
        <a href="https://wa.me/${b.whatsapp}" class="btn btn--sm btn--ghost" data-track="whatsapp_click">WhatsApp</a>
        <a href="tel:${b.phone}" class="btn btn--sm" data-track="call_click">Call</a>
      </div>
    </div>
  </header>

  <section class="page-hero" style="min-height: auto; padding: 100px 0 0;">
    <div class="page-hero__media"><img src="${b.image}" alt="Inside Kanaan ${b.name_en}" /></div>
    <div class="container page-hero__content">
      <span class="eyebrow">Men's Salon · ${b.area_en}</span>
      <h1 class="page-hero__title">Kanaan ${b.name_en}.<br/>Premium grooming.</h1>
      <p class="lede" style="color: var(--c-pearl); margin-top: var(--s-4); max-width: 560px;">Master barbers. Spa-grade hygiene. Hot-towel shaves, signature haircuts, facials, and Moroccan bath rituals — at the standard you came for.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="lp-grid">
        <div>
          <span class="eyebrow">Why choose ${b.name_en}</span>
          <h2 class="display-2" style="margin-top: var(--s-3);">A house worth driving to.</h2>
          <div class="divider"></div>
          <ul style="list-style: none; padding: 0; line-height: 2.2; font-size: 16px;">
            <li>· Located in ${b.area_en} — ${b.address_en}</li>
            <li>· Open ${(b.hours && b.hours.sat) ? 'Sat–Thu ' + b.hours.sat.replace('-', '–') + ' · Fri ' + (b.hours.fri || '14:00–23:00').replace('-', '–') : 'daily'}</li>
            <li>· Master barbers and trained spa therapists</li>
            <li>· Spa-grade hygiene · Single-use blades</li>
            <li>· English &amp; Arabic service</li>
            <li>· Walk-ins welcome where availability allows</li>
          </ul>

          <h3 style="margin-top: var(--s-7); font-size: 26px;">Most popular at ${b.name_en}</h3>
          <div style="border-top: 1px solid var(--hairline); margin-top: var(--s-4);">
            <div style="display:flex; justify-content:space-between; padding: 16px 0; border-bottom: 1px solid var(--hairline);">
              <span>Signature Haircut</span><span class="text-gold">From 75 AED</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 16px 0; border-bottom: 1px solid var(--hairline);">
              <span>Beard Sculpt</span><span class="text-gold">From 60 AED</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 16px 0; border-bottom: 1px solid var(--hairline);">
              <span>Hot-Towel Shave</span><span class="text-gold">From 90 AED</span>
            </div>
            ${b.type === 'Spa' || b.type === 'VIP' ? `<div style="display:flex; justify-content:space-between; padding: 16px 0; border-bottom: 1px solid var(--hairline);"><span>Moroccan Bath</span><span class="text-gold">From 180 AED</span></div>` : ''}
            <div style="display:flex; justify-content:space-between; padding: 16px 0;">
              <span>8-Service Signature Package</span><span class="text-gold">250 AED</span>
            </div>
          </div>
        </div>

        <aside>
          <form class="lp-form" data-lp-form>
            <span class="eyebrow">Reserve in 30 seconds</span>
            <h3 style="font-family: var(--f-display); font-size: 30px; margin: 12px 0 8px;">Book at ${b.name_en}.</h3>
            <p class="muted" style="font-size: 14px; margin-bottom: var(--s-5);">No payment now — we'll WhatsApp you within 30 minutes during open hours.</p>

            <input type="hidden" name="branch" value="${b.name_en}" />
            <input type="hidden" name="branch_id" value="${b.id}" />
            <input type="hidden" name="lp_source" value="${b.id}-near-me" />

            <div class="form-group">
              <label for="lpName-${b.id}">Full name</label>
              <input type="text" id="lpName-${b.id}" name="name" required />
            </div>
            <div class="form-group">
              <label for="lpPhone-${b.id}">Phone (UAE)</label>
              <input type="tel" id="lpPhone-${b.id}" name="phone" placeholder="+971 50 555 6795" required />
            </div>
            <div class="form-group">
              <label for="lpService-${b.id}">Service</label>
              <select id="lpService-${b.id}" name="service" required>
                <option value="">Select…</option>
                <option>Signature Haircut</option>
                <option>Beard Sculpt</option>
                <option>Hot-Towel Shave</option>
                <option>Facial</option>
                ${b.type === 'Spa' || b.type === 'VIP' ? '<option>Moroccan Bath</option>' : ''}
                <option>8-Service Package</option>
                <option>Other (describe in message)</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="lpDate-${b.id}">Date</label>
                <input type="date" id="lpDate-${b.id}" name="date" required />
              </div>
              <div class="form-group">
                <label for="lpTime-${b.id}">Time</label>
                <select id="lpTime-${b.id}" name="time" required>
                  <option value="">Select…</option>
                  <option>10:00</option><option>12:00</option><option>14:00</option><option>16:00</option>
                  <option>18:00</option><option>20:00</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn--lg" style="width: 100%; justify-content: center;" data-track="booking_submit">Book at ${b.name_en}</button>
            <p style="font-size: 11px; color: var(--muted); margin-top: 12px; text-align: center;">Confirmation by WhatsApp within 30 minutes during open hours.</p>
          </form>

          <div style="margin-top: var(--s-5); text-align: center;">
            <p class="muted" style="font-size: 13px; margin-bottom: 8px;">Or talk to us directly:</p>
            <div class="flex gap-3" style="justify-content: center;">
              <a href="https://wa.me/${b.whatsapp}?text=Hi%20Kanaan%20${encodeURIComponent(b.name_en)}%2C" class="btn btn--ghost btn--sm" data-track="whatsapp_click">WhatsApp</a>
              <a href="tel:${b.phone}" class="btn btn--ghost btn--sm" data-track="call_click">Call</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <section class="section section--light section--tight">
    <div class="container">
      <div class="grid grid-3">
        <blockquote style="border-left: 1px solid var(--c-gold); padding-left: var(--s-5);">
          <p style="font-family: var(--f-display); font-size: 20px;">"Best haircut I've had in Abu Dhabi."</p>
          <footer class="muted" style="font-size: 13px;">— Khalid A.</footer>
        </blockquote>
        <blockquote style="border-left: 1px solid var(--c-gold); padding-left: var(--s-5);">
          <p style="font-family: var(--f-display); font-size: 20px;">"Quality never drops. Visit after visit."</p>
          <footer class="muted" style="font-size: 13px;">— Hassan T.</footer>
        </blockquote>
        <blockquote style="border-left: 1px solid var(--c-gold); padding-left: var(--s-5);">
          <p style="font-family: var(--f-display); font-size: 20px;">"They treat it like a craft, not a transaction."</p>
          <footer class="muted" style="font-size: 13px;">— Ahmed R.</footer>
        </blockquote>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <h3 style="font-family: var(--f-display); font-size: 28px; margin-bottom: var(--s-4);">Find ${b.name_en}.</h3>
      <div style="aspect-ratio: 21/9; border: 1px solid var(--hairline); overflow: hidden;">
        <iframe src="https://www.google.com/maps?q=${b.maps_query}&output=embed" width="100%" height="100%" style="border:0; filter: grayscale(0.4) contrast(1.05);" loading="lazy" title="Map to Kanaan ${b.name_en}"></iframe>
      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom"><span>© 2026 Kanaan Gents Salon &amp; Spa.</span><div class="footer-bottom__links"><a href="../privacy-policy.html">Privacy</a><a href="../terms.html">Terms</a></div></div>
    </div>
  </footer>

  <div class="mobile-cta">
    <button class="mobile-cta__book" onclick="document.getElementById('lpName-${b.id}').focus(); document.getElementById('lpName-${b.id}').scrollIntoView({behavior:'smooth', block:'center'});">Book at ${b.name_en}</button>
    <a href="https://wa.me/${b.whatsapp}" data-track="whatsapp_click" aria-label="WhatsApp"><span class="mobile-cta__icon">✉</span></a>
    <a href="tel:${b.phone}" data-track="call_click" aria-label="Call"><span class="mobile-cta__icon">☏</span></a>
  </div>

  <script src="../assets/js/config.js"></script>
  <script src="../assets/js/tracking.js"></script>
  <script src="../assets/js/consent.js" defer></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
`;

const outDir = path.join(__dirname, 'lp');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
branches.forEach(b => {
  fs.writeFileSync(path.join(outDir, b.id + '-near-me.html'), tpl(b));
  console.log('wrote', 'lp/' + b.id + '-near-me.html');
});
console.log(`\nGenerated ${branches.length} branch landing pages.`);
