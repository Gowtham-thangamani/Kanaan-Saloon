// Generates the remaining 6 service category detail pages from a shared template.
// Run with: node generate-services.js

const fs = require('fs');
const path = require('path');

const services = [
  {
    slug: 'hair-beard',
    name: 'Hair & Beard',
    num: '01 / 07',
    title: 'Hair & Beard',
    intro: 'Precision cuts. Classic shaves. Considered beard work — in the master-barber tradition.',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'Where craft sits<br/>in the chair.',
    aboutBody: 'Every haircut at Kanaan starts with a brief consultation — the way you wear it, the shape of your face, the days you actually have to maintain it. Our barbers are trained on classic European, modern, and Arabic men\'s styles, and we hold the same standard from a quick neck-tidy to a full hot-towel shave.',
    treatments: [
      { name: 'Signature Haircut', desc: 'Consultation, cut, wash, finish. ~45 minutes.', price: 'From 75 AED' },
      { name: 'Classic Hot-Towel Shave', desc: 'Pre-shave oil, double-pass straight razor, post-shave balm.', price: 'From 90 AED' },
      { name: 'Beard Sculpt', desc: 'Detail trim, shape, line work, conditioning.', price: 'From 60 AED' },
      { name: 'Father & Son', desc: 'Two cuts, side-by-side. Refreshments included.', price: 'From 140 AED' },
      { name: 'Master Barber Cut (VIP)', desc: 'Private suite, head therapist. By appointment only.', price: 'Ask for price' },
      { name: 'Hair Colour & Grey Cover', desc: 'Discreet grey blending or full-coverage colour.', price: 'Book consultation' }
    ],
    ritual: [
      { name: 'Consultation', body: 'A short conversation about how you wear it, what you want, and what suits you.' },
      { name: 'Execution', body: 'The work itself, performed without rush, with the right tools, by trained hands.' },
      { name: 'Finish', body: 'Wash, style, refresh — and a brief on how to maintain it until your next visit.' }
    ]
  },
  {
    slug: 'facial-skin-care',
    name: 'Facial & Skin Care',
    num: '02 / 07',
    title: 'Facial & Skin Care',
    intro: 'Calibrated facials for the man\'s skin — purifying, hydrating, restoring.',
    img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1583468982228-19f19164aee2?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'Skin care, calibrated.',
    aboutBody: 'Our facials begin with an honest assessment — skin type, sun exposure, shaving habits, hydration. We use professional product lines (Dermalogica, Biologique Recherche family-grade), and only what your skin actually needs. No upselling, no theatre.',
    treatments: [
      { name: 'Express Gentleman\'s Facial', desc: 'Cleanse, exfoliate, hydrate. ~30 minutes.', price: 'From 120 AED' },
      { name: 'Signature Facial', desc: 'Full-protocol facial with extraction and mask. ~60 minutes.', price: 'From 250 AED' },
      { name: 'Hydra Facial Men', desc: 'Multi-step deep-cleanse and hydration treatment.', price: 'From 380 AED' },
      { name: 'Anti-Fatigue Facial', desc: 'For travellers and high-stress clients. Brightens and de-puffs.', price: 'From 280 AED' },
      { name: 'Acne / Problem Skin', desc: 'Targeted treatment with consultation.', price: 'Book consultation' },
      { name: 'Premium Anti-Ageing', desc: 'Top-tier protocol for visible firming and tone.', price: 'Ask for price' }
    ],
    ritual: [
      { name: 'Consultation', body: 'A short skin assessment and a brief about your routine.' },
      { name: 'Treatment', body: 'The protocol itself, performed in a quiet treatment room.' },
      { name: 'Routine', body: 'A simple home routine to extend the result until your next visit.' }
    ]
  },
  {
    slug: 'massage',
    name: 'Massage',
    num: '03 / 07',
    title: 'Massage',
    intro: 'Deep-tissue, relaxation and recovery rituals from trained spa therapists.',
    img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'Pressure, presence, and patience.',
    aboutBody: 'Our therapists are trained in classical Swedish, deep-tissue, sports-recovery and relaxation modalities. Sessions are private and quiet — no rushed turnover, no perfumed gimmicks. Pressure is calibrated to you, not to a script.',
    treatments: [
      { name: 'Swedish Relaxation', desc: 'Light-to-medium pressure full-body massage.', price: 'From 220 AED · 60 min' },
      { name: 'Deep Tissue', desc: 'Targeted release of chronic tension.', price: 'From 280 AED · 60 min' },
      { name: 'Sports Recovery', desc: 'Post-training muscle recovery.', price: 'From 280 AED · 60 min' },
      { name: 'Head, Neck & Shoulders', desc: 'Express tension relief — ideal between meetings.', price: 'From 150 AED · 30 min' },
      { name: 'Hot Stone', desc: 'Heated basalt stones for deep muscle warming.', price: 'From 320 AED · 75 min' },
      { name: 'Couples / Side-by-Side (VIP)', desc: 'Two therapists, one suite. By appointment.', price: 'Ask for price' }
    ],
    ritual: [
      { name: 'Brief', body: 'A short intake — pressure, focus areas, anything to avoid.' },
      { name: 'Session', body: 'The work itself, in a quiet room calibrated to you.' },
      { name: 'Recovery', body: 'Water, time, and notes for any home stretches we recommend.' }
    ]
  },
  {
    slug: 'moroccan-bath',
    name: 'Moroccan Bath',
    num: '04 / 07',
    title: 'Moroccan Bath',
    intro: 'A heritage hammam ritual — exfoliation, steam and renewal.',
    img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'A heritage ritual,<br/>done properly.',
    aboutBody: 'The Moroccan bath is one of the oldest grooming rituals in the region. We perform it the way it should be performed — black soap, steam, kessa exfoliation, mask, and finish with argan oil. No shortcuts. Available at our spa-led houses (Baniyas Spa, VIP Muroor).',
    treatments: [
      { name: 'Moroccan Bath', desc: 'Steam, black soap, full-body kessa exfoliation, hydrating mask.', price: 'From 130 AED' },
      { name: 'Private Moroccan Bath', desc: 'The full Moroccan ritual in a private treatment suite.', price: 'From 180 AED' },
      { name: 'Royal Moroccan Bath', desc: 'The complete ritual with argan oil treatment and head massage.', price: 'From 300 AED' }
    ],
    ritual: [
      { name: 'Steam', body: '12–15 minutes in our hammam to open the pores.' },
      { name: 'Cleanse & Exfoliate', body: 'Black soap and kessa glove — the heart of the ritual.' },
      { name: 'Renew', body: 'Hydrating mask and argan oil finish — skin reset.' }
    ]
  },
  {
    slug: 'manicure-pedicure',
    name: 'Manicure & Pedicure',
    num: '05 / 07',
    title: 'Manicure & Pedicure',
    intro: 'Refined hand and foot care, executed with surgical-grade precision.',
    img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'Hand and foot care,<br/>handled correctly.',
    aboutBody: 'Manicure and pedicure rooms at Kanaan are held to the same hygiene standard as the rest of the house — disposable single-use tools, sealed packs, and no shortcuts. The work is calm, precise, and brief enough to fit between meetings.',
    treatments: [
      { name: 'Gentleman\'s Manicure', desc: 'Trim, shape, cuticle care, buff.', price: 'From 70 AED' },
      { name: 'Gentleman\'s Pedicure', desc: 'Soak, trim, shape, callus care, hydration.', price: 'From 100 AED' },
      { name: 'Combined Mani + Pedi', desc: 'Both, in one visit.', price: 'From 150 AED' },
      { name: 'Premium Pedicure', desc: 'Pedicure with intensive callus treatment and foot massage.', price: 'From 160 AED' },
      { name: 'Ingrown Nail Care', desc: 'Specialist attention. Consultation first.', price: 'Book consultation' }
    ],
    ritual: [
      { name: 'Soak', body: 'Warm soak with mineral salts to soften the skin.' },
      { name: 'Care', body: 'Trim, shape, cuticle and callus work with sterilised tools.' },
      { name: 'Finish', body: 'Hydrating cream, brief massage, and a clean finish.' }
    ]
  },
  {
    slug: 'hair-treatment',
    name: 'Hair Treatment',
    num: '06 / 07',
    title: 'Hair Treatment',
    intro: 'Restorative protein, keratin and scalp therapies for healthier hair.',
    img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'Hair, restored.',
    aboutBody: 'Our hair treatment menu addresses the issues most men face but rarely discuss — dryness, breakage, thinning at the temples, scalp irritation. We use professional product lines and our therapists will tell you honestly what the right treatment for you is — and what isn\'t worth doing.',
    treatments: [
      { name: 'Protein Treatment', desc: 'Restorative protein for damaged or coloured hair.', price: 'From 180 AED' },
      { name: 'Keratin Smoothing', desc: 'Long-lasting smoothing protocol.', price: 'From 600 AED' },
      { name: 'Scalp Therapy', desc: 'Cleanse, exfoliate, and stimulate scalp.', price: 'From 220 AED' },
      { name: 'Hair Loss Consultation', desc: 'Honest assessment and product recommendations.', price: 'Book consultation' },
      { name: 'Premium Botox Hair', desc: 'Top-tier hair revitalisation.', price: 'Ask for price' },
      { name: 'Colour & Grey Cover', desc: 'Discreet grey blending or full colour.', price: 'Book consultation' }
    ],
    ritual: [
      { name: 'Diagnosis', body: 'A short hair and scalp assessment.' },
      { name: 'Treatment', body: 'The protocol itself — never longer than it needs to be.' },
      { name: 'Maintenance', body: 'Brief on what to use at home and when to come back.' }
    ]
  },
  {
    slug: 'grooming-packages',
    name: 'Grooming Packages',
    num: '07 / 07',
    title: 'Grooming Packages',
    intro: 'Curated multi-service rituals for a complete reset — best value, best experience.',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=75',
    aboutHeading: 'A complete reset.',
    aboutBody: 'Our grooming packages combine the most-requested services into a single, refined visit — best for clients who want to address everything in one session, or who simply want the most efficient route to looking their best for an event, a meeting, or a long flight.',
    treatments: [
      { name: '8-Service Signature Package', desc: 'Haircut, beard sculpt, hair wash & treatment, express facial, head massage, mani, pedi.', price: '250 AED' },
      { name: '6-Service Essential Package', desc: 'Haircut, beard trim, hair wash, express facial, hand & foot care.', price: '100 AED' },
      { name: 'Eid Premium Package', desc: 'Cut, beard sculpt, Moroccan bath, premium facial, mani, pedi. Limited time.', price: '320 AED' },
      { name: 'VIP Gentleman\'s Hour', desc: 'Private suite, master barber cut, hot-towel shave, signature facial, refreshments.', price: '450 AED' },
      { name: 'Father & Son Ritual', desc: 'Two haircuts, two beard trims (or kids style), wash, refreshments.', price: '220 AED' },
      { name: 'Custom Package', desc: 'Build your own — speak to us.', price: 'Ask for price' }
    ],
    ritual: [
      { name: 'Choose', body: 'Pick a package — or ask us to curate one for you.' },
      { name: 'Reserve', body: 'Book online or via WhatsApp; we sequence the services.' },
      { name: 'Reset', body: 'A single, well-paced visit — everything done, nothing rushed.' }
    ]
  }
];

