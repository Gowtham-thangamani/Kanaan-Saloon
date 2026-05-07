/* Kanaan — interaction layer */

(function () {
  'use strict';

  // Mark JS as ready so reveal animations can take over from the visible default
  document.documentElement.classList.add('js-ready');

  // Header shrink on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    let last = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('shrunk', y > 40);
      last = y;
    }, { passive: true });
  }

  // Mobile nav toggle
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('is-open');
      mobileNav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      toggle.setAttribute('aria-expanded', String(open));
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('is-open');
        mobileNav.classList.remove('is-open');
        document.body.style.overflow = '';
      });
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

  // Open Now / Closed status (uses data-hours JSON on element)
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
  // Slot availability — uses real CRM if `KANAAN_CONFIG.crm.availabilityUrl` is set,
  // otherwise falls back to a deterministic mock returning ~70% of slots.
  async function checkAvailability(branch, date) {
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
          // Expected: array of HH:MM strings. Tolerate { slots: [...] } too.
          return Array.isArray(j) ? j : (j.slots || []);
        }
      } catch (e) { console.warn('[KANAAN slots] CRM fetch failed, falling back to mock', e); }
    }
    // Mock fallback
    return new Promise(resolve => {
      setTimeout(() => {
        const all = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
        const seed = (branch + date).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        resolve(all.filter((_, i) => (i + seed) % 3 !== 0));
      }, 350);
    });
  }
  // Branch hours map (mirrors content/branches.json — keep in sync)
  const BRANCH_HOURS = {
    'Al Ain': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Khalifa City': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Khalidiya': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Baniyas Spa': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Baniyas Barber': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Rabdan': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Old Shahamah': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'New Shahamah': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'Muroor': {sun:'10:00-23:00',mon:'10:00-23:00',tue:'10:00-23:00',wed:'10:00-23:00',thu:'10:00-23:00',fri:'14:00-23:00',sat:'10:00-23:00'},
    'VIP Muroor': {sun:'11:00-23:00',mon:'11:00-23:00',tue:'11:00-23:00',wed:'11:00-23:00',thu:'11:00-23:00',fri:'14:00-23:00',sat:'11:00-23:00'}
  };
  function generateSlots(branch, dateStr) {
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

    const refresh = async () => {
      const branch = document.querySelector('input[name="branch"]:checked')?.value;
      const date = dateInput.value;
      if (!branch || !date) return;
      // Day-aware filter (Friday opens late etc.)
      const allSlotsForDay = generateSlots(branch, date);
      timeSelect.disabled = true;
      const isAr = document.body.classList.contains('lang-ar');
      timeSelect.innerHTML = `<option>${isAr ? 'جاري التحقّق…' : 'Checking…'}</option>`;
      let free = await checkAvailability(branch, date);
      // Intersect with day-aware slots so we never offer Friday morning at a Friday-closed branch
      free = free.filter(t => allSlotsForDay.includes(t));
      if (!free.length) {
        timeSelect.innerHTML = `<option value="">${isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No slots available — try another date'}</option>`;
      } else {
        timeSelect.innerHTML = `<option value="">${isAr ? 'اختر…' : 'Select…'}</option>` + free.map(t => `<option>${t}</option>`).join('');
      }
      timeSelect.disabled = false;
    };
    dateInput.addEventListener('change', refresh);
  }

  // Booking stepper
  const stepper = document.querySelector('[data-stepper]');
  if (stepper) {
    const steps = Array.from(stepper.querySelectorAll('[data-step]'));
    const items = Array.from(document.querySelectorAll('.stepper__item'));
    const next = stepper.querySelectorAll('[data-next]');
    const prev = stepper.querySelectorAll('[data-prev]');
    let cur = 0;
    const show = i => {
      steps.forEach((s, idx) => s.hidden = idx !== i);
      items.forEach((it, idx) => {
        it.classList.toggle('is-active', idx === i);
        it.classList.toggle('is-done', idx < i);
      });
      cur = i;
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
    // Choice click highlight (radio cards)
    stepper.querySelectorAll('.choice').forEach(c => {
      c.addEventListener('click', () => {
        const input = c.querySelector('input');
        if (!input) return;
        if (input.type === 'radio') {
          stepper.querySelectorAll(`.choice input[name="${input.name}"]`).forEach(i => {
            i.closest('.choice').classList.remove('is-selected');
          });
          input.checked = true;
          c.classList.add('is-selected');
        } else if (input.type === 'checkbox') {
          input.checked = !input.checked;
          c.classList.toggle('is-selected', input.checked);
        }
      });
    });
    show(0);
    suggestNearestBranch();
    wireSlotCheck();
  }

  // Booking form submit — POSTs to configurable webhook then redirects to thank-you.
  const form = document.querySelector('[data-booking-form]');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '…'; }

      const data = Object.fromEntries(new FormData(form).entries());
      data.timestamp = new Date().toISOString();
      data.userAgent = navigator.userAgent;
      data.locale = document.documentElement.lang || 'en';
      // Attribution (UTM, click IDs) — hydrated by tracking.js into localStorage
      try {
        const attr = window.KANAAN_getAttribution ? window.KANAAN_getAttribution() : {};
        Object.assign(data, attr);
      } catch (_) {}
      // Booking ID
      const branchCode = (data.branch || 'kn').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'KNN';
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
      if (supa.url && supa.anonKey) {
        const row = {
          id:           data.bookingId,
          status:       'new',
          branch:       data.branch || null,
          service:      data.service || null,
          booking_date: data.date || null,
          booking_time: data.time ? (data.time.length === 5 ? data.time + ':00' : data.time) : null,
          name:         data.name || null,
          phone:        data.phone || null,
          email:        data.email || null,
          dob:          data.dob || null,
          message:      data.message || null,
          source:       data.utm_source || null,
          campaign:     data.utm_campaign || null,
          locale:       data.locale || 'en'
        };
        try {
          const r = await fetch(supa.url + '/rest/v1/' + (supa.table || 'bookings'), {
            method: 'POST',
            headers: {
              'apikey': supa.anonKey,
              'Authorization': 'Bearer ' + supa.anonKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(row)
          });
          if (!r.ok) console.warn('[KANAAN supabase] insert failed', r.status, await r.text());
        } catch (err) {
          console.warn('[KANAAN supabase] error', err);
        }
      }

      // Send to webhook with retry + offline queue (Make.com / Zapier / direct CRM)
      const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.booking) || {};
      let ok = false;
      if (cfg.webhookUrl) {
        // 3 attempts, exponential backoff: 0s, 2s, 8s
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, attempt * attempt * 2000));
          try {
            const res = await fetch(cfg.webhookUrl, {
              method: 'POST', mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            if (res.status >= 500 || res.status === 429) continue;
            ok = res.ok;
            if (!ok) break; // 4xx — don't retry
          } catch (err) {
            console.warn('[KANAAN booking] attempt', attempt + 1, 'failed:', err);
          }
        }
        if (!ok) {
          // Queue for retry on next page load (kanaan_lead_queue)
          try {
            const queue = JSON.parse(localStorage.getItem('kanaan_lead_queue') || '[]');
            queue.push({ payload: data, queuedAt: Date.now(), attempts: 3 });
            localStorage.setItem('kanaan_lead_queue', JSON.stringify(queue));
            console.warn('[KANAAN booking] all retries failed — queued for next page load');
            ok = true; // user shouldn't see failure; we promised confirmation
          } catch (e) { /* localStorage blocked */ }
        }
      } else {
        console.info('[KANAAN booking] no webhookUrl configured — payload:', data);
        ok = true; // demo mode
      }

      // Always redirect to thank-you so the user has a clear confirmation
      const params = new URLSearchParams({
        branch: data.branch || '',
        service: data.service || '',
        date: data.date || '',
        time: data.time || '',
        id: data.bookingId
      });
      const dest = cfg.confirmRedirect || 'thank-you.html';
      const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
      const path = isAr ? '../' + dest : dest;
      window.location.href = `${path}?${params.toString()}`;
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
  async function submitGenericForm(form, type) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '…'; }

    // Detect file inputs — if any, we POST as multipart/form-data instead of JSON
    const hasFiles = !!form.querySelector('input[type="file"]');
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

    const cfg = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.booking) || {};
    const url = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.forms && window.KANAAN_CONFIG.forms[type]) || cfg.webhookUrl;

    let ok = false;
    if (url) {
      try {
        let res;
        if (hasFiles) {
          // multipart — let browser set boundary; append our metadata as fields
          Object.entries(dataObj).forEach(([k, v]) => formData.append(k, v));
          res = await fetch(url, { method: 'POST', mode: 'cors', body: formData });
        } else {
          res = await fetch(url, {
            method: 'POST', mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataObj)
          });
        }
        ok = res.ok;
      } catch (e) { console.warn('[KANAAN form] webhook failed', e); }
    } else {
      console.info('[KANAAN form] no webhook configured — payload:', dataObj, hasFiles ? '(with file upload — would be multipart)' : '');
      ok = true;
    }
    var data = dataObj;

    // Visual confirmation
    const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
    if (submitBtn) {
      submitBtn.textContent = ok ? (isAr ? 'تم الإرسال ✓' : 'Sent ✓') : (isAr ? 'فشل — حاول مرة أخرى' : 'Failed — try again');
      submitBtn.disabled = !ok;
      if (ok) {
        form.querySelectorAll('input, textarea, select').forEach(el => { if (el.type !== 'hidden' && el.type !== 'submit') el.value = ''; });
        // Reset button to original label after 4s so the form is re-usable
        setTimeout(() => {
          if (submitBtn && submitBtn.textContent.includes('✓')) {
            submitBtn.textContent = originalLabel;
            submitBtn.disabled = false;
          }
        }, 4000);
      }
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
    const m = location.pathname.match(/\/branches\/([^/]+)\.html$/);
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

  // -------- Mobile sticky FAB on long pages --------
  (function mobileFab() {
    if (document.querySelector('.fab-book')) return;
    if (!/\/(services|branches|blog)\//.test(location.pathname) &&
        !/(services|branches|blog|gallery|about)\.html$/.test(location.pathname)) return;
    const fab = document.createElement('a');
    fab.href = 'book.html';
    fab.className = 'fab-book';
    fab.setAttribute('data-track', 'fab_book_click');
    fab.textContent = document.body.classList.contains('lang-ar') ? 'احجز' : 'Book';
    document.body.appendChild(fab);
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      fab.classList.toggle('fab-book--visible', y > 600 && y > lastY - 50);
      lastY = y;
    }, { passive: true });
  })();

  // -------- Confetti on booking success --------
  function confetti() {
    const colors = ['#C8A04A', '#EDEAE3', '#8E6A2A'];
    for (let i = 0; i < 60; i++) {
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
  if (location.pathname.endsWith('thank-you.html')) {
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

  // Gallery lightbox (lightweight)
  const lightbox = document.querySelector('[data-lightbox]');
  if (lightbox) {
    const img = lightbox.querySelector('img');
    const close = () => { lightbox.classList.remove('is-open'); };
    document.querySelectorAll('[data-lightbox-trigger]').forEach(t => {
      t.addEventListener('click', e => {
        e.preventDefault();
        const src = t.getAttribute('href') || t.querySelector('img')?.src;
        if (!src) return;
        img.src = src;
        lightbox.classList.add('is-open');
      });
    });
    lightbox.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
})();
