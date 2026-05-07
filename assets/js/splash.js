/* Kanaan splash screen — first-load brand reveal.
   Shows once per session (uses sessionStorage), respects ?nosplash=1 to skip. */
(function () {
  'use strict';
  // Skip if user has already seen it this session, or explicitly opted out, or in admin/thank-you/lp
  if (sessionStorage.getItem('kanaan_splash_seen')) return;
  if (location.search.includes('nosplash=1')) return;
  if (/(\/admin\/|thank-you|\/lp\/)/.test(location.pathname)) return;
  // Only on home pages and main entry points (not on every nav within the site)
  // Detection rule: only on pages that look like first-touch entry: /, /index.html, /ar/index.html
  var isHome = /(^\/$|\/index\.html$|\/ar\/$|\/ar\/index\.html$)/.test(location.pathname);
  if (!isHome) {
    sessionStorage.setItem('kanaan_splash_seen', '1'); // mark seen so internal nav doesn't trigger
    return;
  }

  var isAr = document.documentElement.lang === 'ar' || /lang-ar/.test(document.body.className);

  document.body.classList.add('splash-active');

  var splash = document.createElement('div');
  splash.className = 'splash';
  splash.setAttribute('aria-hidden', 'true');
  splash.innerHTML =
    '<h1 class="splash__brand">KANAAN<span>.</span></h1>' +
    '<div class="splash__rule"></div>' +
    '<p class="splash__tag' + (isAr ? ' splash__tag--ar' : '') + '">' +
      (isAr ? 'عشرة بيوت · معيار واحد · أبوظبي' : 'Ten Houses · One Standard · Abu Dhabi') +
    '</p>' +
    '<div class="splash__progress"></div>';
  document.body.appendChild(splash);

  function dismiss() {
    splash.classList.add('is-leaving');
    document.body.classList.remove('splash-active');
    sessionStorage.setItem('kanaan_splash_seen', '1');
    setTimeout(function () { splash.remove(); }, 800);
  }

  // Auto-dismiss after 2s; user can click anywhere to skip
  var timer = setTimeout(dismiss, 2000);
  splash.addEventListener('click', function () { clearTimeout(timer); dismiss(); });

  // Honour reduced-motion: dismiss almost immediately
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clearTimeout(timer);
    setTimeout(dismiss, 200);
  }
})();