// FAQ blocks per service — drives both visible accordion AND FAQPage schema.
const FAQS = {
  'hair-beard': [
    { q: 'How long does a haircut at Kanaan take?', a: 'A signature haircut takes around 45 minutes including consultation, cut, wash, and finish. A quick neck-tidy is 15 minutes; a full hot-towel shave with cut is 75 minutes.' },
    { q: 'Do I need an appointment or can I walk in?', a: 'Walk-ins are welcome where availability allows, but for guaranteed seating with your preferred barber we recommend booking online or via WhatsApp.' },
    { q: 'What does a beard sculpt include?', a: 'Our beard sculpt includes detail trimming, shape definition, line work along the cheek and neck, and a conditioning finish. It typically takes 30–40 minutes.' },
    { q: 'Do you do hair colour for grey coverage?', a: 'Yes — both discreet grey blending and full coverage. We always start with a brief consultation to choose the right tone for your skin and existing colour.' },
    { q: 'How often should I get a haircut?', a: 'For most styles, every 3–5 weeks keeps the shape clean. Beards typically need a sculpt every 3–4 weeks, longer styles can stretch to 6 weeks.' }
  ],
  'facial-skin-care': [
    { q: 'Which facial is right for me?', a: 'For a general reset, choose the Signature Facial. For dehydration choose Hydra. For travel fatigue or screen exhaustion, choose Anti-Fatigue. If you have active breakouts, book the Acne Consultation first.' },
    { q: 'How often should I have a facial?', a: 'For most men, once every 4–6 weeks is the sweet spot. More frequent than that adds little benefit. Less than once a quarter and the maintenance value fades.' },
    { q: 'Will a facial help with razor irritation?', a: 'Yes. Our facials clean and calm the skin under the beard, which is where most razor-irritation issues actually originate. Combine with a hot-towel shave for best results.' },
    { q: 'Is there downtime after a facial?', a: 'No downtime for the Express, Signature, or Anti-Fatigue. The Hydra Facial may leave skin slightly pink for an hour. Avoid direct sun and shaving for 12 hours after any facial.' },
    { q: 'Do you use professional products?', a: 'Yes — we use professional-only product lines (Dermalogica family-grade and similar). No private-label substitutes.' }
  ],
  'massage': [
    { q: 'What pressure should I choose?', a: 'Swedish for relaxation, Deep Tissue for chronic tension, Sports Recovery for post-training. If unsure, start with Swedish — your therapist can adjust pressure throughout the session.' },
    { q: 'How long is a typical session?', a: '60 minutes is the standard. We also offer 30-min express (head/neck/shoulders only) and 75-min hot-stone sessions.' },
    { q: 'Do I need to undress completely?', a: 'You undress to your comfort level. Disposable underwear is provided, and you remain professionally draped throughout — only the area being worked on is exposed at any time.' },
    { q: 'Will deep tissue hurt?', a: 'Deep tissue should feel intense but not painful. We work to your tolerance and check in frequently. If it ever feels too much, just say so — we adjust immediately.' },
    { q: 'How soon after a workout should I book?', a: 'For sports recovery, 1–24 hours after training is the sweet spot. For relaxation, any time works. Avoid massage immediately after eating a heavy meal.' }
  ],
  'moroccan-bath': [
    { q: 'What is a Moroccan bath?', a: 'A traditional hammam ritual: 12–15 minutes of steam to open the pores, then black-soap cleanse, kessa-glove exfoliation, hydrating mask, and an argan-oil finish. The full ritual takes about 60 minutes.' },
    { q: 'How often should I do it?', a: 'Every 4–6 weeks aligns with your skin\'s natural cell turnover. More often than that doesn\'t add benefit; less than once a quarter and you start to notice the difference.' },
    { q: 'Is the kessa exfoliation painful?', a: 'No — brisk and firm, but not painful. The steam and black soap soften the skin first so the exfoliation removes only dead skin cells.' },
    { q: 'Where can I get a Moroccan bath?', a: 'At our spa-led houses: Baniyas Spa and VIP Muroor. Other branches don\'t have hammam suites.' },
    { q: 'Should I shave before or after?', a: 'After — wait at least 12 hours. Skin is sensitive immediately after the kessa, and shaving will irritate.' }
  ],
  'manicure-pedicure': [
    { q: 'Are tools sterilised between guests?', a: 'Yes — we use single-use disposables for cuticle and skin work, and steam-sterilise reusable tools between every guest. All packs are opened in front of you.' },
    { q: 'How long does a manicure take?', a: 'A gentleman\'s manicure is 30 minutes; pedicure is 45 minutes. Combined mani+pedi is 60–75 minutes.' },
    { q: 'Can you treat ingrown nails?', a: 'Yes, but it requires a brief consultation first. For severe cases we may refer you to a podiatrist.' },
    { q: 'Do you do gel polish for men?', a: 'Yes if requested, though most of our male clients prefer buff-finish nails. We recommend matte clear if you want a polished look without colour.' }
  ],
  'hair-treatment': [
    { q: 'Will keratin damage my hair?', a: 'Done correctly with professional formulas, no — it deposits protein into the hair shaft. We use formaldehyde-free formulations and the result lasts 3–4 months.' },
    { q: 'How do I know if I need a protein treatment?', a: 'Signs include: hair feeling rough, breaking easily, looking dull, or losing elasticity (stretches without bouncing back). Book a consultation if unsure.' },
    { q: 'Can I treat hair loss at Kanaan?', a: 'We offer scalp therapy and a hair-loss consultation. We will tell you honestly what we can and can\'t address — and refer to a trichologist if appropriate.' },
    { q: 'How long does a hair treatment take?', a: 'Protein treatment: 60 minutes. Keratin smoothing: 2–3 hours. Scalp therapy: 45 minutes. Hair loss consultation: 30 minutes.' }
  ],
  'grooming-packages': [
    { q: 'Do I have to do all services in one visit?', a: 'Yes — packages are designed as a single curated visit. If you prefer to spread services across visits, book each individually instead.' },
    { q: 'Can I customise a package?', a: 'Yes — speak to us via WhatsApp and we will build a custom package around what you actually need. Common requests include swapping a service or adding a Moroccan bath.' },
    { q: 'Are package prices final?', a: 'Yes — the package price is what you pay. No surprise add-ons. If you request something not in the package, we tell you the additional price before doing it.' },
    { q: 'Which package is the best value?', a: 'The 8-Service Signature Package at 250 AED is the highest value. The 6-Service Essential at 100 AED is the most affordable entry point.' }
  ]
};

