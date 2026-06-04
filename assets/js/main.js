/* Kanaan — interaction layer */

(function () {
  'use strict';

  // Mark JS as ready so reveal animations can take over from the visible default
  document.documentElement.classList.add('js-ready');

  // --- Language switcher: keep the user on the SAME page across EN ⇄ AR ---
  // Many pages hard-code the mobile-nav switch to the language home ("ar/" or
  // "../"), so switching language drops the user back to the homepage. This
  // rewrites every `.lang-switch` href to the mirror of the current page.
  // The three EN pages with no Arabic mirror fall back to the AR home.
  (function normalizeLangSwitch() {
    const switches = document.querySelectorAll('.lang-switch');
    if (!switches.length) return;
    const isAr = document.body.classList.contains('lang-ar') || /\/ar(\/|$)/.test(location.pathname);
    const p = location.pathname;
    const noArMirror = /\/(before-after|corporate|gift-voucher)(\.html)?$/;
    let mirror;
    if (isAr) {
      // /ar/offers → /offers ; /ar/ → / ; /ar/branches/al-ain → /branches/al-ain
      mirror = p.replace(/\/ar(\/|$)/, '/');
      if (mirror.charAt(0) !== '/') mirror = '/' + mirror;
    } else if (noArMirror.test(p)) {
      mirror = '/ar/';
    } else {
      // /offers → /ar/offers ; / → /ar/ ; extension (if any) preserved
      mirror = '/ar' + (p === '/' ? '/' : p);
    }
    switches.forEach(a => a.setAttribute('href', mirror));
  })();

  // Header behaviour on scroll
  //   1. y > 40  → adds `.shrunk` (compresses height + makes background opaque)
  //   2. while scrolling DOWN past 200px → adds `.hidden-on-scroll` (slides off)
  //   3. any upward scroll, or at the very top → removes `.hidden-on-scroll`
  // The mobile-nav menu being open suppresses the hide (so users can't lose
  // the nav while the drawer is open).
  const header = document.querySelector('.site-header');
  const utilityBar = document.querySelector('.utility-bar');
  if (header) {
    let lastY = 0;
    let ticking = false;
    const HIDE_THRESHOLD = 200;   // start hiding only after this much scroll
    const DELTA_MIN = 6;          // ignore micro-scrolls below this delta
    // Apply the same scroll-state class to both header AND utility-bar so they
    // hide/show as one unit. Without this, the utility-bar stayed pinned at top
    // while the header slid away — looked broken.
    const setHidden = (hidden) => {
      header.classList.toggle('hidden-on-scroll', hidden);
      if (utilityBar) utilityBar.classList.toggle('hidden-on-scroll', hidden);
    };
    const setShrunk = (shrunk) => {
      header.classList.toggle('shrunk', shrunk);
      if (utilityBar) utilityBar.classList.toggle('shrunk', shrunk);
    };
    const onScroll = () => {
      const y = window.scrollY;
      setShrunk(y > 40);
      const drawerOpen = document.querySelector('.mobile-nav.is-open');
      const delta = y - lastY;
      if (y < HIDE_THRESHOLD || drawerOpen) {
        setHidden(false);
      } else if (Math.abs(delta) > DELTA_MIN) {
        setHidden(delta > 0);   // scrolling DOWN → hide; UP → show
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
  }

  // Active nav: every page marks the current link with class="is-active". Mirror
  // that as aria-current="page" so screen readers announce the active item.
  document.querySelectorAll('nav a.is-active').forEach(a => {
    a.setAttribute('aria-current', 'page');
  });

  // Mobile nav: off-canvas drawer with backdrop + close button + focus trap.
  // CSS handles slide animation (transform); JS only toggles classes + a11y
  // state and injects the backdrop / × button so every page gets them
  // without editing 60+ HTML headers.
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    // Reparent the drawer directly under <body>. The drawer is authored inside
    // <header class="site-header"> in every page, but the header has a
    // gradient background + (formerly) backdrop-filter which create a
    // containing block. That re-anchors the drawer's position:fixed to the
    // 96px-tall header instead of the viewport — the drawer can never slide
    // into view. Promoting it to a body child is one DOM move that fixes it
    // everywhere with no per-page HTML edits.
    if (mobileNav.parentElement !== document.body) {
      document.body.appendChild(mobileNav);
    }
    let previouslyFocused = null;
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');

    // Inject a close (×) button at the top of the drawer.
    let closeBtn = mobileNav.querySelector('.mobile-nav__close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'mobile-nav__close';
      closeBtn.setAttribute('aria-label', isAr ? 'إغلاق القائمة' : 'Close menu');
      closeBtn.innerHTML = '&times;';
      mobileNav.insertBefore(closeBtn, mobileNav.firstChild);
    }

    // Inject the backdrop element once.
    let backdrop = document.querySelector('.mobile-nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    // a11y baseline on the drawer itself.
    mobileNav.setAttribute('role', 'dialog');
    mobileNav.setAttribute('aria-modal', 'true');
    mobileNav.setAttribute('aria-label', isAr ? 'القائمة' : 'Menu');

    const focusablesIn = (el) => el.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const setOpen = (open) => {
      toggle.classList.toggle('is-open', open);
      mobileNav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        previouslyFocused = document.activeElement;
        // Skip the close button when auto-focusing — jump straight to the
        // first nav link so keyboard users hear the menu, not "Close".
        const f = focusablesIn(mobileNav);
        const firstLink = mobileNav.querySelector('a[href]');
        (firstLink || f[0]).focus();
      } else if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    };

    toggle.addEventListener('click', () => setOpen(!toggle.classList.contains('is-open')));
    closeBtn.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));
    // Close on any link tap inside the drawer.
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setOpen(false));
    });
    // Close on Escape + trap Tab focus within the open drawer.
    document.addEventListener('keydown', (e) => {
      if (!toggle.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const f = focusablesIn(mobileNav); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 50% 0px' });
    revealEls.forEach(el => io.observe(el));
    // Safety net — if anything is still hidden after 2s (slow IO or fast scrollers), reveal it.
    setTimeout(() => {
      revealEls.forEach(el => el.classList.add('is-visible'));
    }, 2000);
  } else {
    // No IntersectionObserver — show everything.
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Open Now / Closed status (uses data-hours JSON on element).
  // Runs once now for any statically-rendered pills (single-branch pages have
  // their hours baked in), and again whenever runtime.js fires
  // `branches:rendered` after async-rendering the /branches index cards.
  function updateBranchStatusPills() {
    document.querySelectorAll('[data-hours]').forEach(el => {
      try {
        const hours = JSON.parse(el.getAttribute('data-hours'));
        const now = new Date();
        const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
        const today = hours[dayKey];
        let open = false;
        if (today && today.open && today.close) {
          const [oh, om] = today.open.split(':').map(Number);
          const [ch, cm] = today.close.split(':').map(Number);
          const cur = now.getHours() * 60 + now.getMinutes();
          const oMin = oh * 60 + om;
          let cMin = ch * 60 + cm;
          // handle past-midnight close (e.g. closes at 02:00)
          if (cMin <= oMin) cMin += 24 * 60;
          const curAdj = cur < oMin ? cur + 24 * 60 : cur;
          open = curAdj >= oMin && curAdj < cMin;
        }
        el.classList.toggle('status-pill--closed', !open);
        const isAr = document.body.classList.contains('lang-ar');
        el.textContent = open ? (isAr ? 'مفتوح الآن' : 'Open Now') : (isAr ? 'مغلق' : 'Closed');
      } catch (e) { /* silent */ }
    });
  }
  updateBranchStatusPills();
  document.addEventListener('branches:rendered', updateBranchStatusPills);

  // Booking — geolocation auto-suggest nearest branch on step 1.
  // Branch coordinates (approximate centres; replace with real from content/branches.json).
  const BRANCH_COORDS = {
    'Al Ain': [24.207, 55.745],
    'Khalifa City': [24.426, 54.581],
    'Khalidiya': [24.475, 54.351],
    'Baniyas Spa': [24.318, 54.628],
    'Baniyas Barber': [24.318, 54.628],
    'Rabdan': [24.471, 54.366],
    'Old Shahamah': [24.703, 54.679],
    'New Shahamah': [24.715, 54.690],
    'Muroor': [24.461, 54.385],
    'VIP Muroor': [24.461, 54.385]
  };
  function suggestNearestBranch() {
    const stepper = document.querySelector('[data-stepper]');
    if (!stepper || !navigator.geolocation) return;
    // Don't auto-suggest if a branch is already chosen via URL param
    const params = new URLSearchParams(location.search);
    if (params.get('branch')) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      let best = null, bestD = Infinity;
      Object.entries(BRANCH_COORDS).forEach(([name, [bLat, bLng]]) => {
        const d = Math.hypot(lat - bLat, lng - bLng);
        if (d < bestD) { bestD = d; best = name; }
      });
      if (!best) return;
      const choice = stepper.querySelector(`.choice input[value="${best}"]`);
      if (choice) {
        choice.checked = true;
        choice.closest('.choice').classList.add('is-selected');
        // Subtle hint
        const step1 = stepper.querySelector('[data-step]');
        if (step1) {
          let hint = step1.querySelector('.geo-hint');
          if (!hint) {
            hint = document.createElement('p');
            hint.className = 'geo-hint';
            hint.style.cssText = 'color: var(--c-gold); font-size: 12px; margin-top: 12px; letter-spacing: 0.06em;';
            const isAr = document.body.classList.contains('lang-ar');
            hint.textContent = isAr ? `📍 اقترحنا "${best}" حسب موقعك. غيّر الاختيار إن أردت.` : `📍 We suggested ${best} based on your location. Change if you'd prefer another.`;
            step1.appendChild(hint);
          }
        }
      }
    }, () => {/* user denied — no-op */}, { timeout: 4000, maximumAge: 5 * 60 * 1000 });
  }
  // Service → minutes. Used both to (a) skip slots that would overflow the day
  // and (b) record duration on the booking row so future availability checks
  // know how long this booking occupies. EN + AR service names both mapped.
  const SERVICE_DURATIONS = {
    // English
    'Hair & Beard': 45,
    'Facial & Skin': 45,
    'Massage': 60,
    'Moroccan Bath': 60,
    'Manicure & Pedicure': 60,
    'Hair Treatment': 75,
    '8-Service Package': 120,
    '6-Service Package': 90,
    'VIP Hour': 60,
    // Arabic mirror of book.html
    'الشعر واللحية': 45,
    'عناية بالبشرة': 45,
    'مساج': 60,
    'حمّام مغربي': 60,
    'عناية أظافر': 60,
    'علاج شعر': 75,
    'باقة ٨ خدمات': 120,
    'باقة ٦ خدمات': 90,
    'ساعة VIP': 60
  };
  function durationFor(service) {
    // service may be a single value or a comma-separated list (multi-service).
    // For combined bookings, sum the durations so admin slot-blocking respects
    // the full appointment length.
    if (!service) return 30;
    const parts = String(service).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) return SERVICE_DURATIONS[parts[0]] || SERVICE_DURATIONS[service] || 30;
    return parts.reduce((sum, p) => sum + (SERVICE_DURATIONS[p] || 30), 0);
  }

  // Slot availability — three-tier strategy:
  //   1. If Supabase is configured (it normally is) → call get_taken_slots RPC
  //      to fetch every 30-min slot already taken by a booking or admin block,
  //      and return the day's slots minus those.
  //   2. Else if KANAAN_CONFIG.crm.availabilityUrl is set → call that external
  //      CRM adapter (Fresha / Salonist / Zoho).
  //   3. Else → deterministic mock (legacy fallback for local dev).
  async function checkAvailability(branch, date) {
    branch = normalizeBranchName(branch);
    const supa = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
    if (supa.url && supa.anonKey) {
      try {
        const r = await fetch(supa.url + '/rest/v1/rpc/get_taken_slots', {
          method: 'POST',
          headers: {
            'apikey': supa.anonKey,
            'Authorization': 'Bearer ' + supa.anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ branch_name: branch, target_date: date })
        });
        if (r.ok) {
          const rows = await r.json();
          // Rows: [{ taken_time: '14:30:00' }, ...] — normalize to HH:MM strings.
          const takenSet = new Set(
            (Array.isArray(rows) ? rows : [])
              .map(x => (x.taken_time || '').slice(0, 5))
              .filter(Boolean)
          );
          const allSlotsForDay = generateSlots(branch, date);
          return allSlotsForDay.filter(t => !takenSet.has(t));
        }
        console.warn('[KANAAN slots] Supabase RPC returned', r.status, '— falling back to mock');
      } catch (e) {
        console.warn('[KANAAN slots] Supabase RPC failed, falling back to mock', e);
      }
    }

    // Legacy: external CRM adapter (Fresha / Salonist / Zoho / custom)
    const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.crm) || {};
    if (cfg.availabilityUrl) {
      try {
        const headers = { 'Accept': 'application/json' };
        if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;
        const url = cfg.availabilityUrl + (cfg.availabilityUrl.includes('?') ? '&' : '?') +
                    'branch=' + encodeURIComponent(branch) + '&date=' + encodeURIComponent(date);
        const res = await fetch(url, { headers });
        if (res.ok) {
          const j = await res.json();
          return Array.isArray(j) ? j : (j.slots || []);
        }
      } catch (e) { console.warn('[KANAAN slots] CRM fetch failed, falling back to mock', e); }
    }

    // Mock fallback (only reached if Supabase + CRM both missing)
    return new Promise(resolve => {
      setTimeout(() => {
        const all = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
        const seed = (branch + date).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        resolve(all.filter((_, i) => (i + seed) % 3 !== 0));
      }, 350);
    });
  }
  // Branch-label normalization map → EN canonical (the same string used as the
  // BRANCH_HOURS key and the DB `bookings.branch` value). Covers Arabic labels
  // AND English display aliases that differ from the canonical key (e.g. the
  // EN booking form shows "Muroor Barber" but the canonical key is "Muroor").
  // Without this, those inputs match neither BRANCH_HOURS nor the availability
  // RPC, so the user sees "No slots available". Multiple AR spellings are kept
  // for the same canonical to absorb both legacy + current ar/book.html values.
  const BRANCH_AR_TO_EN = {
    'العين':              'Al Ain',
    'مدينة خليفة':         'Khalifa City',
    'الخالدية':            'Khalidiya',
    // Baniyas Spa: form sends "بنياس سبا"; older copy was "بني ياس - سبا"
    'بنياس سبا':           'Baniyas Spa',
    'بني ياس - سبا':       'Baniyas Spa',
    // Baniyas Barber: form sends "بنياس باربر"; older "بني ياس - حلاقة"
    'بنياس باربر':         'Baniyas Barber',
    'بني ياس - حلاقة':     'Baniyas Barber',
    // Rabdan: form sends "ربدان"; older "الربدان"
    'ربدان':               'Rabdan',
    'الربدان':             'Rabdan',
    'الشهامة القديمة':      'Old Shahamah',
    'الشهامة الجديدة':      'New Shahamah',
    'المرور':              'Muroor',
    // VIP Muroor: form sends "VIP المرور"; older "المرور VIP"
    'VIP المرور':          'VIP Muroor',
    'المرور VIP':          'VIP Muroor',
    // EN display-name → canonical key
    'Muroor Barber':      'Muroor'
  };
  function normalizeBranchName(name) {
    if (!name) return name;
    return BRANCH_AR_TO_EN[String(name).trim()] || name;
  }

  // Branch hours map (mirrors content/branches.json — keep in sync)
  const BRANCH_HOURS = {
    'Al Ain': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'Khalifa City': {sun:'11:30-23:00',mon:'11:30-23:00',tue:'11:30-23:00',wed:'11:30-23:00',thu:'11:30-23:00',fri:'14:30-23:00',sat:'11:30-23:00'},
    'Khalidiya': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'Baniyas Spa': {sun:'11:30-23:00',mon:'11:30-23:00',tue:'11:30-23:00',wed:'11:30-23:00',thu:'11:30-23:00',fri:'14:30-23:00',sat:'11:30-23:00'},
    'Baniyas Barber': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'Rabdan': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'Old Shahamah': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'New Shahamah': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'Muroor': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'},
    'VIP Muroor': {sun:'09:00-23:00',mon:'09:00-23:00',tue:'09:00-23:00',wed:'09:00-23:00',thu:'09:00-23:00',fri:'14:30-23:00',sat:'09:00-23:00'}
  };
  function generateSlots(branch, dateStr) {
    branch = normalizeBranchName(branch);
    if (!branch || !dateStr || !BRANCH_HOURS[branch]) return [];
    const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date(dateStr).getDay()];
    const hours = BRANCH_HOURS[branch][dayKey];
    if (!hours || hours.toLowerCase() === 'closed') return [];
    const [openH, openM] = hours.split('-')[0].split(':').map(Number);
    const [closeH, closeM] = hours.split('-')[1].split(':').map(Number);
    const slots = [];
    let h = openH, m = openM;
    while (h < closeH || (h === closeH && m <= closeM - 30)) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      m += 30; if (m >= 60) { h++; m -= 60; }
    }
    return slots;
  }
  function wireSlotCheck() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    if (!dateInput || !timeSelect) return;
    // Block past dates
    const today = new Date(); today.setHours(0,0,0,0);
    dateInput.min = today.toISOString().split('T')[0];
    // Cap 90 days out
    const max = new Date(); max.setDate(max.getDate() + 90);
    dateInput.max = max.toISOString().split('T')[0];

    // Default to today so the time dropdown can populate immediately — the
    // user no longer has to "wake up" the form by picking a date first.
    if (!dateInput.value) {
      dateInput.value = today.toISOString().split('T')[0];
    }

    let activeFetchId = 0;
    const refresh = async () => {
      const branch = document.querySelector('input[name="branch"]:checked')?.value;
      const date = dateInput.value;
      if (!branch || !date) return;
      const isAr = document.body.classList.contains('lang-ar');
      // Visible loading state — disables interaction + signals progress.
      timeSelect.disabled = true;
      timeSelect.innerHTML = `<option>${isAr ? 'جاري التحقّق…' : 'Checking availability…'}</option>`;
      // Guard against out-of-order responses (user changes date twice quickly).
      const myId = ++activeFetchId;
      // Day-aware filter (Friday opens late etc.)
      const allSlotsForDay = generateSlots(branch, date);
      let free = await checkAvailability(branch, date);
      if (myId !== activeFetchId) return;
      free = free.filter(t => allSlotsForDay.includes(t));
      if (!free.length) {
        timeSelect.innerHTML = `<option value="">${isAr ? 'لا توجد مواعيد متاحة — جرّب تاريخاً آخر' : 'No slots available — try another date'}</option>`;
      } else {
        timeSelect.innerHTML = `<option value="">${isAr ? 'اختر…' : 'Select a time…'}</option>` + free.map(t => `<option>${t}</option>`).join('');
      }
      timeSelect.disabled = false;
    };

    dateInput.addEventListener('change', refresh);
    // Refetch when the user picks a different branch (radio in Step 2).
    document.querySelectorAll('input[name="branch"]').forEach(r => {
      r.addEventListener('change', refresh);
    });
    // Initial load: if both branch and date are already set (e.g. prefilled
    // from menu.html or auto-default), fetch slots immediately so Step 3 isn't
    // sitting on an empty "Select…" the moment the user arrives.
    refresh();
  }

  // Booking stepper
  const stepper = document.querySelector('[data-stepper]');
  if (stepper) {
    const steps = Array.from(stepper.querySelectorAll('[data-step]'));
    const items = Array.from(document.querySelectorAll('.stepper__item'));
    const next = stepper.querySelectorAll('[data-next]');
    const prev = stepper.querySelectorAll('[data-prev]');
    let cur = 0;
    // Make the stepper announceable to screen readers as a numbered progress.
    const stepperEl = stepper.querySelector('.stepper');
    if (stepperEl) {
      stepperEl.setAttribute('role', 'list');
      stepperEl.setAttribute('aria-label', 'Booking progress');
    }
    items.forEach((it, idx) => {
      it.setAttribute('role', 'listitem');
      it.setAttribute('aria-label', 'Step ' + (idx + 1) + ' of ' + items.length);
    });
    const show = i => {
      steps.forEach((s, idx) => s.hidden = idx !== i);
      items.forEach((it, idx) => {
        it.classList.toggle('is-active', idx === i);
        it.classList.toggle('is-done', idx < i);
        // aria-current on the active step; "step" tells AT this is the
        // current item in a stepwise process (vs page/location etc.).
        if (idx === i) it.setAttribute('aria-current', 'step');
        else it.removeAttribute('aria-current');
      });
      cur = i;
      // Hydrate the Step-4 review summary the moment the user lands there.
      // Reading values lazily means it always reflects the latest choices.
      if (i === steps.length - 1) {
        const review = stepper.querySelector('[data-booking-review]');
        if (review) {
          const services = Array.from(stepper.querySelectorAll('input[name="service"]:checked')).map(r => r.value);
          const branch = stepper.querySelector('input[name="branch"]:checked')?.value || '';
          const date = stepper.querySelector('input[name="date"]')?.value || '';
          const time = stepper.querySelector('select[name="time"]')?.value || '';
          const set = (key, val) => {
            const el = review.querySelector(`[data-review="${key}"]`);
            if (el) el.textContent = val || '—';
          };
          set('service', services.join(' + '));
          set('branch', branch);
          set('date', date);
          set('time', time);
        }
      }
      window.scrollTo({ top: stepper.offsetTop - 100, behavior: 'smooth' });
    };
    next.forEach(b => b.addEventListener('click', () => {
      const required = steps[cur].querySelectorAll('[data-required]');
      let ok = true;
      required.forEach(r => {
        if (r.type === 'radio' || r.type === 'checkbox') {
          const group = steps[cur].querySelectorAll(`[name="${r.name}"]`);
          if (!Array.from(group).some(g => g.checked)) ok = false;
        } else if (!r.value || (r.type === 'tel' && r.value.replace(/\D/g, '').length < 7)) {
          ok = false;
          r.style.borderColor = '#8A3A2C';
        } else {
          r.style.borderColor = '';
        }
      });
      if (!ok) return;
      if (cur < steps.length - 1) show(cur + 1);
    }));
    prev.forEach(b => b.addEventListener('click', () => { if (cur > 0) show(cur - 1); }));
    // "Edit choices" link in the Step 4 review summary jumps straight to Step 1.
    const reviewEditBtn = stepper.querySelector('[data-review-edit]');
    if (reviewEditBtn) {
      reviewEditBtn.addEventListener('click', () => show(0));
    }
    // Choice click highlight. Since the label wraps the input, the browser has
    // already toggled `input.checked` by the time this listener runs — we just
    // sync the visual `.is-selected` class on this .choice (and clear siblings
    // for radios). Manually toggling the checkbox here would double-toggle and
    // leave it unchecked despite the user clicking it.
    stepper.querySelectorAll('.choice').forEach(c => {
      c.addEventListener('click', () => {
        const input = c.querySelector('input');
        if (!input) return;
        if (input.type === 'radio') {
          stepper.querySelectorAll(`.choice input[name="${input.name}"]`).forEach(i => {
            i.closest('.choice').classList.toggle('is-selected', i.checked);
          });
        } else if (input.type === 'checkbox') {
          c.classList.toggle('is-selected', input.checked);
        }
      });
    });
    // Prefill from URL params (?service=X&branch=Y&item=Z&price=N) sent from
    // the menu / services pages. Pre-selects the matching radios and jumps to
    // the first unfilled step. Also surfaces a "You're booking" banner so the
    // customer + staff see the exact item + price the user clicked on.
    (function prefillFromUrl() {
      const params = new URLSearchParams(location.search);
      // ?offer=<id> from offer cards in runtime.js maps to the corresponding
      // service radio via the SLUG_ALIASES map below.
      const presetService = params.get('service') || params.get('offer');
      const presetBranch  = params.get('branch');
      const presetItem    = params.get('item');
      const presetPrice   = params.get('price');
      const presetDate    = params.get('date');
      // Multi-item from the branch-page Menu picker: comma-separated list of
      // specific menu items + a calculated total. E.g.
      //   ?items=Hair%20Cutting%2C%20Steam%20Facial&total=90
      const presetItems   = params.get('items');
      const presetTotal   = params.get('total');
      let initialStep = 0;

      // Deterministic slug → radio aliases. Covers every URL the generators in
      // generate-services.js / generate-branches.js / runtime.js can emit so a
      // user landing from any service or branch page lands on the right radio
      // even when word-overlap is ambiguous (e.g. "grooming-packages" plural
      // vs. radio "8-Service Package" singular).
      // Language-aware so a slug like ?service=hair-beard preselects the
      // English radio ("Hair & Beard") on /book and the Arabic radio
      // ("الشعر واللحية") on /ar/book. Without the AR branch the prefill
      // silently failed for every Arabic visitor arriving from a service page.
      const isArBooking = document.body.classList.contains('lang-ar') || /\/ar(\/|$)/.test(location.pathname);
      const SLUG_ALIASES = isArBooking ? {
        service: {
          'hair-beard':          'الشعر واللحية',
          'facial-skin-care':    'عناية بالبشرة',
          'facial-skin':         'عناية بالبشرة',
          'massage':             'مساج',
          'moroccan-bath':       'حمّام مغربي',
          'manicure-pedicure':   'عناية أظافر',
          'mani-pedi':           'عناية أظافر',
          'hair-treatment':      'علاج شعر',
          'hair-removal':        'الشعر واللحية',
          'body-treatments':     'مساج',
          'grooming-packages':   'باقة ٦ خدمات',
          'complete-grooming':   'باقة ٨ خدمات',
          'premium-spa-8':       'باقة ٨ خدمات'
        },
        branch: {
          'al-ain':         'العين',
          'khalifa-city':   'مدينة خليفة',
          'khalidiya':      'الخالدية',
          'baniyas-spa':    'بنياس سبا',
          'baniyas-barber': 'بنياس باربر',
          'rabdan':         'ربدان',
          'old-shahamah':   'الشهامة القديمة',
          'new-shahamah':   'الشهامة الجديدة',
          'muroor':         'المرور',
          'vip-muroor':     'VIP المرور'
        }
      } : {
        service: {
          'hair-beard':          'Hair & Beard',
          'facial-skin-care':    'Facial & Skin',
          'facial-skin':         'Facial & Skin',
          'massage':             'Massage',
          'moroccan-bath':       'Moroccan Bath',
          'manicure-pedicure':   'Manicure & Pedicure',
          'mani-pedi':           'Manicure & Pedicure',
          'hair-treatment':      'Hair Treatment',
          'hair-removal':        'Hair & Beard',
          'body-treatments':     'Massage',
          'grooming-packages':   'Grooming Packages',
          'complete-grooming':   'Complete Grooming Package',
          'premium-spa-8':       '8 Premium Spa Services'
        },
        branch: {
          'al-ain':         'Al Ain',
          'khalifa-city':   'Khalifa City',
          'khalidiya':      'Khalidiya',
          'baniyas-spa':    'Baniyas Spa',
          'baniyas-barber': 'Baniyas Barber',
          'rabdan':         'Rabdan',
          'old-shahamah':   'Old Shahamah',
          'new-shahamah':   'New Shahamah',
          'muroor':         'Muroor',
          'vip-muroor':     'VIP Muroor'
        }
      };

      function preselectRadio(name, value) {
        if (!value) return false;
        const all = Array.from(stepper.querySelectorAll(`input[name="${name}"]`));
        if (!all.length) return false;
        // Multi-service prefill: a comma-separated value means "select all of
        // these checkboxes." E.g. ?service=Hair %26 Beard,Massage. Only applies
        // to checkbox groups; radio falls back to single match.
        if (String(value).includes(',') && all[0] && all[0].type === 'checkbox') {
          const parts = String(value).split(',').map(s => s.trim()).filter(Boolean);
          let matched = 0;
          parts.forEach(p => { if (preselectRadio(name, p)) matched++; });
          return matched > 0;
        }
        // Apply the slug-alias map first so anything emitted by the page
        // generators or runtime.js maps cleanly to a known radio value.
        const aliasKey = String(value).trim().toLowerCase();
        const aliased = (SLUG_ALIASES[name] && SLUG_ALIASES[name][aliasKey]) || value;
        const wanted = String(aliased).trim().toLowerCase();
        if (!wanted) return false;

        // 1. Exact (case-insensitive) match.
        let radio = all.find(r => (r.value || '').trim().toLowerCase() === wanted);

        // 2. Substring either way — handles
        //      "Facial & Skin Care" → radio "Facial & Skin"
        //      "Facial" → radio "Facial & Skin"
        if (!radio) {
          radio = all.find(r => {
            const v = (r.value || '').trim().toLowerCase();
            return v && (wanted.includes(v) || v.includes(wanted));
          });
        }

        // 3. Word-overlap — handles
        //      "8-Service Signature Package" → radio "8-Service Package"
        //      "VIP Gentleman's Hour" → radio "VIP Hour"
        //    The radio with the most matching word tokens wins.
        if (!radio) {
          const wordsOf = (s) => s.toLowerCase().split(/[^a-z0-9؀-ۿ]+/i).filter(Boolean);
          const wantedWords = new Set(wordsOf(wanted));
          let bestScore = 0;
          for (const r of all) {
            const vWords = wordsOf(r.value || '');
            const score = vWords.filter(w => wantedWords.has(w)).length;
            if (score > bestScore) { bestScore = score; radio = r; }
          }
          if (bestScore < 1) radio = null;
        }

        if (!radio) {
          console.warn('[KANAAN booking] No radio matched ' + name + '=' + value +
            '. Available values:', all.map(r => r.value));
          return false;
        }

        // For checkboxes, keep previously-checked siblings (multi-select);
        // for radios, clear the rest so only one is selected.
        if (radio.type !== 'checkbox') {
          stepper.querySelectorAll(`.choice input[name="${name}"]`).forEach(i => {
            i.closest('.choice')?.classList.remove('is-selected');
          });
        }
        radio.checked = true;
        radio.closest('.choice')?.classList.add('is-selected');
        return true;
      }

      // 3-step flow: step 0 = Branch + Service (combined), step 1 = Date & Time,
      // step 2 = Details. Only skip step 0 when BOTH branch AND service are
      // pre-filled — otherwise the user has no way to complete the missing one.
      const serviceSelected = preselectRadio('service', presetService);
      const branchSelected  = preselectRadio('branch',  presetBranch);
      if (serviceSelected && branchSelected) initialStep = 1;
      // Multi-item path from the branch menu picker: ?items=A,B,C means the
      // customer already picked specific menu items + branch from the menu on
      // a branch page. Step 1 (Branch+Service) is therefore complete — jump
      // straight to Step 2 (Date & Time). Trigger off ?items alone since
      // those URLs always originate from a branch page.
      if (presetItems) {
        initialStep = Math.max(initialStep, 1);
        console.info('[KANAAN booking] items prefilled (' + presetItems + ') — advancing to Step 2');
      }

      // Prefill date when calendar-day links land here (e.g. ?date=2026-05-20).
      // Date prefill alone never advances past step 0 — the user still needs to
      // confirm/pick branch & service. Only nudges to step 1 when step 0 is
      // already complete (both branch + service set).
      if (presetDate && /^\d{4}-\d{2}-\d{2}$/.test(presetDate)) {
        const dateInput = document.querySelector('[data-booking-form] input[name="date"]');
        if (dateInput) {
          dateInput.value = presetDate;
          dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Banner: surface a "You're booking" summary above the stepper for
      // any URL that came from a price-aware entry point (single ?item= /
      // ?price=, or multi ?items= / ?total= from the branch menu picker).
      if (presetItem || presetPrice || presetItems || presetTotal) {
        const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
        const banner = document.createElement('div');
        banner.className = 'booking-prefill';
        banner.style.cssText = 'background: rgba(200,160,74,0.08); border: 1px solid var(--c-gold); padding: 12px 16px; margin: 0 0 var(--s-5); font-size: 13px; color: var(--c-pearl); display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap;';
        const label = document.createElement('span');
        label.style.cssText = 'color: var(--c-gold); letter-spacing: 0.08em; text-transform: uppercase; font-size: 11px;';
        label.textContent = isAr ? 'تحجز:' : "You're booking:";
        banner.appendChild(label);
        banner.appendChild(document.createTextNode(' '));
        const parts = [];
        if (presetItems) parts.push((isAr ? 'الخدمات: ' : 'Services: ') + presetItems);
        else if (presetItem) parts.push((isAr ? 'الخدمة: ' : 'Service: ') + presetItem);
        if (presetTotal)      parts.push((isAr ? 'الإجمالي: ' : 'Total: ') + presetTotal + ' AED');
        else if (presetPrice) parts.push(presetPrice + ' AED');
        if (presetBranch) parts.push((isAr ? 'الفرع: ' : 'Branch: ') + presetBranch);
        parts.forEach((p, i) => {
          if (i > 0) banner.appendChild(document.createTextNode(' · '));
          const strong = document.createElement('strong');
          strong.textContent = p;
          banner.appendChild(strong);
        });
        stepper.parentNode.insertBefore(banner, stepper);

        // Pre-fill the message field so staff sees the exact items + total
        // when reviewing the booking in admin.
        const msg = document.querySelector('[data-booking-form] [name="message"]');
        if (msg) {
          const noteLines = [];
          if (presetItems)      noteLines.push((isAr ? 'الخدمات المختارة: ' : 'Selected services: ') + presetItems);
          else if (presetItem)  noteLines.push((isAr ? 'العنصر المختار: '   : 'Selected item: ')     + presetItem);
          if (presetTotal)      noteLines.push((isAr ? 'الإجمالي: '         : 'Total: ')             + presetTotal + ' AED');
          else if (presetPrice) noteLines.push((isAr ? 'السعر المُعلن: '    : 'Listed price: ')      + presetPrice + ' AED');
          if (noteLines.length) {
            msg.value = (msg.value ? msg.value + '\n\n' : '') + noteLines.join('\n');
          }
        }

      }

      show(initialStep);
    })();

    suggestNearestBranch();
    wireSlotCheck();
  }

  // === Helpers shared by booking + generic forms =====================
  function normalizePhone(raw) {
    if (!raw) return null;
    // keep leading + then digits only
    const s = String(raw).trim();
    const plus = s.startsWith('+') ? '+' : '';
    return plus + s.replace(/[^\d]/g, '');
  }
  function normalizeTime(raw) {
    if (!raw) return null;
    const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const hh = String(parseInt(m[1], 10)).padStart(2, '0');
    const mm = m[2];
    const ss = m[3] || '00';
    return `${hh}:${mm}:${ss}`;
  }
  function genId(prefix, branchCode) {
    const code = (branchCode || 'KNN').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'KNN';
    return `${prefix}-${code}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  async function supabaseInsert(table, row) {
    const supa = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
    if (!supa.url || !supa.anonKey) return { ok: false, error: 'not-configured' };
    // 8-second timeout so a slow/unreachable Supabase doesn't trap the user on
    // "Confirming…" forever. The localStorage row + offline queue still capture
    // the booking; the user is redirected to thank-you regardless.
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(supa.url + '/rest/v1/' + table, {
        method: 'POST',
        headers: {
          'apikey': supa.anonKey,
          'Authorization': 'Bearer ' + supa.anonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(row),
        signal: ctrl.signal
      });
      clearTimeout(timeoutId);
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return { ok: false, error: 'HTTP ' + r.status + ' ' + txt };
      }
      return { ok: true };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err && err.name === 'AbortError' ? 'timeout (8s)' : (err.message || String(err));
      return { ok: false, error: msg };
    }
  }
  async function supabaseUpload(bucket, key, file) {
    const supa = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
    if (!supa.url || !supa.anonKey) return { ok: false, error: 'not-configured' };
    try {
      // Encode each path segment separately — encoding the whole key would
      // turn the "/" between folder and filename into "%2F", flattening the
      // storage layout and breaking the cv_path stored in the DB.
      const encodedKey = String(key).split('/').map(encodeURIComponent).join('/');
      const r = await fetch(supa.url + '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + encodedKey, {
        method: 'POST',
        headers: {
          'apikey': supa.anonKey,
          'Authorization': 'Bearer ' + supa.anonKey,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: file
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return { ok: false, error: 'HTTP ' + r.status + ' ' + txt };
      }
      return { ok: true, path: bucket + '/' + key };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }
  function mailtoFallback(subject, lines) {
    const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.booking) || {};
    const to = cfg.fallbackEmail || (window.KANAAN_CONFIG && window.KANAAN_CONFIG.contact && window.KANAAN_CONFIG.contact.email) || '';
    if (!to) return null;
    return 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.filter(Boolean).join('\n'));
  }
  function showFormError(form, msg, fallbackHref) {
    let box = form.querySelector('.form-error');
    const isNew = !box;
    if (isNew) {
      box = document.createElement('div');
      box.className = 'form-error';
      // role=alert + aria-live=assertive: screen readers announce immediately.
      // The leading ⚠ icon means colour isn't the only failure signal (WCAG 1.4.1).
      box.setAttribute('role', 'alert');
      box.setAttribute('aria-live', 'assertive');
      box.style.cssText = 'background:rgba(138,58,44,0.12);border:1px solid #8A3A2C;color:#EDEAE3;padding:12px 16px;margin-top:12px;font-size:13px;line-height:1.5;border-radius:4px;opacity:0;transform:translateY(-6px);transition:opacity 200ms ease, transform 200ms ease;display:flex;gap:10px;align-items:flex-start;';
      form.appendChild(box);
    }
    box.innerHTML = '<span aria-hidden="true" style="color:#E89B8D;font-size:16px;line-height:1.4;flex-shrink:0;">⚠</span><span></span>';
    box.querySelector('span:last-child').textContent = msg;
    if (fallbackHref) {
      box.appendChild(document.createTextNode(' '));
      const a = document.createElement('a');
      a.href = fallbackHref;
      a.textContent = '— Send by email instead →';
      a.style.cssText = 'color:#C8A04A;text-decoration:underline;margin-left:6px;';
      box.appendChild(a);
    }
    // Slide-in / re-pulse on update
    requestAnimationFrame(() => {
      box.style.opacity = '1';
      box.style.transform = 'translateY(0)';
    });
  }

  // Booking form submit — POSTs to Supabase + optional webhook then redirects to thank-you.
  const form = document.querySelector('[data-booking-form]');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const isArSubmit = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
      // Mandatory: name + phone
      const nameEl  = form.querySelector('input[name="name"]');
      const phoneEl = form.querySelector('input[name="phone"]');
      const nameVal = (nameEl && nameEl.value || '').trim();
      const phoneDigits = (phoneEl && phoneEl.value || '').replace(/\D/g, '');
      let firstInvalid = null;
      if (!nameVal) { if (nameEl) nameEl.style.borderColor = '#8A3A2C'; firstInvalid = nameEl; }
      else if (nameEl) { nameEl.style.borderColor = ''; }
      if (phoneDigits.length < 7) { if (phoneEl) phoneEl.style.borderColor = '#8A3A2C'; firstInvalid = firstInvalid || phoneEl; }
      else if (phoneEl) { phoneEl.style.borderColor = ''; }
      if (firstInvalid) {
        e.stopImmediatePropagation();
        const msg = isArSubmit ? 'يرجى إدخال الاسم ورقم الهاتف قبل المتابعة.' : 'Please enter your name and phone number before continuing.';
        const existing = form.querySelector('[data-booking-error]');
        if (existing) existing.remove();
        const err = document.createElement('div');
        err.setAttribute('data-booking-error', '');
        err.style.cssText = 'color:#8A3A2C;background:rgba(138,58,44,0.08);border:1px solid #8A3A2C;padding:12px 16px;margin:12px 0;border-radius:4px;font-size:14px;font-weight:500;';
        err.textContent = msg;
        const anchor = firstInvalid.closest('.form-row') || firstInvalid;
        anchor.parentNode.insertBefore(err, anchor);
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const oldErr = form.querySelector('[data-booking-error]');
      if (oldErr) oldErr.remove();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isArSubmit ? 'جاري التأكيد…' : 'Confirming…';
      }

      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      // Step 1 is now multi-select checkboxes — Object.fromEntries keeps only
      // the last "service" value, so collapse all checked values into a single
      // comma-separated string (the DB schema stores `service text` — no
      // migration needed). Falls back to the single radio value if only one.
      const allServices = fd.getAll('service').filter(Boolean);
      if (allServices.length > 1) data.service = allServices.join(', ');
      else if (allServices.length === 1) data.service = allServices[0];
      // Fall back to ?items= URL param when no service checkboxes were ticked
      // (branch-menu picker path with `?items=A,B,C&total=N`).
      if (!data.service) {
        const urlItems = new URLSearchParams(location.search).get('items');
        if (urlItems) data.service = urlItems;
      }
      // Same fallback for branch if not in form (URL slug -> already set)
      if (!data.branch) {
        const urlBranch = new URLSearchParams(location.search).get('branch');
        if (urlBranch) data.branch = urlBranch;
      }
      data.timestamp = new Date().toISOString();
      data.userAgent = navigator.userAgent;
      data.locale = document.documentElement.lang || 'en';
      // Attribution (UTM, click IDs) — hydrated by tracking.js into localStorage
      try {
        const attr = window.KANAAN_getAttribution ? window.KANAAN_getAttribution() : {};
        Object.assign(data, attr);
      } catch (_) {}
      // Normalize phone to a stable shape for CRM dedup
      data.phone = normalizePhone(data.phone);
      // Booking ID — prefix derived from the *canonical EN* branch name so AR
      // and EN bookings share an ID shape (KNN-BAN-… for Baniyas Spa from
      // either language). Falls back to "KNN" if normalisation fails.
      const branchEN = normalizeBranchName(data.branch) || data.branch || '';
      const branchCode = branchEN.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'KNN';
      data.bookingId = `KNN-${branchCode}-${Date.now().toString(36).toUpperCase()}`;

      // Track conversion event
      if (window.KANAAN_track) window.KANAAN_track('booking_submit', { branch: data.branch, service: data.service, bookingId: data.bookingId });

      // === ALWAYS log to admin panel store (localStorage) — every booking visible at /admin/leads.html ===
      try {
        const all = JSON.parse(localStorage.getItem('kanaan_bookings') || '[]');
        all.unshift({
          id: data.bookingId,
          createdAt: data.timestamp,
          status: 'new',
          ...data
        });
        // keep last 500 to avoid bloat
        localStorage.setItem('kanaan_bookings', JSON.stringify(all.slice(0, 500)));
      } catch (_) {}

      // === WhatsApp notification — opens chat with central WhatsApp pre-filled with the full booking ===
      const wa = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.contact && window.KANAAN_CONFIG.contact.centralWhatsApp) || '971505556795';
      const isArLang = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
      const waLines = isArLang ? [
        'مرحباً كنعان، حجز جديد:',
        'الرقم: ' + data.bookingId,
        'الفرع: ' + (data.branch || ''),
        'الخدمة: ' + (data.service || ''),
        'التاريخ: ' + (data.date || ''),
        'الوقت: ' + (data.time || ''),
        'الاسم: ' + (data.name || ''),
        'الهاتف: ' + (data.phone || ''),
        data.email ? 'البريد: ' + data.email : '',
        data.dob ? 'تاريخ الميلاد: ' + data.dob : '',
        data.message ? 'ملاحظات: ' + data.message : ''
      ] : [
        'Hi Kanaan, new booking:',
        'ID: ' + data.bookingId,
        'Branch: ' + (data.branch || ''),
        'Service: ' + (data.service || ''),
        'Date: ' + (data.date || ''),
        'Time: ' + (data.time || ''),
        'Name: ' + (data.name || ''),
        'Phone: ' + (data.phone || ''),
        data.email ? 'Email: ' + data.email : '',
        data.dob ? 'DOB: ' + data.dob : '',
        data.message ? 'Notes: ' + data.message : ''
      ];
      const waText = waLines.filter(Boolean).join('\n');
      const waUrl = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(waText);
      // Open in a new tab so the thank-you page redirect still happens in the original tab
      window.open(waUrl, '_blank', 'noopener');

      // === Supabase: write the booking to Postgres if configured ===
      const supa = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
      let supaOk = true;   // treated as ok if Supabase isn't configured (admin only sees localStorage in that case)
      let supaErr = '';
      if (supa.url && supa.anonKey) {
        // Always store the canonical English branch name so AR and EN bookings
        // resolve to the same row in availability lookups, admin filtering and
        // get_taken_slots RPC.
        const canonicalBranch = normalizeBranchName(data.branch);
        const row = {
          id:               data.bookingId,
          status:           'new',
          branch:           canonicalBranch || null,
          service:          data.service || null,
          booking_date:     data.date || null,
          booking_time:     normalizeTime(data.time),
          duration_minutes: durationFor(data.service),
          name:             data.name || null,
          phone:            data.phone || null,
          email:            data.email || null,
          dob:              data.dob || null,
          message:          data.message || null,
          source:           data.utm_source || null,
          campaign:         data.utm_campaign || null,
          locale:           data.locale || 'en'
        };
        const result = await supabaseInsert(supa.table || 'bookings', row);
        supaOk = result.ok;
        supaErr = result.error || '';
        if (!result.ok) {
          // Loud error so the admin can see why bookings don't appear in the
          // database — typical causes are RLS denial (no anon insert policy),
          // 401 (bad anon key) or a schema mismatch.
          console.error('[KANAAN supabase] booking insert FAILED for', row.id, '→', result.error);
          console.error('[KANAAN supabase] If you keep seeing "No booking found" in admin/scan.html, this is why. Check the Network tab: POST', supa.url + '/rest/v1/' + (supa.table || 'bookings'));
          try {
            // Persist the last failure so admin can pull it from DevTools or
            // copy-paste it back to support.
            localStorage.setItem('kanaan_last_supa_error', JSON.stringify({
              id: row.id, when: new Date().toISOString(), error: result.error
            }));
          } catch (_) {}
        } else {
          console.info('[KANAAN supabase] booking inserted:', row.id);
          // Clear any stale "last error" record so the admin diagnostic popup
          // doesn't keep showing an error that's already been fixed.
          try { localStorage.removeItem('kanaan_last_supa_error'); } catch (_) {}
        }
      }

      // Send to optional webhook with retry + offline queue (Make.com / Zapier / direct CRM)
      const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.booking) || {};
      let webhookOk = true; // ok if no webhook configured
      if (cfg.webhookUrl) {
        webhookOk = false;
        for (let attempt = 0; attempt < 3 && !webhookOk; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, attempt * attempt * 2000));
          try {
            const res = await fetch(cfg.webhookUrl, {
              method: 'POST', mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            if (res.status >= 500 || res.status === 429) continue;
            webhookOk = res.ok;
            if (!webhookOk) break; // 4xx — don't retry
          } catch (err) {
            console.warn('[KANAAN booking] attempt', attempt + 1, 'failed:', err);
          }
        }
        if (!webhookOk) {
          try {
            const queue = JSON.parse(localStorage.getItem('kanaan_lead_queue') || '[]');
            queue.push({ payload: data, queuedAt: Date.now(), attempts: 3 });
            localStorage.setItem('kanaan_lead_queue', JSON.stringify(queue));
            webhookOk = true; // queued for retry — don't surface to user
          } catch (e) { /* localStorage blocked */ }
        }
      }

      // === If both Supabase AND webhook failed AND localStorage queue failed too,
      //     surface a clear error to the user with a mailto fallback. ===
      if (!supaOk && !webhookOk) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
        const subject = 'New booking attempt — please confirm';
        const fallback = mailtoFallback(subject, [
          'A booking failed to reach the database — please confirm with the customer:',
          '',
          'Booking ID: ' + data.bookingId,
          'Name: ' + (data.name || ''),
          'Phone: ' + (data.phone || ''),
          'Email: ' + (data.email || ''),
          'Branch: ' + (data.branch || ''),
          'Service: ' + (data.service || ''),
          'Date/Time: ' + (data.date || '') + ' ' + (data.time || ''),
          data.message ? 'Notes: ' + data.message : ''
        ]);
        const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
        const msg = isAr
          ? 'تعذّر إرسال الحجز. تحقّق من اتصالك ثم حاول مرة أخرى — أو راسلنا عبر WhatsApp.'
          : 'We could not save your booking just now. Please check your connection and try again — or message us on WhatsApp (just opened in a new tab).';
        showFormError(form, msg + (supaErr ? ' [' + supaErr + ']' : ''), fallback);
        return; // don't redirect — keep the user on this page so they see the error
      }

      // Redirect to thank-you so the user has a clear confirmation. This is
      // the only signal the customer gets that their booking landed — so it
      // must run no matter what happens with Supabase / webhooks.
      const params = new URLSearchParams({
        branch: data.branch || '',
        service: data.service || '',
        date: data.date || '',
        time: data.time || '',
        id: data.bookingId
      });
      const dest = cfg.confirmRedirect || 'thank-you';
      const redirectUrl = `${dest}?${params.toString()}`;
      console.info('[KANAAN booking] redirecting to', redirectUrl, '| supaOk=', supaOk, 'supaErr=', supaErr);
      // On AR pages, stay in /ar/ — the AR thank-you mirror is a sibling, not
      // a parent. (Previously `../thank-you.html` jumped to the EN page.)
      window.location.href = redirectUrl;
      // Safety net: if some browser quirk prevents .href from navigating
      // (e.g. an unload handler returns true), force-replace after a tick.
      setTimeout(() => {
        if (location.pathname.endsWith('/book.html') || location.pathname.endsWith('book')) {
          location.replace(redirectUrl);
        }
      }, 500);
    });
  }

  // Generic form-to-webhook wiring (contact, newsletter, careers, LP forms).
  // Forms tagged with data-form-type=... POST to KANAAN_CONFIG.booking.webhookUrl
  // (or a per-form override). Adds reCAPTCHA v3 if siteKey is configured.
  async function getRecaptchaToken(action) {
    const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.tracking) || {};
    if (!cfg.recaptchaSiteKey) return null;
    if (!window.grecaptcha) {
      await new Promise(resolve => {
        const s = document.createElement('script');
        s.src = `https://www.google.com/recaptcha/api.js?render=${cfg.recaptchaSiteKey}`;
        s.onload = resolve; s.onerror = resolve;
        document.head.appendChild(s);
      });
    }
    if (!window.grecaptcha) return null;
    return new Promise(resolve => {
      grecaptcha.ready(() => {
        grecaptcha.execute(cfg.recaptchaSiteKey, { action }).then(resolve).catch(() => resolve(null));
      });
    });
  }
  /* Build the Supabase row for a given form type.
     Returns { table, row } or null if the form type isn't backed by a table. */
  function buildSupabaseRowForForm(type, fd, dataObj) {
    const id = genId(type === 'newsletter' ? 'NL' : type === 'contact' ? 'CT' : type === 'careers' ? 'CR' : 'LP');
    const base = {
      id: id,
      status: 'new',
      source: dataObj.utm_source || null,
      campaign: dataObj.utm_campaign || null,
      page: dataObj.page || null,
      locale: dataObj.locale || 'en'
    };
    if (type === 'newsletter') {
      const email = (fd.get('email') || '').toString().trim();
      if (!email) return null;
      return {
        table: 'newsletter',
        row: Object.assign({}, base, { email: email }),
        id: id
      };
    }
    if (type === 'contact') {
      return {
        table: 'contacts',
        row: Object.assign({}, base, {
          name:    fd.get('name')    || null,
          phone:   normalizePhone(fd.get('phone')),
          email:   fd.get('email')   || null,
          subject: fd.get('subject') || null,
          message: fd.get('message') || null
        }),
        id: id
      };
    }
    if (type === 'careers') {
      return {
        table: 'careers',
        row: Object.assign({}, base, {
          name:               fd.get('name')              || null,
          phone:              normalizePhone(fd.get('phone')),
          email:              fd.get('email')             || null,
          role:               fd.get('role')              || null,
          experience:         fd.get('experience')        || null,
          branch_preference:  fd.get('branch_preference') || null,
          portfolio:          fd.get('portfolio')         || null,
          message:            fd.get('message')           || null
        }),
        id: id
      };
    }
    return null; // 'landing' and unknown types — no dedicated table
  }

  async function submitGenericForm(form, type) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : '';
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '…'; }

    const formData = new FormData(form);
    const dataObj = {};
    formData.forEach((v, k) => { if (!(v instanceof File)) dataObj[k] = v; });
    dataObj.formType = type;
    dataObj.timestamp = new Date().toISOString();
    dataObj.locale = document.documentElement.lang || 'en';
    dataObj.page = location.pathname;
    try {
      const attr = window.KANAAN_getAttribution ? window.KANAAN_getAttribution() : {};
      Object.assign(dataObj, attr);
    } catch (_) {}
    const token = await getRecaptchaToken(type);
    if (token) dataObj.recaptchaToken = token;

    if (window.KANAAN_track) window.KANAAN_track(type + '_submit', { type });

    const supaCfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
    const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.booking) || {};
    const webhookUrl = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.forms && window.KANAAN_CONFIG.forms[type]) || cfg.webhookUrl;

    // === 1. Try Supabase first ===
    let supaResult = null;
    let supaRow = null;
    if (supaCfg.url && supaCfg.anonKey) {
      supaRow = buildSupabaseRowForForm(type, formData, dataObj);
      if (supaRow) {
        // Careers: upload CV first if present, then write the row with cv_path
        if (type === 'careers') {
          const file = formData.get('cv');
          if (file && file instanceof File && file.size > 0) {
            if (file.size > 5 * 1024 * 1024) {
              if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
              showFormError(form, isAr ? 'حجم الملف كبير جداً — يجب ألا يتجاوز 5 ميجابايت.' : 'CV is too large — must be under 5 MB.');
              return;
            }
            const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
            const key = supaRow.id + '/' + safeName;
            const up = await supabaseUpload('careers-cv', key, file);
            if (up.ok) {
              supaRow.row.cv_path = up.path;
              supaRow.row.cv_filename = file.name;
            } else {
              console.warn('[KANAAN careers] CV upload failed', up.error);
            }
          }
        }
        supaResult = await supabaseInsert(supaRow.table, supaRow.row);
        if (!supaResult.ok) console.warn('[KANAAN form] supabase insert failed', type, supaResult.error);
      }
    }

    // === 2. Optional webhook (Make.com / Zapier) — independent path ===
    let webhookOk = null;
    if (webhookUrl) {
      try {
        let res;
        const hasFiles = !!form.querySelector('input[type="file"]');
        if (hasFiles) {
          Object.entries(dataObj).forEach(([k, v]) => formData.append(k, v));
          res = await fetch(webhookUrl, { method: 'POST', mode: 'cors', body: formData });
        } else {
          res = await fetch(webhookUrl, {
            method: 'POST', mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataObj)
          });
        }
        webhookOk = res.ok;
      } catch (e) {
        console.warn('[KANAAN form] webhook failed', e);
        webhookOk = false;
      }
    }

    // === 3. Decide whether the submission succeeded ===
    // ok = (Supabase succeeded) OR (webhook succeeded) OR (neither configured AND we treat as ok)
    const supaConfigured = !!(supaCfg.url && supaCfg.anonKey && supaRow);
    const webhookConfigured = !!webhookUrl;
    let ok;
    if (supaConfigured || webhookConfigured) {
      ok = (supaResult && supaResult.ok) || webhookOk === true;
    } else {
      // No backend configured at all — log the payload and let the user know we got their request.
      console.info('[KANAAN form] no Supabase/webhook configured — payload:', dataObj);
      ok = true;
    }

    if (submitBtn) {
      submitBtn.textContent = ok
        ? (isAr ? 'تم الإرسال ✓' : 'Sent ✓')
        : (isAr ? 'فشل — حاول مرة أخرى' : 'Failed — try again');
      submitBtn.disabled = !ok;
    }
    if (ok) {
      form.querySelectorAll('input, textarea, select').forEach(el => { if (el.type !== 'hidden' && el.type !== 'submit') el.value = ''; });
      setTimeout(() => {
        if (submitBtn && submitBtn.textContent.includes('✓')) {
          submitBtn.textContent = originalLabel;
          submitBtn.disabled = false;
        }
      }, 4000);
    } else {
      // Show a clear inline error with mailto fallback so the user isn't stuck.
      const subject = 'Website ' + type + ' submission';
      const lines = Object.entries(dataObj)
        .filter(([k]) => !['recaptchaToken', 'formType'].includes(k))
        .map(([k, v]) => k + ': ' + v);
      const fallback = mailtoFallback(subject, lines);
      const errMsg = isAr
        ? 'تعذّر إرسال نموذجك. تحقّق من اتصالك ثم حاول مرة أخرى.'
        : 'Could not submit your form. Please check your connection and try again.';
      showFormError(form, errMsg, fallback);
    }
  }
  // Newsletter
  document.querySelectorAll('[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); submitGenericForm(form, 'newsletter'); });
  });
  // Contact
  document.querySelectorAll('[data-contact-form]').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); submitGenericForm(form, 'contact'); });
  });
  // Careers
  document.querySelectorAll('[data-careers-form]').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); submitGenericForm(form, 'careers'); });
  });
  // Generic LP forms (anything with data-lp-form)
  document.querySelectorAll('[data-lp-form]').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); submitGenericForm(form, 'landing'); });
  });

  // -------- Save & resume booking state (cross-tab via storage event) --------
  const BOOKING_STATE_KEY = 'kanaan_booking_draft';
  function saveBookingState() {
    const form = document.querySelector('[data-booking-form]');
    if (!form) return;
    const state = Object.fromEntries(new FormData(form).entries());
    state._step = (function () {
      const items = document.querySelectorAll('.stepper__item');
      let idx = 0;
      items.forEach((it, i) => { if (it.classList.contains('is-active')) idx = i; });
      return idx;
    })();
    state._ts = Date.now();
    try { localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function restoreBookingState() {
    const form = document.querySelector('[data-booking-form]');
    if (!form) return;
    let state;
    try { state = JSON.parse(localStorage.getItem(BOOKING_STATE_KEY) || 'null'); } catch (_) { return; }
    if (!state || !state._ts || Date.now() - state._ts > 30 * 60 * 1000) return; // 30-min TTL
    Object.entries(state).forEach(([k, v]) => {
      if (k.startsWith('_')) return;
      const el = form.querySelector(`[name="${k}"]`);
      if (!el) return;
      if (el.type === 'radio') {
        const radio = form.querySelector(`[name="${k}"][value="${v}"]`);
        if (radio) { radio.checked = true; radio.closest('.choice')?.classList.add('is-selected'); }
      } else el.value = v;
    });
    // Tiny gold restore notice
    const isAr = document.body.classList.contains('lang-ar');
    const note = document.createElement('div');
    note.style.cssText = 'background: rgba(200,160,74,0.1); border: 1px solid var(--c-gold); color: var(--c-gold); padding: 12px 16px; margin-bottom: var(--s-5); font-size: 13px; letter-spacing: 0.06em;';
    note.innerHTML = (isAr ? '↺ تم استعادة حجزك من المرة السابقة. ' : '↺ Restored your booking from earlier. ') +
      `<a href="javascript:void(0)" onclick="localStorage.removeItem('kanaan_booking_draft'); this.parentNode.remove();" style="color: var(--c-gold); text-decoration: underline; margin-left: 8px;">${isAr ? 'ابدأ من جديد' : 'Start fresh'}</a>`;
    form.parentNode.insertBefore(note, form);
  }
  // Save on every input/change inside the booking form
  document.querySelectorAll('[data-booking-form]').forEach(form => {
    form.addEventListener('input', saveBookingState);
    form.addEventListener('change', saveBookingState);
  });
  restoreBookingState();
  // Cross-tab listen — if user opens a 2nd tab, they see the same draft
  window.addEventListener('storage', (e) => {
    if (e.key === BOOKING_STATE_KEY) restoreBookingState();
  });

  // -------- Recently viewed branches (localStorage) --------
  (function trackBranchView() {
    const m = location.pathname.match(/\/branches\/([^/]+?)(?:\.html)?$/);
    if (!m) return;
    let recent;
    try { recent = JSON.parse(localStorage.getItem('kanaan_recent_branches') || '[]'); } catch (_) { recent = []; }
    recent = [m[1]].concat(recent.filter(x => x !== m[1])).slice(0, 5);
    try { localStorage.setItem('kanaan_recent_branches', JSON.stringify(recent)); } catch (_) {}
  })();

  // -------- Returning-customer welcome (phone-hash detection) --------
  (function detectReturning() {
    const phone = sessionStorage.getItem('kanaan_user_phone');
    if (phone) {
      document.body.classList.add('user-returning');
      document.querySelectorAll('[data-returning-only]').forEach(el => { el.style.display = ''; });
    }
  })();
  // After successful booking, store phone for next visit
  document.addEventListener('kanaan:booking-success', (e) => {
    const phone = e.detail?.phone;
    if (phone) sessionStorage.setItem('kanaan_user_phone', phone.replace(/\D/g, '').slice(-10));
  });

  // -------- A/B test cookie stub --------
  (function abTest() {
    let v = document.cookie.match(/kanaan_ab=([ab])/);
    if (!v) {
      const variant = Math.random() < 0.5 ? 'a' : 'b';
      const d = new Date(); d.setMonth(d.getMonth() + 6);
      document.cookie = 'kanaan_ab=' + variant + ';expires=' + d.toUTCString() + ';path=/';
      v = ['', variant];
    }
    document.documentElement.setAttribute('data-ab', v[1]);
  })();

  // -------- Site-wide WhatsApp FAB — injected on every public page --------
  (function whatsappFab() {
    if (document.querySelector('.fab-whatsapp')) return;
    if (/\/admin\//.test(location.pathname)) return; // skip admin
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
    const phone = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.contact && window.KANAAN_CONFIG.contact.centralWhatsApp) || '971505556795';
    const message = encodeURIComponent(isAr
      ? 'مرحباً كنعان، أرغب في الاستفسار.'
      : "Hi Kanaan, I'd like to make an inquiry.");
    const fab = document.createElement('a');
    fab.href = 'https://wa.me/' + phone + '?text=' + message;
    fab.className = 'fab-whatsapp';
    fab.setAttribute('aria-label', isAr ? 'تواصل عبر واتساب' : 'Chat on WhatsApp');
    fab.setAttribute('data-track', 'fab_whatsapp_click');
    fab.target = '_blank';
    fab.rel = 'noopener';
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/>' +
      '</svg>';
    document.body.appendChild(fab);
  })();

  // -------- Mobile sticky FAB — site-wide except on book/thank-you pages --------
  (function mobileFab() {
    if (document.querySelector('.fab-book')) return;
    // Don't add the "Book" FAB on the booking page itself or the confirmation page.
    if (/(?:^|\/)book(?:\.html)?$/.test(location.pathname) ||
        /thank-you(?:\.html)?$/.test(location.pathname) ||
        /\/admin\//.test(location.pathname)) return;
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
    const fab = document.createElement('a');
    fab.href = isAr ? '../book' : 'book';
    fab.className = 'fab-book';
    fab.setAttribute('data-track', 'fab_book_click');
    fab.textContent = isAr ? 'احجز' : 'Book';
    document.body.appendChild(fab);
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      fab.classList.toggle('fab-book--visible', y > 400 && y > lastY - 50);
      lastY = y;
    }, { passive: true });
  })();

  // -------- Confetti on booking success (capped on mobile to avoid jank) --------
  function confetti() {
    const colors = ['#C8A04A', '#EDEAE3', '#8E6A2A'];
    const count = window.matchMedia('(max-width: 640px)').matches ? 30 : 60;
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:8px;height:14px;background:${colors[i%3]};opacity:0.9;z-index:9999;pointer-events:none;transform:rotate(${Math.random()*360}deg);transition:transform 2.5s linear, top 2.5s linear, opacity 2.5s linear;`;
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        c.style.top = '110%';
        c.style.transform = `rotate(${Math.random()*1080}deg) translateX(${(Math.random()-0.5)*300}px)`;
        c.style.opacity = '0';
      });
      setTimeout(() => c.remove(), 2600);
    }
  }
  if (/thank-you(?:\.html)?$/.test(location.pathname)) {
    setTimeout(confetti, 400);
  }

  // Drain offline lead queue on every page load
  (async function drainQueue() {
    let queue;
    try { queue = JSON.parse(localStorage.getItem('kanaan_lead_queue') || '[]'); } catch (_) { return; }
    if (!queue.length) return;
    const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.booking) || {};
    if (!cfg.webhookUrl) return;
    const remaining = [];
    for (const item of queue) {
      try {
        const res = await fetch(cfg.webhookUrl, {
          method: 'POST', mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({ _retried: true, _queuedAt: item.queuedAt }, item.payload))
        });
        if (!res.ok) remaining.push(item);
      } catch (e) { remaining.push(item); }
    }
    localStorage.setItem('kanaan_lead_queue', JSON.stringify(remaining));
    if (queue.length !== remaining.length) console.info('[KANAAN] drained', queue.length - remaining.length, 'queued leads');
  })();

  // Persist UTM to sessionStorage
  const u = new URL(window.location.href);
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ttclid'].forEach(k => {
    const v = u.searchParams.get(k);
    if (v) sessionStorage.setItem(k, v);
  });

  // Thank-you page summary
  const summary = document.querySelector('[data-summary]');
  if (summary) {
    const p = new URLSearchParams(window.location.search);
    summary.querySelectorAll('[data-field]').forEach(el => {
      const k = el.getAttribute('data-field');
      const v = p.get(k);
      if (v) el.textContent = v;
    });
  }

  // Tab tracking events (demo console)
  document.querySelectorAll('[data-track]').forEach(el => {
    el.addEventListener('click', () => {
      const ev = el.getAttribute('data-track');
      console.log(`[TRACK] ${ev}`, { href: el.href || null });
      // window.dataLayer && dataLayer.push({ event: ev });
    });
  });

  // Filter chips (offers / branches / gallery)
  document.querySelectorAll('[data-filter]').forEach(group => {
    const chips = group.querySelectorAll('[data-filter-chip]');
    const targets = document.querySelectorAll(group.getAttribute('data-filter'));
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        const val = chip.getAttribute('data-filter-chip');
        targets.forEach(t => {
          const tags = (t.getAttribute('data-tags') || '').split(',').map(s => s.trim());
          t.style.display = (val === 'all' || tags.includes(val)) ? '' : 'none';
        });
      });
    });
  });

  // Gallery lightbox (lightweight) — with prev/next navigation across all
  // triggers on the page (keyboard ← → and on-screen arrows) plus Escape/click close.
  const lightbox = document.querySelector('[data-lightbox]');
  if (lightbox) {
    const img = lightbox.querySelector('img');
    const triggers = Array.from(document.querySelectorAll('[data-lightbox-trigger]'));
    const srcOf = t => t.getAttribute('href') || (t.querySelector('img') && t.querySelector('img').src);
    let current = -1;
    const show = i => {
      if (i < 0 || i >= triggers.length) return;
      const src = srcOf(triggers[i]);
      if (!src) return;
      current = i;
      img.src = src;
      const alt = triggers[i].querySelector('img') && triggers[i].querySelector('img').alt;
      if (alt) img.alt = alt;
      lightbox.classList.add('is-open');
    };
    const close = () => { lightbox.classList.remove('is-open'); current = -1; };
    const step = dir => { if (current >= 0 && triggers.length > 1) show((current + dir + triggers.length) % triggers.length); };

    triggers.forEach((t, i) => {
      t.addEventListener('click', e => { e.preventDefault(); show(i); });
    });

    // Inject prev/next controls once (only useful when there's more than one image).
    if (triggers.length > 1 && !lightbox.querySelector('[data-lb-next]')) {
      const mk = (dir, label, glyph) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute(dir > 0 ? 'data-lb-next' : 'data-lb-prev', '');
        b.setAttribute('aria-label', label);
        b.textContent = glyph;
        b.style.cssText = 'position:absolute;top:50%;transform:translateY(-50%);' +
          (dir > 0 ? 'right:16px;' : 'left:16px;') +
          'z-index:2;background:rgba(0,0,0,0.4);color:#fff;border:1px solid rgba(255,255,255,0.4);' +
          'width:48px;height:48px;font-size:24px;cursor:pointer;border-radius:50%;line-height:1;';
        b.addEventListener('click', e => { e.stopPropagation(); step(dir); });
        return b;
      };
      lightbox.appendChild(mk(-1, 'Previous image', '‹'));
      lightbox.appendChild(mk(1, 'Next image', '›'));
    }

    lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target === img) close(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
  }

  // === Branch-page service picker — multi-select services on a branch detail
  // page, then jump to /book?branch=<slug>&service=<csv> with everything
  // pre-filled. Auto-binds to any <form data-branch-service-picker="<slug>">.
  document.querySelectorAll('[data-branch-service-picker]').forEach(form => {
    const branchSlug = form.getAttribute('data-branch-service-picker');
    const btn = form.querySelector('[data-branch-book-btn]');
    if (!branchSlug || !btn) return;
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
    const labels = {
      none:    isAr ? 'اختر خدمة للمتابعة' : 'Select a service to continue',
      one:     isAr ? 'احجز خدمة واحدة ←'  : 'Book 1 service →',
      manyEn:  (n) => 'Book ' + n + ' services →',
      manyAr:  (n) => 'احجز ' + n + ' خدمات ←'
    };
    function update() {
      const checked = form.querySelectorAll('input[name="service"]:checked');
      btn.disabled = checked.length === 0;
      if (checked.length === 0)      btn.textContent = labels.none;
      else if (checked.length === 1) btn.textContent = labels.one;
      else                            btn.textContent = (isAr ? labels.manyAr : labels.manyEn)(checked.length);
    }
    form.querySelectorAll('.choice').forEach(c => {
      c.addEventListener('click', () => {
        const input = c.querySelector('input[type="checkbox"]');
        if (!input) return;
        // browser has already toggled input.checked because <label> wraps input
        c.classList.toggle('is-selected', input.checked);
        update();
      });
    });
    btn.addEventListener('click', () => {
      const services = Array.from(form.querySelectorAll('input[name="service"]:checked'))
        .map(c => c.value).join(',');
      if (!services) return;
      // Branch pages live at /branches/<slug>.html (or /ar/branches/<slug>.html),
      // so ../book.html resolves correctly in both languages.
      window.location.href = '../book?branch=' + encodeURIComponent(branchSlug) +
        '&service=' + encodeURIComponent(services);
    });
    update();
  });

  // === Branch-page Menu & Pricing item picker — converts each row of the
  // #rates tables into a clickable, multi-select item, builds a running total,
  // and navigates to /book.html with ?items=...&total=... on submit.
  (function initMenuPicker() {
    const rates = document.getElementById('rates');
    if (!rates) return;
    const pathMatch = location.pathname.match(/\/(?:ar\/)?branches\/([a-z0-9-]+?)(?:\.html)?$/);
    if (!pathMatch) return;
    const branchSlug = pathMatch[1];
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');

    const selected = []; // { key, name, variant, price, cell }

    function priceFromCell(cell) {
      const m = (cell.textContent || '').match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }
    function attachToggle(target, highlight, serviceName, variantLabel, price) {
      const key = serviceName + (variantLabel ? ' (' + variantLabel + ')' : '');
      target.style.cursor = 'pointer';
      target.style.userSelect = 'none';
      target.style.transition = 'background-color 200ms ease';
      target.setAttribute('role', 'button');
      target.setAttribute('tabindex', '0');
      function toggle() {
        const idx = selected.findIndex(s => s.key === key);
        if (idx >= 0) {
          selected.splice(idx, 1);
          highlight.forEach(el => { el.style.backgroundColor = ''; el.style.outline = ''; });
        } else {
          selected.push({ key, name: serviceName, variant: variantLabel, price, target });
          highlight.forEach(el => {
            el.style.backgroundColor = 'rgba(200, 160, 74, 0.18)';
          });
        }
        updateBar();
      }
      target.addEventListener('click', toggle);
      target.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }

    rates.querySelectorAll('.rate-card table').forEach(table => {
      const headerCells = table.querySelectorAll('thead th');
      const isMultiCol = headerCells.length > 2;
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        const serviceName = (cells[0].textContent || '').trim();
        if (!serviceName) return;
        // Editorial-description row tucked beneath each service — include it in
        // the highlight group so the gold "selected" wash spans both rows.
        const nextRow = row.nextElementSibling;
        const descCell = (nextRow && nextRow.querySelector('td[colspan]')) || null;
        if (isMultiCol) {
          // Each price cell = its own variant (e.g. Thai Massage 20 min vs 60 min).
          // The service-name cell acts as a shortcut for the FIRST (cheapest)
          // variant so users can click anywhere on the row to pick the default.
          for (let i = 1; i < cells.length; i++) {
            const cell = cells[i];
            const price = priceFromCell(cell);
            if (!price) continue;
            const variantLabel = headerCells[i] ? (headerCells[i].textContent || '').trim() : '';
            // For the first price column, wire the name cell too — clicking the
            // service name toggles the cheapest variant. Highlights both cells.
            if (i === 1) {
              const group = descCell ? [cells[0], cell, descCell] : [cells[0], cell];
              [cells[0], cell].forEach(t => {
                attachToggle(t, group, serviceName, variantLabel, price);
              });
            } else {
              attachToggle(cell, descCell ? [cell, descCell] : [cell], serviceName, variantLabel, price);
            }
          }
        } else {
          // 2-column: clicking ANYWHERE in the row toggles selection. Highlight
          // both cells together so the whole row reads as selected.
          const price = priceFromCell(cells[1]);
          if (!price) return;
          const group = descCell ? Array.from(cells).concat(descCell) : Array.from(cells);
          attachToggle(row, group, serviceName, '', price);
        }
      });
    });

    // Floating action bar.
    const bar = document.createElement('div');
    bar.setAttribute('data-menu-cart', '');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:#15171A;color:#EDEAE3;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;z-index:90;transform:translateY(110%);transition:transform 280ms cubic-bezier(.2,.8,.2,1);box-shadow:0 -8px 24px rgba(0,0,0,.4);font-family:inherit;gap:16px;flex-wrap:wrap;';
    const labelNone   = isAr ? 'لم يتم اختيار خدمات' : 'No services selected';
    const labelOne    = isAr ? 'خدمة واحدة'         : '1 service';
    const labelMany   = n => isAr ? (n + ' خدمات') : (n + ' services');
    const bookLabel   = isAr ? 'احجز المختار ←'    : 'Book Selected →';
    const aedSuffix   = isAr ? 'درهم' : 'AED';
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<span data-menu-count style="font-weight:600;font-size:15px;">' + labelNone + '</span>' +
        '<span style="opacity:.4;">·</span>' +
        '<span data-menu-total style="color:#C8A04A;font-weight:600;font-size:16px;font-variant-numeric:tabular-nums;">0 ' + aedSuffix + '</span>' +
      '</div>' +
      '<button type="button" data-menu-book class="btn" style="background:#C8A04A;color:#15171A;border:none;padding:12px 22px;font-weight:600;cursor:pointer;letter-spacing:.05em;">' + bookLabel + '</button>';
    document.body.appendChild(bar);
    const countEl = bar.querySelector('[data-menu-count]');
    const totalEl = bar.querySelector('[data-menu-total]');
    const bookBtn = bar.querySelector('[data-menu-book]');

    function updateBar() {
      const n = selected.length;
      const total = selected.reduce((s, it) => s + it.price, 0);
      if (n === 0) {
        bar.style.transform = 'translateY(110%)';
        countEl.textContent = labelNone;
        totalEl.textContent = '0 ' + aedSuffix;
        return;
      }
      bar.style.transform = 'translateY(0)';
      countEl.textContent = n === 1 ? labelOne : labelMany(n);
      totalEl.textContent = total + ' ' + aedSuffix;
    }

    bookBtn.addEventListener('click', () => {
      if (selected.length === 0) return;
      const items = selected.map(s => s.key).join(', ');
      const total = selected.reduce((s, it) => s + it.price, 0);
      const url = '../book?branch=' + encodeURIComponent(branchSlug) +
        '&items=' + encodeURIComponent(items) +
        '&total=' + total;
      window.location.href = url;
    });
  })();
})();
