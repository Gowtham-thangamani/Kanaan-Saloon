// Generates 10 EN branch detail pages from content/branches.json.
// Run: node generate-branches.js
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'branches.json'), 'utf8'));
const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'prices.json'), 'utf8'));

// Pull min/max of all numeric prices for a branch (used for schema priceRange + visible label).
function priceStatsFor(branchId) {
  const p = prices.branches[branchId];
  if (!p) return { min: 25, max: 500 };
  const vals = [];
  p.categories.forEach(cat => cat.items.forEach(it => {
    if (typeof it.price === 'number') vals.push(it.price);
    if (it.prices) Object.values(it.prices).forEach(v => { if (typeof v === 'number') vals.push(v); });
  }));
  if (!vals.length) return { min: 25, max: 500 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

// Render the visible "Rates & Service Details" section per branch (English).
function pricesHtml(branchId) {
  const p = prices.branches[branchId];
  if (!p) return '';
  const cats = p.categories.map(cat => {
    if (cat.columns && cat.columns.length) {
      const heads = cat.columns.map(c => `<th style="text-align:right; padding:10px 12px; font-size:13px; letter-spacing:.05em; color:var(--c-stone); font-weight:500; text-transform:uppercase;">${c.label_en}</th>`).join('');
      const rows = cat.items.map(it => {
        const cells = cat.columns.map(c => {
          const v = it.prices && it.prices[c.key];
          return `<td style="text-align:right; padding:10px 12px; font-variant-numeric: tabular-nums; font-weight:500;">${v != null ? v : '—'}</td>`;
        }).join('');
        return `<tr style="border-bottom:1px solid var(--hairline);"><td style="padding:10px 12px;">${it.name_en}</td>${cells}</tr>`;
      }).join('');
      return `
      <div class="rate-card" style="margin-top: var(--s-6);">
        <h3 style="font-size:20px; margin:0 0 var(--s-3); padding-bottom:var(--s-2); border-bottom:1px solid var(--c-gold); display:inline-block;">${cat.name_en}</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead><tr style="background:rgba(200,160,74,0.06);"><th style="text-align:left; padding:10px 12px; font-size:13px; letter-spacing:.05em; color:var(--c-stone); font-weight:500; text-transform:uppercase;">Service</th>${heads}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    }
    const rows = cat.items.map(it =>
      `<tr style="border-bottom:1px solid var(--hairline);"><td style="padding:10px 12px;">${it.name_en}</td><td style="text-align:right; padding:10px 12px; font-variant-numeric: tabular-nums; font-weight:600; color:var(--c-gold);">${it.price} <span style="font-size:11px; color:var(--c-stone); font-weight:400;">AED</span></td></tr>`
    ).join('');
    return `
      <div class="rate-card" style="margin-top: var(--s-6);">
        <h3 style="font-size:20px; margin:0 0 var(--s-3); padding-bottom:var(--s-2); border-bottom:1px solid var(--c-gold); display:inline-block;">${cat.name_en}</h3>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
  return `
  <section class="section section--light" id="rates">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Rates &amp; Service Details</span>
        <h2 class="section-head__title display-2">Menu &amp; pricing.</h2>
        <p class="section-head__lede">All prices in AED. Prices include VAT.</p>
      </div>
      ${cats}
      <p class="muted" style="margin-top: var(--s-5); font-size:13px;">${prices.footer_note_en}</p>
    </div>
  </section>`;
}

// Build OfferCatalog itemListElement from real prices (cap to ~12 entries to keep schema tight).
function offerCatalogJson(branchId) {
  const p = prices.branches[branchId];
  if (!p) return '';
  const offers = [];
  p.categories.forEach(cat => cat.items.forEach(it => {
    if (typeof it.price === 'number') {
      offers.push({ name: it.name_en, price: it.price });
    } else if (it.prices) {
      const minP = Math.min(...Object.values(it.prices).filter(v => typeof v === 'number'));
      if (isFinite(minP)) offers.push({ name: it.name_en, price: minP });
    }
  }));
  return offers.slice(0, 12).map(o =>
    `{"@type":"Offer","name":${JSON.stringify(o.name)},"price":"${o.price}","priceCurrency":"AED","availability":"https://schema.org/InStock"}`
  ).join(',\n        ');
}

const typeBlurb = {
  Spa: "Our spa-led house — steam rooms, hammam, and the full grooming menu under one roof.",
  Barber: "A master-barber room — focused, exact, classical craftsmanship.",
  VIP: "A private VIP house — by appointment only, every visit in a discreet suite.",
  Standard: "A neighbourhood Kanaan house — the full menu of services in your area."
};
const typeEyebrow = {
  Spa: "Spa-Led House",
  Barber: "Master Barber Room",
  VIP: "VIP House · By Appointment",
  Standard: "Kanaan House"
};

function hoursList(b) {
  const days = [['Sat','sat'],['Sun','sun'],['Mon','mon'],['Tue','tue'],['Wed','wed'],['Thu','thu'],['Fri','fri']];
  return days.map(([label, k]) => {
    const v = (b.hours && b.hours[k]) || '';
    const display = !v || v.toLowerCase() === 'closed' ? 'Closed' : v.replace('-', ' — ');
    return `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--hairline); font-size:14px;"><span class="muted">${label}</span><span>${display}</span></div>`;
  }).join('');
}

const tpl = (b) => {
  const gallery = (b.gallery || [b.image]).map((src, i) =>
    `<a href="${src.replace('w=900','w=1600')}" data-lightbox-trigger><img src="${src}" alt="Kanaan ${b.name_en} interior ${i+1}" style="aspect-ratio: 4/5; object-fit: cover; width: 100%;" loading="lazy" /></a>`
  ).join('\n        ');

  const sameAsItems = [];
  if (b.google_business && !b.google_business.startsWith('REPLACE')) sameAsItems.push(b.google_business);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Kanaan ${b.name_en} | Men's Salon &amp; Spa in ${b.area_en}</title>
  <meta name="description" content="${typeBlurb[b.type] || typeBlurb.Standard} Address: ${b.address_en}. Book online or via WhatsApp." />
  <link rel="canonical" href="/branches/${b.id}.html" />
  <link rel="alternate" hreflang="en" href="/branches/${b.id}.html" />
  <link rel="alternate" hreflang="ar" href="/ar/branches/${b.id}.html" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/css/style.css" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Kanaan ${b.name_en} | Men's Salon &amp; Spa in ${b.area_en}" />
  <meta property="og:description" content="${typeBlurb[b.type] || typeBlurb.Standard}" />
  <meta property="og:url" content="https://kanaanspa.ae/branches/${b.id}.html" />
  <meta property="og:image" content="${b.image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg" />
  <link rel="manifest" href="../manifest.json" />
  <meta name="theme-color" content="#0E0F11" />
  <script src="../assets/js/tracking.js" defer></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness","HairSalon"${b.type==='Spa'||b.type==='VIP'?',"DaySpa"':''}],
    "name": "Kanaan ${b.name_en}",
    "image": ${JSON.stringify(b.gallery || [b.image])},
    "telephone": "${b.phone}",
    "address": { "@type": "PostalAddress", "streetAddress": "${b.address_en}", "addressLocality": "${b.area_en.split(',')[0]}", "addressCountry": "AE" },
    "geo": { "@type": "GeoCoordinates", "latitude": ${b.geo?.lat || 24.4}, "longitude": ${b.geo?.lng || 54.5} },
    "openingHoursSpecification": [
      ${Object.entries(b.hours || {}).filter(([_,v])=>v && v.includes('-')).map(([d,v])=>{
        const map={sun:'Sunday',mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday'};
        const [opens,closes]=v.split('-');
        return `{"@type":"OpeningHoursSpecification","dayOfWeek":"${map[d]}","opens":"${opens}","closes":"${closes}"}`;
      }).join(',\n      ')}
    ],
    "priceRange": "AED ${priceStatsFor(b.id).min}-${priceStatsFor(b.id).max}",
    "amenityFeature": [${(b.amenities || []).map(a => `{"@type":"LocationFeatureSpecification","name":"${a}","value":true}`).join(',')}],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Kanaan ${b.name_en} services",
      "itemListElement": [
        ${offerCatalogJson(b.id)}
      ]
    },
    "url": "https://kanaanspa.ae/branches/${b.id}.html"${sameAsItems.length?',\n    "sameAs": '+JSON.stringify(sameAsItems):''}
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [${(b.faqs || []).map(f => `{"@type":"Question","name":${JSON.stringify(f.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.a)}}}`).join(',')}]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Home","item":"https://kanaanspa.ae/"},
      {"@type":"ListItem","position":2,"name":"Branches","item":"https://kanaanspa.ae/branches.html"},
      {"@type":"ListItem","position":3,"name":"Kanaan ${b.name_en}","item":"https://kanaanspa.ae/branches/${b.id}.html"}
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Kanaan ${b.name_en}",
    "speakable": {"@type":"SpeakableSpecification","cssSelector":[".page-hero__title",".lede",".faq__a"]}
  }
  </script>
</head>
<body>

  <div class="utility-bar">
    <div class="utility-bar__inner">
      <span class="utility-bar__pitch">Ten houses in Abu Dhabi · One standard</span>
      <div class="utility-bar__actions">
        <a href="tel:${b.phone}" data-track="call_click">☏ ${b.phone}</a>
        <a href="https://wa.me/${b.whatsapp}" data-track="whatsapp_click">✉ WhatsApp ${b.name_en}</a>
      </div>
    </div>
  </div>

  <header class="site-header">
    <div class="site-header__inner">
      <a href="../index.html" class="logo">KANAAN<span>.</span></a>
      <nav class="main-nav">
        <a href="../index.html">Home</a>
        <a href="../about.html">About</a>
        <a href="../services.html">Services</a>
        <a href="../offers.html">Offers</a>
        <a href="../branches.html" class="is-active">Branches</a>
        <a href="../gallery.html">Gallery</a>
        <a href="../contact.html">Contact</a>
      </nav>
      <div class="header-actions">
        <a href="../ar/branches/${b.id}.html" class="lang-switch">عربي</a>
        <a href="../book.html?branch=${b.id}" class="btn btn--sm">Book Now</a>
        <button class="menu-toggle" aria-label="Open menu"><span></span><span></span><span></span></button>
      </div>
    </div>
    <nav class="mobile-nav">
      <a href="../index.html">Home</a><a href="../about.html">About</a><a href="../services.html">Services</a>
      <a href="../offers.html">Offers</a><a href="../branches.html">Branches</a><a href="../gallery.html">Gallery</a>
      <a href="../contact.html">Contact</a><a href="../ar/branches/${b.id}.html">عربي</a>
      <a href="../book.html?branch=${b.id}" class="btn">Book Now</a>
    </nav>
  </header>

  <section class="page-hero" style="min-height: 70vh; display:flex; align-items:flex-end;">
    <div class="page-hero__media"><img src="${b.image}" alt="Inside Kanaan ${b.name_en}" /></div>
    <div class="container page-hero__content">
      <div class="breadcrumb">
        <a href="../index.html">Home</a><span class="sep">/</span>
        <a href="../branches.html">Branches</a><span class="sep">/</span>
        <span>${b.name_en}</span>
      </div>
      <span class="eyebrow">${typeEyebrow[b.type] || typeEyebrow.Standard}</span>
      <h1 class="page-hero__title">Kanaan ${b.name_en}.</h1>
      <p class="lede" style="color: var(--c-pearl); margin-top: var(--s-4);">${b.area_en}</p>
      <div class="hero__cta" style="margin-top: var(--s-5);">
        <a href="../book.html?branch=${b.id}" class="btn btn--lg" data-track="book_now_click">Book at ${b.name_en}</a>
        <a href="https://wa.me/${b.whatsapp}" class="btn btn--ghost btn--lg" data-track="whatsapp_click">WhatsApp</a>
      </div>
    </div>
  </section>

  <section class="section section--light section--tight">
    <div class="container">
      <div class="grid grid-4" style="gap: 1px; background: var(--hairline); border: 1px solid var(--hairline);">
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">Address</span>
          <p style="margin: 8px 0 0; font-size: 15px;">${b.address_en}</p>
        </div>
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">Hours today</span>
          <p style="margin: 8px 0 0; font-size: 15px;"><span class="status-pill" data-hours='${JSON.stringify(Object.fromEntries(Object.entries(b.hours||{}).map(([k,v])=>{
            if (!v||v.toLowerCase()==='closed') return [k,null];
            const [open,close]=v.split('-'); return [k,{open,close}];
          })))}'>Checking…</span></p>
        </div>
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">Call</span>
          <p style="margin: 8px 0 0; font-size: 15px;"><a href="tel:${b.phone}" data-track="call_click" style="color: var(--c-ink);">${b.phone}</a></p>
        </div>
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">WhatsApp</span>
          <p style="margin: 8px 0 0; font-size: 15px;"><a href="https://wa.me/${b.whatsapp}" data-track="whatsapp_click" style="color: var(--c-ink);">+${b.whatsapp}</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="split">
        <div>
          <span class="eyebrow">About this house</span>
          <h2 class="display-2">${b.type === 'VIP' ? 'A private house, by appointment.' : b.type === 'Spa' ? 'A flagship spa house.' : b.type === 'Barber' ? 'A master barber room.' : 'Your neighbourhood Kanaan.'}</h2>
          <div class="divider"></div>
          <p class="lede">${typeBlurb[b.type] || typeBlurb.Standard}</p>
          <p class="muted">All Kanaan houses are held to the same brief — master-trained staff, spa-grade hygiene, professional product lines, time taken without rush.</p>
          <h3 style="font-size: 22px; margin-top: var(--s-6);">Working hours</h3>
          <div style="margin-top: var(--s-3);">${hoursList(b)}</div>
        </div>
        <div class="split__media"><img src="${b.image}" alt="Kanaan ${b.name_en} interior" /></div>
      </div>
    </div>
  </section>

  <section class="section section--light">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Available Here</span>
        <h2 class="section-head__title display-2">Services at this house.</h2>
      </div>
      <div class="flex gap-3" style="flex-wrap: wrap;">
        <a href="../services/hair-beard.html" class="btn btn--ghost btn--sm">Hair &amp; Beard</a>
        <a href="../services/facial-skin-care.html" class="btn btn--ghost btn--sm">Facial &amp; Skin</a>
        <a href="../services/massage.html" class="btn btn--ghost btn--sm">Massage</a>
        ${b.type === 'Spa' || b.type === 'VIP' ? '<a href="../services/moroccan-bath.html" class="btn btn--ghost btn--sm">Moroccan Bath</a>' : ''}
        <a href="../services/manicure-pedicure.html" class="btn btn--ghost btn--sm">Manicure &amp; Pedicure</a>
        <a href="../services/hair-treatment.html" class="btn btn--ghost btn--sm">Hair Treatment</a>
        <a href="../services/grooming-packages.html" class="btn btn--ghost btn--sm">Grooming Packages</a>
      </div>

      <div class="branch-social">
        <span class="eyebrow" style="color: var(--c-stone);">Follow ${b.name_en}</span>
        ${b.instagram ? `<a href="${b.instagram}" target="_blank" rel="noopener" data-track="instagram_click">📷 Instagram</a>` : ''}
        ${b.tiktok ? `<a href="${b.tiktok}" target="_blank" rel="noopener" data-track="tiktok_click">▶ TikTok</a>` : ''}
        ${b.google_business && !b.google_business.startsWith('REPLACE') ? `<a href="${b.google_business}" target="_blank" rel="noopener" data-track="gbp_click">★ Google Reviews</a>` : ''}
      </div>
    </div>
  </section>

  <!-- RATES & PRICING — from content/prices.json -->
  ${pricesHtml(b.id)}

  <!-- BRANCH OFFERS — runtime-loaded from offers.json -->
  <section class="section">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Available at this branch</span>
        <h2 class="section-head__title display-2">Offers for ${b.name_en}.</h2>
      </div>
      <div class="grid grid-3" data-bind-list="offers">
        <a data-bind-template href="" class="offer-card" data-bind-attr-href="book_url">
          <div class="offer-card__media">
            <span class="offer-card__badge" data-bind="badge"></span>
            <img data-bind-attr-src="image" alt="" />
          </div>
          <div class="offer-card__body">
            <h3 class="offer-card__title" data-bind="name"></h3>
            <ul class="offer-card__list" data-bind-html="inclusions_html"></ul>
            <div class="offer-card__price-row">
              <div class="offer-card__price"><span data-bind="price"></span> <small data-bind="currency"></small></div>
              <span class="text-link">Book →</span>
            </div>
          </div>
        </a>
      </div>
      <p style="text-align: center; margin-top: var(--s-7);"><a href="../offers.html" class="btn btn--ghost">View all offers</a></p>
    </div>
  </section>

  <section class="section section--light">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Inside the House</span>
        <h2 class="section-head__title display-2">${b.name_en}, in detail.</h2>
      </div>
      <div class="grid grid-3" style="gap: 8px;">
        ${gallery}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Find Us</span>
        <h2 class="section-head__title display-2">${b.area_en}.</h2>
      </div>
      <div style="aspect-ratio: 21/9; border: 1px solid var(--hairline); overflow: hidden;">
        <iframe src="https://www.google.com/maps?q=${b.maps_query || encodeURIComponent(b.address_en)}&output=embed" width="100%" height="100%" style="border:0; filter: grayscale(0.4) contrast(1.05);" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map to Kanaan ${b.name_en}"></iframe>
      </div>
    </div>
  </section>

  <!-- QUICK BOOK at this branch -->
  <section class="section section--light section--tight">
    <div class="container">
      <div class="quick-book">
        <span class="eyebrow">Quick Book at ${b.name_en}</span>
        <h2 class="quick-book__title">Book in two clicks.</h2>
        <p class="quick-book__sub">Pre-filled for ${b.name_en} — pick your service and date.</p>
        <form class="quick-book__row" onsubmit="event.preventDefault(); var qs=new URLSearchParams({branch:'${b.name_en.replace(/'/g, "\\'")}'}); ['qb-service','qb-date','qb-time'].forEach(function(id){var el=document.getElementById(id); if(el && el.value) qs.set(id.replace('qb-',''), el.value);}); window.location.href='../book.html?'+qs.toString();">
          <input type="hidden" value="${b.name_en}" />
          <select id="qb-service" required aria-label="Service">
            <option value="">Service…</option>
            <option>Hair &amp; Beard</option><option>Facial &amp; Skin</option><option>Massage</option>
            ${b.type==='Spa'||b.type==='VIP'?'<option>Moroccan Bath</option>':''}
            <option>Manicure &amp; Pedicure</option><option>Hair Treatment</option>
            <option>8-Service Package</option>${b.type==='VIP'?'<option>VIP Hour</option>':''}
          </select>
          <input type="date" id="qb-date" aria-label="Preferred date" />
          <input type="tel" id="qb-time" placeholder="Time (optional)" aria-label="Preferred time" />
          <button type="submit" class="btn" data-track="quick_book_click">Continue →</button>
        </form>
      </div>
    </div>
  </section>

  <!-- 14-day availability preview (visual; real availability via CRM v2) -->
  <section class="section">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Next 14 Days</span>
        <h2 class="section-head__title display-2">Pick a day.</h2>
        <p class="section-head__lede">Friday opens at 14:00 — all other days from 10:00${b.type === 'VIP' ? ' (VIP Muroor opens at 11:00)' : ''}.</p>
      </div>
      <div class="calendar-strip" id="cal-${b.id}"></div>
      <script>
        (function () {
          var box = document.getElementById('cal-${b.id}');
          if (!box) return;
          var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          var today = new Date();
          var html = '';
          for (var i = 0; i < 14; i++) {
            var d = new Date(today); d.setDate(today.getDate() + i);
            var iso = d.toISOString().split('T')[0];
            var isFri = d.getDay() === 5;
            html += '<a class="cal-day' + (isFri ? ' cal-day--late' : '') + '" href="../book.html?branch=${b.name_en}&date=' + iso + '" data-track="calendar_click">' +
                    '<span class="cal-day__dow">' + days[d.getDay()] + '</span>' +
                    '<span class="cal-day__num">' + d.getDate() + '</span>' +
                    '<span class="cal-day__mo">' + months[d.getMonth()] + '</span>' +
                    '<span class="cal-day__hint">' + (isFri ? 'opens 14:00' : 'open') + '</span>' +
                    '</a>';
          }
          box.innerHTML = html;
        })();
      </script>
    </div>
  </section>

  <!-- Per-branch testimonials -->
  ${(b.testimonials && b.testimonials.length) ? `
  <section class="section">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">In Our ${b.name_en} Chairs</span>
        <h2 class="section-head__title display-2">Words from regulars.</h2>
      </div>
      <div class="grid grid-3">
        ${b.testimonials.map(t => `
        <blockquote style="border-left: 1px solid var(--c-gold); padding-left: var(--s-5);">
          <p style="font-family: var(--f-display); font-size: 22px; line-height: 1.4;">"${t.q}"</p>
          <footer class="muted" style="font-size: 14px;">— ${t.n} · ${b.name_en}</footer>
        </blockquote>`).join('')}
      </div>
    </div>
  </section>` : ''}

  <!-- Per-branch FAQ (FAQPage schema above) -->
  ${(b.faqs && b.faqs.length) ? `
  <section class="section section--light">
    <div class="container" style="max-width: 880px;">
      <div class="section-head section-head--left">
        <span class="eyebrow">Frequently Asked</span>
        <h2 class="section-head__title display-2">About ${b.name_en}.</h2>
      </div>
      <div class="faq">
        ${b.faqs.map((f, i) => `
        <details class="faq__item"${i === 0 ? ' open' : ''}>
          <summary class="faq__q">${f.q}</summary>
          <p class="faq__a">${f.a}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>` : ''}

  <!-- Amenities (visible) -->
  ${(b.amenities && b.amenities.length) ? `
  <section class="section section--tight">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">At ${b.name_en}</span>
      </div>
      <div class="flex gap-3" style="flex-wrap: wrap;">
        ${b.amenities.map(a => `<span class="pill" style="padding: 8px 16px; border: 1px solid var(--hairline); font-size: 12px; letter-spacing: 0.06em; color: var(--muted);">✓ ${a}</span>`).join('')}
      </div>
    </div>
  </section>` : ''}

  <section class="cta-band">
    <h2 class="cta-band__title">Book at ${b.name_en}.</h2>
    <p class="cta-band__sub">Choose your service and time online — confirmation by ${b.name_en} branch.</p>
    <div class="hero__cta" style="justify-content: center; display: flex; gap: var(--s-4); flex-wrap: wrap;">
      <a href="../book.html?branch=${b.id}" class="btn btn--lg" data-track="book_now_click">Book Now</a>
      <a href="https://wa.me/${b.whatsapp}" class="btn btn--ghost btn--lg" data-track="whatsapp_click">WhatsApp Branch</a>
    </div>
    <!-- Share -->
    <div class="share-bar" style="justify-content: center; max-width: 520px; margin: var(--s-6) auto 0; border-color: rgba(255,255,255,0.1);">
      <span class="share-bar__label" style="color: var(--muted);">Share</span>
      <a href="https://wa.me/?text=${encodeURIComponent('Kanaan ' + b.name_en + ' — https://kanaanspa.ae/branches/' + b.id + '.html')}" target="_blank" rel="noopener" data-track="share_whatsapp" aria-label="WhatsApp"><svg class="icon"><use href="../assets/img/icons.svg#i-whatsapp"/></svg></a>
      <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent('https://kanaanspa.ae/branches/' + b.id + '.html')}" target="_blank" rel="noopener" data-track="share_twitter" aria-label="X / Twitter"><svg class="icon"><use href="../assets/img/icons.svg#i-x"/></svg></a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://kanaanspa.ae/branches/' + b.id + '.html')}" target="_blank" rel="noopener" data-track="share_facebook" aria-label="Facebook"><svg class="icon"><use href="../assets/img/icons.svg#i-facebook"/></svg></a>
      <a href="javascript:void(0)" onclick="navigator.clipboard.writeText('https://kanaanspa.ae/branches/${b.id}.html'); this.querySelector('svg').outerHTML='✓';" data-track="share_copy" aria-label="Copy link"><svg class="icon"><use href="../assets/img/icons.svg#i-copy"/></svg></a>
    </div>
  </section>

  <div class="lightbox" data-lightbox><img src="" alt="" /></div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">KANAAN<span>.</span></div>
          <p style="margin-top: var(--s-4);">Ten houses across Abu Dhabi. One uncompromising standard.</p>
          <div class="footer-socials"><a href="#">IG</a><a href="#">TT</a><a href="#">WA</a></div>
        </div>
        <div><h5>Visit</h5><ul><li><a href="../services.html">Services</a></li><li><a href="../offers.html">Offers</a></li><li><a href="../gallery.html">Gallery</a></li><li><a href="../about.html">About</a></li><li><a href="../contact.html">Contact</a></li></ul></div>
        <div><h5>Branches</h5><ul><li><a href="al-ain.html">Al Ain</a></li><li><a href="khalifa-city.html">Khalifa City</a></li><li><a href="khalidiya.html">Khalidiya</a></li><li><a href="baniyas-spa.html">Baniyas Spa</a></li><li><a href="baniyas-barber.html">Baniyas Barber</a></li></ul></div>
        <div><h5>&nbsp;</h5><ul><li><a href="rabdan.html">Rabdan</a></li><li><a href="old-shahamah.html">Old Shahamah</a></li><li><a href="new-shahamah.html">New Shahamah</a></li><li><a href="muroor.html">Muroor</a></li><li><a href="vip-muroor.html">VIP Muroor</a></li></ul></div>
      </div>
      <div class="footer-newsletter">
        <div><h5>Newsletter</h5><p>Kanaan offers and updates, once a month.</p></div>
        <form data-newsletter-form><input type="email" required placeholder="Your email" /><button type="submit" class="btn btn--sm">Subscribe</button></form>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Kanaan Gents Salon &amp; Spa.</span>
        <div class="footer-bottom__links"><a href="../privacy-policy.html">Privacy</a><a href="../terms.html">Terms</a><a href="../cookie-policy.html">Cookies</a><a href="../accessibility.html">Accessibility</a><a href="../ar/branches/${b.id}.html">عربي</a></div>
      </div>
    </div>
  </footer>

  <div class="mobile-cta">
    <a href="../book.html?branch=${b.id}" class="mobile-cta__book">Book at ${b.name_en}</a>
    <a href="https://wa.me/${b.whatsapp}" aria-label="WhatsApp"><span class="mobile-cta__icon">✉</span></a>
    <a href="tel:${b.phone}" aria-label="Call"><span class="mobile-cta__icon">☏</span></a>
  </div>

  <script src="../assets/js/config.js"></script>
  <script src="../assets/js/tracking.js"></script>
  <script src="../assets/js/consent.js" defer></script>
  <script src="../assets/js/runtime.js?v=${Date.now()}"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
`;
};

const outDir = path.join(__dirname, 'branches');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
data.branches.filter(b => b.active !== false).forEach(b => {
  fs.writeFileSync(path.join(outDir, b.id + '.html'), tpl(b));
  console.log('wrote', 'branches/' + b.id + '.html');
});
console.log(`\nGenerated ${data.branches.filter(b=>b.active!==false).length} branch pages.`);
try { require('child_process').execSync('node "' + path.join(__dirname, 'patch-branches-dropdown.js') + '"', { stdio: 'inherit' }); } catch (e) { console.warn('dropdown patcher skipped:', e.message); }
try { require('child_process').execSync('node "' + path.join(__dirname, 'patch-motion.js') + '"', { stdio: 'inherit' }); } catch (e) { console.warn('motion patcher skipped:', e.message); }