// Pulled from content/branches.json so we link service → real branch IDs
function loadBranches() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'branches.json'), 'utf8')).branches; }
  catch (_) { return []; }
}
const ALL_BRANCHES = loadBranches();
function branchesForService(serviceSlug) {
  // Moroccan bath only at spa-led houses; everything else everywhere.
  if (serviceSlug === 'moroccan-bath') return ALL_BRANCHES.filter(b => b.type === 'Spa' || b.type === 'VIP');
  return ALL_BRANCHES.filter(b => b.active !== false);
}

const tpl = (s) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${s.name} | Kanaan Gents Salon &amp; Spa Abu Dhabi</title>
  <meta name="description" content="${s.intro} Available at Kanaan houses across Abu Dhabi and Al Ain." />
  <link rel="canonical" href="/services/${s.slug}.html" />
  <link rel="alternate" hreflang="en" href="/services/${s.slug}.html" />
  <link rel="alternate" hreflang="ar" href="/ar/services/${s.slug}.html" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/css/style.css" />
  <script src="../assets/js/tracking.js" defer></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "${s.name}",
    "description": "${s.intro.replace(/"/g, '\\"')}",
    "provider": {
      "@type": "Organization",
      "name": "Kanaan Gents Salon & Spa",
      "url": "https://kanaanspa.ae/"
    },
    "areaServed": [${branchesForService(s.slug).map(b => `{"@type":"Place","name":"Kanaan ${b.name_en}","address":{"@type":"PostalAddress","streetAddress":"${b.address_en}","addressCountry":"AE"}}`).join(',')}],
    "serviceType": "${s.name}",
    "url": "https://kanaanspa.ae/services/${s.slug}.html"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [${(FAQS[s.slug] || []).map(f => `{"@type":"Question","name":${JSON.stringify(f.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.a)}}}`).join(',')}]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Home","item":"https://kanaanspa.ae/"},
      {"@type":"ListItem","position":2,"name":"Services","item":"https://kanaanspa.ae/services.html"},
      {"@type":"ListItem","position":3,"name":"${s.name}","item":"https://kanaanspa.ae/services/${s.slug}.html"}
    ]
  }
  </script>
