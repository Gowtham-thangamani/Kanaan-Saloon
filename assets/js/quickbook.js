/* Kanaan — Sticky Quick-Book widget.
   Floating bottom-right pill that expands into a 3-field form:
   branch · service · time → opens WhatsApp with full pre-filled message.
   No backend needed. */
(function () {
  'use strict';
  if (sessionStorage.getItem('kanaan_qb_dismissed') === '1') return;
  // Skip on admin / thank-you / lp pages where it'd compete with primary CTAs
  if (/(\/admin\/|thank-you|\/lp\/)/.test(location.pathname)) return;

  var isAr = document.documentElement.lang === 'ar';
  var L = isAr ? {
    pill: 'احجز الآن', title: 'احجز في 30 ثانية', sub: 'اختر الفرع والخدمة — نتواصل معك على واتساب.',
    branch: 'الفرع', service: 'الخدمة', time: 'الوقت المفضل', cta: 'افتح واتساب', close: 'إغلاق',
    services: ['شعر ولحية','عناية بالبشرة','مساج','حمام مغربي','أظافر','علاجات الشعر','باقات']
  } : {
    pill: 'Quick Book', title: 'Book in 30 seconds', sub: 'Pick branch + service — we confirm on WhatsApp.',
    branch: 'Branch', service: 'Service', time: 'Preferred time', cta: 'Open WhatsApp', close: 'Close',
    services: ['Hair & Beard','Facial & Skin','Massage','Moroccan Bath','Manicure & Pedicure','Hair Treatment','Grooming Package']
  };

  var WA = '971505556795'; // central WhatsApp

  var root = document.createElement('div');
  root.className = 'qb-widget';
  root.innerHTML =
    '<button class="qb-pill" type="button" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' +
        '<path d="M20.52 3.48A11.86 11.86 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.18 1.6 6.01L0 24l6.16-1.61A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.45l-.38-.22-3.66.96.98-3.57-.25-.37A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/>' +
      '</svg>' +
      '<span>' + L.pill + '</span>' +
    '</button>' +
    '<div class="qb-panel" role="dialog" aria-label="' + L.title + '">' +
      '<button class="qb-close" type="button" aria-label="' + L.close + '">×</button>' +
      '<h4 class="qb-panel__title">' + L.title + '</h4>' +
      '<p class="qb-panel__sub">' + L.sub + '</p>' +
      '<form class="qb-form">' +
        '<label>' + L.branch + '<select name="branch" required></select></label>' +
        '<label>' + L.service + '<select name="service" required>' +
          '<option value="">—</option>' +
          L.services.map(function (s) { return '<option>' + s + '</option>'; }).join('') +
        '</select></label>' +
        '<label>' + L.time + '<input type="text" name="time" placeholder="e.g. Sat 7pm" /></label>' +
        '<button type="submit" class="qb-cta">' + L.cta + ' →</button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(root);

  var pill = root.querySelector('.qb-pill');
  var panel = root.querySelector('.qb-panel');
  var closeBtn = root.querySelector('.qb-close');
  var form = root.querySelector('.qb-form');
  var branchSelect = root.querySelector('select[name="branch"]');

  // Populate branches from runtime data once it's ready, or fall back to a static list
  function populateBranches(branches) {
    branchSelect.innerHTML = '<option value="">—</option>' + branches.map(function (b) {
      var name = isAr ? (b.name_ar || b.name_en) : b.name_en;
      return '<option>' + name + '</option>';
    }).join('');
  }
  document.addEventListener('kanaan:data-ready', function (e) {
    if (e.detail && e.detail.branches) populateBranches(e.detail.branches);
  });
  // Fallback static list
  populateBranches([
    { name_en: 'Al Ain', name_ar: 'العين' },
    { name_en: 'Khalifa City', name_ar: 'مدينة خليفة' },
    { name_en: 'Khalidiya', name_ar: 'الخالدية' },
    { name_en: 'Baniyas Spa', name_ar: 'بنياس سبا' },
    { name_en: 'Baniyas Barber', name_ar: 'بنياس باربر' },
    { name_en: 'Rabdan', name_ar: 'ربدان' },
    { name_en: 'Old Shahamah', name_ar: 'الشهامة القديمة' },
    { name_en: 'New Shahamah', name_ar: 'الشهامة الجديدة' },
    { name_en: 'Muroor', name_ar: 'المرور' },
    { name_en: 'VIP Muroor', name_ar: 'VIP المرور' }
  ]);

  function open() { root.classList.add('is-open'); pill.setAttribute('aria-expanded', 'true'); }
  function close() { root.classList.remove('is-open'); pill.setAttribute('aria-expanded', 'false'); }

  pill.addEventListener('click', function () { root.classList.contains('is-open') ? close() : open(); });
  closeBtn.addEventListener('click', function () { close(); sessionStorage.setItem('kanaan_qb_dismissed', '1'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var msg = (isAr
      ? 'مرحباً كنعان، أرغب في الحجز:\nالفرع: ' + fd.get('branch') + '\nالخدمة: ' + fd.get('service') + (fd.get('time') ? '\nالوقت المفضل: ' + fd.get('time') : '') + '\nشكراً.'
      : 'Hi Kanaan, I\'d like to book:\nBranch: ' + fd.get('branch') + '\nService: ' + fd.get('service') + (fd.get('time') ? '\nPreferred time: ' + fd.get('time') : '') + '\nThank you.'
    );
    var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
    if (window.gtag) window.gtag('event', 'quickbook_submit', { branch: fd.get('branch'), service: fd.get('service') });
    window.open(url, '_blank', 'noopener');
    close();
  });
})();
