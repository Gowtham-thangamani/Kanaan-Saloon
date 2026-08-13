/* ============================================================
   KANAAN — Tracking layer
   Loads GTM + GA4 + Meta/TikTok/Snapchat pixels under consent.
   Tracks: form_submit, booking_submit, whatsapp_click, call_click,
           branch_page_view, offer_page_view, book_now_click.
   Reads window.KANAAN_CONFIG (assets/js/config.js).
   ============================================================ */
(function () {
  'use strict';

  // Load config synchronously by inserting script tag if not yet loaded.
  function loadConfigThen(cb) {
    if (window.KANAAN_CONFIG) return cb();
    var s = document.createElement('script');
    s.src = (location.pathname.split('/').length > 2 ? '../' : '') + 'assets/js/config.js';
    s.onload = cb;
    s.onerror = function () { console.warn('[Kanaan tracking] config.js not found'); cb(); };
    document.head.appendChild(s);
  }

  // dataLayer stub — always available for code paths that push events.
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  // Consent helpers ----------------------------------------------------------
  function getConsent() {
    try {
      var c = document.cookie.match(/(?:^|; )kanaan_consent=([^;]*)/);
      return c ? JSON.parse(decodeURIComponent(c[1])) : null;
    } catch (e) { return null; }
  }
  window.KANAAN_getConsent = getConsent;

  // Default GTM consent (denied) — must be set BEFORE GTM loads.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  // Apply stored consent (if user accepted previously).
  var stored = getConsent();
  if (stored && stored.marketing) {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
  }

  // Loaders ------------------------------------------------------------------
  function loadGTM(id) {
    if (!id) return;
    (function(w,d,s,l,i){
      w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0], j=d.createElement(s);
      j.async=true; j.src='https://www.googletagmanager.com/gtm.js?id='+i;
      f.parentNode.insertBefore(j,f);
    })(window, document, 'script', 'dataLayer', id);

    // noscript fallback
    var ns = document.createElement('noscript');
    ns.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=' + id + '" height="0" width="0" style="display:none;visibility:hidden"></iframe>';
    document.body && document.body.insertBefore(ns, document.body.firstChild);
  }

  function loadGA4(id) {
    if (!id) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true });
  }

  function loadMetaPixel(id) {
    if (!id) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq) return; n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
      if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
      t=b.createElement(e); t.async=!0; t.src=v; s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', id);
    fbq('track', 'PageView');
  }

  function loadTikTokPixel(id) {
    if (!id) return;
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments,0))) } };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };
      ttq.load = function (e, n) {
        var r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = document.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = r + '?sdkid=' + e + '&lib=' + t;
        var a = document.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
      };
      ttq.load(id); ttq.page();
    }(window, document, 'ttq');
  }

  function loadSnapPixel(id) {
    if (!id) return;
    (function(e,t,n){
      if(e.snaptr)return; var a=e.snaptr=function(){ a.handleRequest ? a.handleRequest.apply(a,arguments) : a.queue.push(arguments) };
      a.queue=[]; var s='script'; var r=t.createElement(s); r.async=!0; r.src=n;
      var u=t.getElementsByTagName(s)[0]; u.parentNode.insertBefore(r,u);
    })(window, document, 'https://sc-static.net/scevent.min.js');
    snaptr('init', id);
    snaptr('track', 'PAGE_VIEW');
  }

  // Load pixels (only marketing-class loads when consent is granted) ----------
  function loadAll() {
    var cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.tracking) || {};
    var consent = getConsent();
    var marketingOK = !!(consent && consent.marketing);
    // GTM and GA4 can load to capture analytics_storage post-consent
    if (cfg.gtmId) loadGTM(cfg.gtmId);
    if (cfg.ga4Id && !cfg.gtmId) loadGA4(cfg.ga4Id); // avoid double-loading via GTM
    if (marketingOK) {
      if (cfg.metaPixelId) loadMetaPixel(cfg.metaPixelId);
      if (cfg.tiktokPixelId) loadTikTokPixel(cfg.tiktokPixelId);
      if (cfg.snapPixelId) loadSnapPixel(cfg.snapPixelId);
    }
  }

  // Persist UTM / click IDs to localStorage on first touch -------------------
  function persistAttribution() {
    var u = new URL(window.location.href);
    var keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ttclid','sc_click_id'];
    var any = false;
    var existing = {};
    try { existing = JSON.parse(localStorage.getItem('kanaan_attribution') || '{}'); } catch (e) {}
    keys.forEach(function (k) {
      var v = u.searchParams.get(k);
      if (v) { existing[k] = v; any = true; }
    });
    if (any) {
      existing._first_touch = existing._first_touch || new Date().toISOString();
      existing._last_touch = new Date().toISOString();
      try { localStorage.setItem('kanaan_attribution', JSON.stringify(existing)); } catch (e) {}
    }
  }
  window.KANAAN_getAttribution = function () {
    try { return JSON.parse(localStorage.getItem('kanaan_attribution') || '{}'); } catch (e) { return {}; }
  };

  // Page-type events -------------------------------------------------------
  function firePageEvents() {
    var path = location.pathname;
    if (/\/branches\/[^\/]+\.html$/.test(path)) {
      track('branch_page_view', { branch: path.split('/').pop().replace('.html','') });
    }
    if (/offers\.html$/.test(path)) {
      track('offer_page_view', {});
    }
  }

  // Generic track helper — pushes to dataLayer + fires Pixel events when enabled.
  function track(eventName, params) {
    params = params || {};
    dataLayer.push(Object.assign({ event: eventName }, params));
    var consent = getConsent();
    if (consent && consent.marketing) {
      try {
        if (window.fbq) {
          var fbMap = {
            book_now_click: 'InitiateCheckout',
            booking_submit: 'Schedule',
            form_submit: 'Lead',
            // whatsapp_click handled by assets/js/meta-pixel.js (fires 'Lead'
            // sitewide per the marketing work order) — don't double-fire here.
            call_click: 'Contact'
          };
          var fb = fbMap[eventName];
          if (fb) fbq('track', fb, params); else fbq('trackCustom', eventName, params);
        }
        if (window.ttq) ttq.track(eventName, params);
        if (window.snaptr) {
          var snapMap = {
            booking_submit: 'PURCHASE',
            book_now_click: 'START_CHECKOUT',
            form_submit: 'SIGN_UP',
            whatsapp_click: 'CONTACT',
            call_click: 'CONTACT'
          };
          var sn = snapMap[eventName];
          if (sn) snaptr('track', sn, params);
        }
      } catch (e) { /* no-op */ }
    }
    if (typeof console !== 'undefined' && console.debug) console.debug('[KANAAN track]', eventName, params);
  }
  window.KANAAN_track = track;

  // data-track attribute auto-binding (works even if main.js loads later) ---
  function bindTrackAttrs() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-track]');
      if (!t) return;
      track(t.getAttribute('data-track'), { href: t.href || null });
    });
  }

  // Bootstrap ---------------------------------------------------------------
  loadConfigThen(function () {
    persistAttribution();
    loadAll();
    firePageEvents();
    bindTrackAttrs();
  });
})();
