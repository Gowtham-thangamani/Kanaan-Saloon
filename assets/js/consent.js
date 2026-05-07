/* Kanaan — cookie consent banner (UAE PDPL / EU GDPR friendly).
   Shown until user accepts or rejects marketing cookies.
   On accept: stores consent + reloads tracking pixels.
   On reject: stores reject + leaves analytics-only loaded via GTM consent mode. */
(function () {
  'use strict';

  function read() {
    try {
      var c = document.cookie.match(/(?:^|; )kanaan_consent=([^;]*)/);
      return c ? JSON.parse(decodeURIComponent(c[1])) : null;
    } catch (e) { return null; }
  }
  function write(v) {
    var d = new Date(); d.setMonth(d.getMonth() + 12);
    document.cookie = 'kanaan_consent=' + encodeURIComponent(JSON.stringify(v)) + ';expires=' + d.toUTCString() + ';path=/;samesite=lax';
  }

  var existing = read();
  if (existing !== null) return; // user already chose

  var isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');

  var html = isAr ? `
    <div class="cc__inner">
      <div class="cc__copy">
        <strong>الخصوصية والكوكيز.</strong>
        <span>نستخدم كوكيز أساسية لتشغيل الموقع، وكوكيز تحليلية وتسويقية لقياس أداء حملاتنا. اقبل لتفعيل التتبع التسويقي، أو اكتفِ بالأساسي.</span>
      </div>
      <div class="cc__actions">
        <button class="btn btn--ghost btn--sm" data-cc="reject">الأساسي فقط</button>
        <button class="btn btn--sm" data-cc="accept">قبول الكل</button>
      </div>
    </div>` : `
    <div class="cc__inner">
      <div class="cc__copy">
        <strong>Privacy &amp; cookies.</strong>
        <span>We use essential cookies to run the site, and analytics + marketing cookies to measure our campaigns. Accept to enable marketing tracking, or essential only.</span>
      </div>
      <div class="cc__actions">
        <button class="btn btn--ghost btn--sm" data-cc="reject">Essential only</button>
        <button class="btn btn--sm" data-cc="accept">Accept all</button>
      </div>
    </div>`;

  var el = document.createElement('div');
  el.className = 'cookie-consent';
  el.innerHTML = html;
  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('is-shown'); });

  el.querySelector('[data-cc="accept"]').addEventListener('click', function () {
    write({ marketing: true, analytics: true, _ts: Date.now() });
    if (window.gtag) gtag('consent', 'update', {
      ad_storage: 'granted', analytics_storage: 'granted',
      ad_user_data: 'granted', ad_personalization: 'granted'
    });
    el.classList.remove('is-shown');
    setTimeout(function () { el.remove(); }, 400);
    // Reload tracking pixels now that consent is granted
    var s = document.createElement('script'); s.src = (location.pathname.split('/').length > 2 ? '../' : '') + 'assets/js/tracking.js'; document.head.appendChild(s);
  });
  el.querySelector('[data-cc="reject"]').addEventListener('click', function () {
    write({ marketing: false, analytics: false, _ts: Date.now() });
    el.classList.remove('is-shown');
    setTimeout(function () { el.remove(); }, 400);
  });
})();