</head>
<body>

  <header class="site-header">
    <div class="site-header__inner">
      <a href="../index.html" class="logo">KANAAN<span>.</span></a>
      <nav class="main-nav">
        <a href="../index.html">Home</a>
        <a href="../about.html">About</a>
        <a href="../services.html" class="is-active">Services</a>
        <a href="../offers.html">Offers</a>
        <a href="../branches.html">Branches</a>
        <a href="../gallery.html">Gallery</a>
        <a href="../contact.html">Contact</a>
      </nav>
      <div class="header-actions">
        <a href="../ar/index.html" class="lang-switch">عربي</a>
        <a href="../book.html?service=${s.slug}" class="btn btn--sm">Book Now</a>
        <button class="menu-toggle" aria-label="Open menu"><span></span><span></span><span></span></button>
      </div>
    </div>
    <nav class="mobile-nav">
      <a href="../index.html">Home</a><a href="../about.html">About</a><a href="../services.html">Services</a>
      <a href="../offers.html">Offers</a><a href="../branches.html">Branches</a><a href="../gallery.html">Gallery</a>
      <a href="../contact.html">Contact</a><a href="../ar/index.html">عربي</a>
      <a href="../book.html?service=${s.slug}" class="btn">Book Now</a>
    </nav>
  </header>

  <section class="page-hero">
    <div class="page-hero__media"><img src="${s.img}" alt="" /></div>
    <div class="container page-hero__content">
      <div class="breadcrumb">
        <a href="../index.html">Home</a><span class="sep">/</span>
        <a href="../services.html">Services</a><span class="sep">/</span>
        <span>${s.name}</span>
      </div>
      <span class="eyebrow">Category ${s.num}</span>
      <h1 class="page-hero__title">${s.title}</h1>
      <p class="lede" style="color: var(--c-pearl); margin-top: var(--s-4);">${s.intro}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="split">
        <div>
          <span class="eyebrow">About this category</span>
          <h2 class="display-2">${s.aboutHeading}</h2>
          <div class="divider"></div>
          <p class="muted">${s.aboutBody}</p>
        </div>
        <div class="split__media"><img src="${s.splitImg}" alt="" /></div>
      </div>
    </div>
  </section>

  <section class="section section--light">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Treatments</span>
        <h2 class="section-head__title display-2">In this category.</h2>
      </div>
      <div style="border-top: 1px solid var(--hairline);">
        ${s.treatments.map(t => `
        <div style="display:grid; grid-template-columns: 1.5fr 2fr 1fr auto; gap: var(--s-5); padding: var(--s-5) 0; border-bottom: 1px solid var(--hairline); align-items:center;">
          <h3 style="font-size: 22px;">${t.name}</h3>
          <p class="muted" style="margin:0;">${t.desc}</p>
          <span class="text-gold" style="font-family: var(--f-display); font-size: 22px;">${t.price}</span>
          <a href="${t.price.toLowerCase().includes('ask') || t.price.toLowerCase().includes('consultation') ? 'https://wa.me/971505556795' : `../book.html?service=${s.slug}`}" class="btn btn--sm">${t.price.toLowerCase().includes('ask') || t.price.toLowerCase().includes('consultation') ? 'Enquire' : 'Book'}</a>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">The Ritual</span>
        <h2 class="section-head__title display-2">Three steps, every time.</h2>
      </div>
      <div class="grid grid-3">
        ${s.ritual.map((r, i) => `
        <div>
          <span class="eyebrow">Step 0${i + 1}</span>
          <h3 style="font-size: 28px; margin-top:var(--s-3);">${r.name}</h3>
          <p class="muted">${r.body}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section section--light">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">Available At</span>
        <h2 class="section-head__title display-2">${s.slug === 'moroccan-bath' ? 'Our spa-led houses.' : 'All Kanaan houses.'}</h2>
        <p class="section-head__lede">${branchesForService(s.slug).length} branches offer ${s.name.toLowerCase()}.</p>
      </div>
      <div class="flex gap-3" style="flex-wrap: wrap;">
        ${branchesForService(s.slug).map(b => `<a href="../branches/${b.id}.html" class="btn btn--ghost btn--sm">${b.name_en}</a>`).join('\n        ')}
      </div>
    </div>
  </section>

  ${s.slug === 'facial-skin-care' ? `
  <!-- COMPARISON TABLE — high-intent SEO -->
  <section class="section">
    <div class="container" style="max-width: 1000px;">
      <div class="section-head section-head--left">
        <span class="eyebrow">Compare</span>
        <h2 class="section-head__title display-2">Which facial is right for you?</h2>
      </div>
      <div style="overflow-x: auto;">
        <table class="compare-table">
          <thead>
            <tr><th>Facial</th><th>Time</th><th>Price</th><th>Best for</th><th>Skip if</th></tr>
          </thead>
          <tbody>
            <tr><td>Express</td><td>30 min</td><td>From 120 AED</td><td>Quick reset before an event</td><td>Active breakouts</td></tr>
            <tr><td>Signature</td><td>60 min</td><td>From 250 AED</td><td>First facial in months / general reset</td><td>You specifically need hydration</td></tr>
            <tr><td>Hydra Facial</td><td>60 min</td><td>From 380 AED</td><td>Dehydration / dull skin</td><td>Active rosacea or post-procedure</td></tr>
            <tr><td>Anti-Fatigue</td><td>60 min</td><td>From 280 AED</td><td>Travellers / chronic dark circles</td><td>No specific fatigue concerns</td></tr>
            <tr><td>Premium Anti-Ageing</td><td>75 min</td><td>Ask</td><td>Specific event / visible fine lines</td><td>First-ever facial</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>` : ''}

  <!-- FAQ — surfaces direct answers for AEO + LLM extraction -->
  <section class="section">
    <div class="container" style="max-width: 880px;">
      <div class="section-head section-head--left">
        <span class="eyebrow">Frequently Asked</span>
        <h2 class="section-head__title display-2">Common questions.</h2>
      </div>
      <div class="faq">
        ${(FAQS[s.slug] || []).map((f, i) => `
        <details class="faq__item"${i === 0 ? ' open' : ''}>
          <summary class="faq__q">${f.q}</summary>
          <p class="faq__a">${f.a}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>

  <section class="cta-band">
    <h2 class="cta-band__title">Book your chair.</h2>
    <p class="cta-band__sub">Choose your branch and time — confirmation in minutes.</p>
    <a href="../book.html?service=${s.slug}" class="btn btn--lg" data-track="book_now_click">Book Now</a>
  </section>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">KANAAN<span>.</span></div>
          <p style="margin-top: var(--s-4);">Ten houses across Abu Dhabi. One uncompromising standard.</p>
          <div class="footer-socials"><a href="#">IG</a><a href="#">TT</a><a href="#">WA</a></div>
        </div>
        <div><h5>Visit</h5><ul><li><a href="../services.html">Services</a></li><li><a href="../offers.html">Offers</a></li><li><a href="../gallery.html">Gallery</a></li><li><a href="../about.html">About</a></li><li><a href="../contact.html">Contact</a></li></ul></div>
        <div><h5>Branches</h5><ul><li><a href="../branches/al-ain.html">Al Ain</a></li><li><a href="../branches/khalifa-city.html">Khalifa City</a></li><li><a href="../branches/khalidiya.html">Khalidiya</a></li><li><a href="../branches/baniyas-spa.html">Baniyas Spa</a></li><li><a href="../branches/baniyas-barber.html">Baniyas Barber</a></li></ul></div>
        <div><h5>&nbsp;</h5><ul><li><a href="../branches/rabdan.html">Rabdan</a></li><li><a href="../branches/old-shahamah.html">Old Shahamah</a></li><li><a href="../branches/new-shahamah.html">New Shahamah</a></li><li><a href="../branches/muroor.html">Muroor</a></li><li><a href="../branches/vip-muroor.html">VIP Muroor</a></li></ul></div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Kanaan Gents Salon &amp; Spa.</span>
        <div class="footer-bottom__links"><a href="../privacy-policy.html">Privacy</a><a href="../terms.html">Terms</a><a href="../ar/index.html">عربي</a></div>
      </div>
    </div>
  </footer>

  <div class="mobile-cta">
    <a href="../book.html?service=${s.slug}" class="mobile-cta__book">Book Now</a>
    <a href="https://wa.me/971505556795" aria-label="WhatsApp"><span class="mobile-cta__icon">✉</span></a>
    <a href="tel:+971505556795" aria-label="Call"><span class="mobile-cta__icon">☏</span></a>
  </div>

  <script src="../assets/js/data.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
`;

const outDir = path.join(__dirname, 'services');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
services.forEach(s => {
  const filePath = path.join(outDir, `${s.slug}.html`);
  fs.writeFileSync(filePath, tpl(s));
  console.log('wrote', filePath);
});
console.log(`\nGenerated ${services.length} service detail pages.`);
