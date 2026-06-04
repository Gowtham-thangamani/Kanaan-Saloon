// Generates 10 Arabic branch detail pages from content/branches.json
const fs = require('fs');
const path = require('path');

// Convert "HH:MM-HH:MM" range using ASCII digits into Arabic Indic digits with en-dash.
function toArHours(range, fallback) {
  const v = range || fallback;
  const arDigits = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' };
  return v.replace(/[0-9]/g, d => arDigits[d]).replace('-', '–');
}

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'branches.json'), 'utf8'));
const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'prices.json'), 'utf8'));

// Render the visible "Rates & Service Details" section in Arabic.
function pricesHtmlAr(branchId) {
  const p = prices.branches[branchId];
  if (!p) return '';
  const cats = p.categories.map(cat => {
    if (cat.columns && cat.columns.length) {
      const heads = cat.columns.map(c => `<th style="text-align:left; padding:10px 12px; font-size:13px; letter-spacing:.05em; color:var(--c-stone); font-weight:500;">${c.label_ar}</th>`).join('');
      const rows = cat.items.map(it => {
        const cells = cat.columns.map(c => {
          const v = it.prices && it.prices[c.key];
          return `<td style="text-align:left; padding:10px 12px; font-variant-numeric: tabular-nums; font-weight:500;">${v != null ? v : '—'}</td>`;
        }).join('');
        return `<tr style="border-bottom:1px solid var(--hairline);"><td style="padding:10px 12px;">${it.name_ar}</td>${cells}</tr>`;
      }).join('');
      return `
      <div class="rate-card" style="margin-top: var(--s-6);">
        <h3 style="font-size:20px; margin:0 0 var(--s-3); padding-bottom:var(--s-2); border-bottom:1px solid var(--c-gold); display:inline-block;">${cat.name_ar}</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead><tr style="background:rgba(200,160,74,0.06);"><th style="text-align:right; padding:10px 12px; font-size:13px; letter-spacing:.05em; color:var(--c-stone); font-weight:500;">الخدمة</th>${heads}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    }
    const rows = cat.items.map(it =>
      `<tr style="border-bottom:1px solid var(--hairline);"><td style="padding:10px 12px;">${it.name_ar}</td><td style="text-align:left; padding:10px 12px; font-variant-numeric: tabular-nums; font-weight:600; color:var(--c-gold);">${it.price} <span style="font-size:11px; color:var(--c-stone); font-weight:400;">د.إ</span></td></tr>`
    ).join('');
    return `
      <div class="rate-card" style="margin-top: var(--s-6);">
        <h3 style="font-size:20px; margin:0 0 var(--s-3); padding-bottom:var(--s-2); border-bottom:1px solid var(--c-gold); display:inline-block;">${cat.name_ar}</h3>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
  return `
  <section class="section section--light" id="rates">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">الأسعار وتفاصيل الخدمة</span>
        <h2 class="section-head__title display-2">قائمة الأسعار.</h2>
        <p class="section-head__lede">جميع الأسعار بالدرهم الإماراتي. شاملة الضريبة.</p>
      </div>
      ${cats}
      <p class="muted" style="margin-top: var(--s-5); font-size:13px;">${prices.footer_note_ar}</p>
    </div>
  </section>`;
}

const branchTypeAr = { Spa: 'بيت السبا', Barber: 'صالون حلاقة محترف', VIP: 'بيت VIP · بحجز مسبق', Standard: 'بيت كنعان' };
const branchTypeBlurbAr = {
  VIP: 'في VIP المرور، كل موعد في جناح خاص — الخصوصية هي القاعدة.',
  Spa: 'بيوت السبا تشمل غرف بخار، أجنحة حمّام مغربي، وقائمة العناية الكاملة تحت سقف واحد.',
  Barber: 'حلاقة كلاسيكية على يد محترفين — بدقّة وبدون عجلة.',
  Standard: 'ستجد قائمة كنعان الكاملة من الخدمات في هذا البيت.'
};

const tpl = (b) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>كنعان ${b.name_ar} | صالون وسبا للرجال في ${b.area_ar}</title>
  <meta name="description" content="كنعان ${b.name_ar} — بيت من بيوت كنعان في ${b.area_ar}. العنوان: ${b.address_ar}. احجز إلكترونياً أو عبر واتساب." />
  <link rel="canonical" href="/ar/branches/${b.id}.html" />
  <link rel="alternate" hreflang="en" href="/branches/${b.id}.html" />
  <link rel="alternate" hreflang="ar" href="/ar/branches/${b.id}.html" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/css/style.css" />
</head>
<body class="lang-ar">

  <header class="site-header">
    <div class="site-header__inner">
      <a href="../index.html" class="logo">KANAAN<span>.</span></a>
      <nav class="main-nav">
        <a href="../index.html">الرئيسية</a>
        <a href="../about.html">عن كنعان</a>
        <a href="../services.html">الخدمات</a>
        <a href="../offers.html">العروض</a>
        <a href="../branches.html" class="is-active">الفروع</a>
        <a href="../gallery.html">المعرض</a>
        <a href="../contact.html">تواصل</a>
      </nav>
      <div class="header-actions">
        <a href="../../branches/${b.id}.html" class="lang-switch">EN</a>
        <a href="../book.html?branch=${b.id}" class="btn btn--sm">احجز الآن</a>
        <button class="menu-toggle" aria-label="القائمة"><span></span><span></span><span></span></button>
      </div>
    </div>
    <nav class="mobile-nav">
      <a href="../index.html">الرئيسية</a><a href="../services.html">الخدمات</a>
      <a href="../offers.html">العروض</a><a href="../branches.html">الفروع</a>
      <a href="../contact.html">تواصل</a><a href="../../branches/${b.id}.html">EN</a>
      <a href="../book.html?branch=${b.id}" class="btn">احجز الآن</a>
    </nav>
  </header>

  <section class="page-hero" style="min-height: 70vh; display:flex; align-items:flex-end;">
    <div class="page-hero__media"><img src="${b.image}" alt="من داخل كنعان ${b.name_ar}" /></div>
    <div class="container page-hero__content">
      <div class="breadcrumb">
        <a href="../index.html">الرئيسية</a><span class="sep">/</span>
        <a href="../branches.html">الفروع</a><span class="sep">/</span>
        <span>${b.name_ar}</span>
      </div>
      <span class="eyebrow">${branchTypeAr[b.type] || branchTypeAr.Standard}</span>
      <h1 class="page-hero__title">كنعان ${b.name_ar}.</h1>
      <p class="lede" style="color: var(--c-pearl); margin-top: var(--s-4);">${b.area_ar}</p>
      <div class="hero__cta" style="margin-top: var(--s-5);">
        <a href="../book.html?branch=${b.id}" class="btn btn--lg" data-track="book_now_click">احجز في ${b.name_ar}</a>
        <a href="https://wa.me/${b.whatsapp}" class="btn btn--ghost btn--lg" data-track="whatsapp_click">واتساب</a>
      </div>
    </div>
  </section>

  <section class="section section--light section--tight">
    <div class="container">
      <div class="grid grid-4" style="gap: 1px; background: var(--hairline); border: 1px solid var(--hairline);">
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">العنوان</span>
          <p style="margin: 8px 0 0; font-size: 15px;">${b.address_ar}</p>
        </div>
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">المواعيد</span>
          <p style="margin: 8px 0 0; font-size: 13px; color: var(--muted);">السبت–الخميس ${toArHours(b.hours && b.hours.sat, '09:00-23:00')} · الجمعة ${toArHours(b.hours && b.hours.fri, '14:30-23:00')}</p>
        </div>
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">اتصل</span>
          <p style="margin: 8px 0 0; font-size: 15px;"><a href="tel:${b.phone}" data-track="call_click" style="color: var(--c-ink);">${b.phone}</a></p>
        </div>
        <div style="padding: var(--s-5); background: #fff;">
          <span class="eyebrow" style="color: var(--c-stone);">واتساب</span>
          <p style="margin: 8px 0 0; font-size: 15px;"><a href="https://wa.me/${b.whatsapp}" data-track="whatsapp_click" style="color: var(--c-ink);">+${b.whatsapp}</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="split">
        <div>
          <span class="eyebrow">عن هذا البيت</span>
          <h2 class="display-2">${b.type === 'VIP' ? 'بيت خاص بحجز مسبق.' : b.type === 'Spa' ? 'بيت سبا رئيسي.' : 'بيت كنعان في حيّك.'}</h2>
          <div class="divider"></div>
          <p class="muted">${branchTypeBlurbAr[b.type] || branchTypeBlurbAr.Standard}</p>
          <p class="muted">جميع بيوت كنعان تخضع لنفس البروتوكول — طاقم مدرّب، نظافة بمعايير السبا، ومنتجات احترافية.</p>
        </div>
        <div class="split__media"><img src="${b.image}" alt="من داخل كنعان ${b.name_ar}" /></div>
      </div>
    </div>
  </section>

  <section class="section section--light">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">متوفّر هنا</span>
        <h2 class="section-head__title display-2">الخدمات في هذا البيت.</h2>
      </div>
      <div class="flex gap-3" style="flex-wrap: wrap;">
        <a href="../../services/hair-beard.html" class="btn btn--ghost btn--sm">الشعر واللحية</a>
        <a href="../../services/facial-skin-care.html" class="btn btn--ghost btn--sm">العناية بالبشرة</a>
        <a href="../../services/massage.html" class="btn btn--ghost btn--sm">المساج</a>
        ${b.type === 'Spa' || b.type === 'VIP' ? '<a href="../../services/moroccan-bath.html" class="btn btn--ghost btn--sm">الحمّام المغربي</a>' : ''}
        <a href="../../services/manicure-pedicure.html" class="btn btn--ghost btn--sm">الأظافر</a>
        <a href="../../services/hair-treatment.html" class="btn btn--ghost btn--sm">علاجات الشعر</a>
        <a href="../../services/grooming-packages.html" class="btn btn--ghost btn--sm">باقات العناية</a>
      </div>

      <div class="branch-social">
        <span class="eyebrow" style="color: var(--c-stone);">تابع ${b.name_ar}</span>
        ${b.instagram ? `<a href="${b.instagram}" target="_blank" rel="noopener" data-track="instagram_click">📷 إنستغرام</a>` : ''}
        ${b.tiktok ? `<a href="${b.tiktok}" target="_blank" rel="noopener" data-track="tiktok_click">▶ تيك توك</a>` : ''}
        ${b.google_business && !b.google_business.startsWith('REPLACE') ? `<a href="${b.google_business}" target="_blank" rel="noopener" data-track="gbp_click">★ تقييمات Google</a>` : ''}
      </div>
    </div>
  </section>

  <!-- RATES & PRICING — from content/prices.json -->
  ${pricesHtmlAr(b.id)}

  <section class="section">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">اعثر علينا</span>
        <h2 class="section-head__title display-2">${b.area_ar}.</h2>
      </div>
      <div style="aspect-ratio: 21/9; border: 1px solid var(--hairline); overflow: hidden;">
        <iframe src="https://www.google.com/maps?q=${encodeURIComponent(b.maps_query || b.address_en || b.area_en || '')}&output=embed" width="100%" height="100%" style="border:0; filter: grayscale(0.4) contrast(1.05);" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="خريطة كنعان ${b.name_ar}"></iframe>
      </div>
    </div>
  </section>

  <section class="cta-band">
    <h2 class="cta-band__title">احجز في ${b.name_ar}.</h2>
    <p class="cta-band__sub">اختر الخدمة والوقت — التأكيد من فرع ${b.name_ar}.</p>
    <div class="hero__cta" style="justify-content: center; display: flex; gap: var(--s-4); flex-wrap: wrap;">
      <a href="../book.html?branch=${b.id}" class="btn btn--lg">احجز الآن</a>
      <a href="https://wa.me/${b.whatsapp}" class="btn btn--ghost btn--lg">واتساب الفرع</a>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <span>© ٢٠٢٦ كنعان صالون وسبا للرجال.</span>
        <div class="footer-bottom__links"><a href="../../privacy-policy.html">الخصوصية</a><a href="../../terms.html">الشروط</a><a href="../../branches/${b.id}.html">EN</a></div>
      </div>
    </div>
  </footer>

  <div class="mobile-cta">
    <a href="../book.html?branch=${b.id}" class="mobile-cta__book">احجز في ${b.name_ar}</a>
    <a href="https://wa.me/${b.whatsapp}" aria-label="واتساب"><span class="mobile-cta__icon">✉</span></a>
    <a href="tel:${b.phone}" aria-label="اتصال"><span class="mobile-cta__icon">☏</span></a>
  </div>

  <script src="../../assets/js/config.js"></script>
  <script src="../../assets/js/tracking.js"></script>
  <script src="../../assets/js/consent.js" defer></script>
  <script src="../../assets/js/main.js"></script>
</body>
</html>
`;

const outDir = path.join(__dirname, 'ar', 'branches');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
data.branches.forEach(b => {
  fs.writeFileSync(path.join(outDir, b.id + '.html'), tpl(b));
  console.log('wrote', 'ar/branches/' + b.id + '.html');
});
console.log(`\nGenerated ${data.branches.length} Arabic branch pages.`);
try { require('child_process').execSync('node "' + path.join(__dirname, 'patch-branches-dropdown.js') + '"', { stdio: 'inherit' }); } catch (e) { console.warn('dropdown patcher skipped:', e.message); }
try { require('child_process').execSync('node "' + path.join(__dirname, 'patch-motion.js') + '"', { stdio: 'inherit' }); } catch (e) { console.warn('motion patcher skipped:', e.message); }
