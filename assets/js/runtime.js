/* ============================================================
   KANAAN — Runtime content loader
   Reads content/site.json + offers.json + branches.json +
   testimonials.json and injects content into pages on load.

   Use these attributes in HTML:
     data-bind="path.to.field"          — replaces innerText
     data-bind-html="path.to.field"     — replaces innerHTML
     data-bind-attr-href="path"         — replaces an attribute
     data-bind-attr-src="path"          — replaces src
     data-bind-list="offers"            — repeats child template
     data-bind-template                 — marks the template node
   ============================================================ */
(function () {
  'use strict';

  const isAr = document.documentElement.lang === 'ar' || document.body.classList.contains('lang-ar');
  const lang = isAr ? 'ar' : 'en';

  // Arabic-Indic numeral converter for prices when in AR
  const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  function toArDigits(str) {
    return String(str).replace(/[0-9]/g, d => AR_DIGITS[+d]);
  }

  // Resolve "path.to.field" against an object, with bilingual suffix support.
  // If path is "name", returns name_en or name_ar based on lang.
  function get(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      // Try _en/_ar suffix first, fall back to plain key
      const langKey = p + '_' + lang;
      if (langKey in cur) cur = cur[langKey];
      else if (p in cur) cur = cur[p];
      else return undefined;
    }
    return cur;
  }

  function pathPrefix() {
    // /content/foo.json relative to current page
    const depth = location.pathname.replace(/^\/+/, '').split('/').length - 1;
    return depth === 0 ? '' : '../'.repeat(depth);
  }

  async function loadJSON(file) {
    try {
      const r = await fetch(pathPrefix() + 'content/' + file, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.statusText);
      return await r.json();
    } catch (e) {
      console.warn('[KANAAN runtime] failed to load', file, e);
      return null;
    }
  }

  function applyBindings(root, ctx) {
    // Plain text bindings
    root.querySelectorAll('[data-bind]').forEach(el => {
      const v = get(ctx, el.dataset.bind);
      if (v != null) el.textContent = v;
    });
    // HTML bindings (use sparingly — never with user input)
    root.querySelectorAll('[data-bind-html]').forEach(el => {
      const v = get(ctx, el.dataset.bindHtml);
      if (v != null) el.innerHTML = v;
    });
    // Attribute bindings — collect all data-bind-attr-* on each element
    root.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        const m = attr.name.match(/^data-bind-attr-(.+)$/);
        if (!m) return;
        const v = get(ctx, attr.value);
        if (v != null) el.setAttribute(m[1], v);
      });
    });
  }

  // List rendering — repeats a [data-bind-template] child for each item in an array.
  function renderList(rootEl, items, ctxKey) {
    const tpl = rootEl.querySelector('[data-bind-template]');
    if (!tpl) return;
    const tplHTML = tpl.outerHTML.replace(/\s*data-bind-template(="[^"]*")?\s*/, ' ');
    tpl.remove();
    items.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = tplHTML;
      const node = wrapper.firstElementChild;
      applyBindings(node, item);
      // Conditional show/hide (data-show-if="field" — hide if falsy)
      node.querySelectorAll('[data-show-if]').forEach(el => {
        if (!get(item, el.dataset.showIf)) el.style.display = 'none';
      });
      rootEl.appendChild(node);
    });
  }

  // Date range filter for offers (limited_time + valid_from/valid_to)
  function offerIsActive(o) {
    if (o.active === false) return false;
    if (!o.limited_time) return true;
    const now = new Date();
    if (o.valid_from && new Date(o.valid_from) > now) return false;
    if (o.valid_to && new Date(o.valid_to + 'T23:59:59') < now) return false;
    return true;
  }

  // ============================================================
  // BOOTSTRAP — load all data, then bind page-specific blocks.
  // ============================================================
  async function init() {
    const [site, offers, branches, testimonials] = await Promise.all([
      loadJSON('site.json'),
      loadJSON('offers.json'),
      loadJSON('branches.json'),
      loadJSON('testimonials.json')
    ]);

    // Stash on window for ad-hoc access
    window.KANAAN_DATA = { site, offers, branches, testimonials };

    // Site-wide bindings (footer, header, contact links etc.)
    if (site) applyBindings(document, site);

    // Offers list — typically on /offers.html and homepage featured strip
    const offersList = document.querySelector('[data-bind-list="offers"]');
    if (offersList && offers) {
      const params = new URLSearchParams(location.search);
      const branchFilter = params.get('branch');
      let visible = offers.offers.filter(offerIsActive);
      if (branchFilter) {
        visible = visible.filter(o => (o.branches || []).includes('all') || (o.branches || []).includes(branchFilter));
      }
      // Apply bilingual transform: replace _en / _ar fields with current-lang plain keys
      const localized = visible.map(o => ({
        ...o,
        name: o['name_' + lang] || o.name_en,
        badge: o['badge_' + lang] || o.badge_en,
        inclusions_html: ((o['inclusions_' + lang] || o.inclusions_en) || []).map(i => `<li>${i}</li>`).join(''),
        book_url: pathPrefix() + 'book.html?offer=' + encodeURIComponent(o.id),
        currency: o.currency || 'AED',
        // Arabic-Indic digits for AR prices
        price: isAr ? toArDigits(o.price) : o.price,
        tags_csv: (o.tags || []).join(',')
      }));
      renderList(offersList, localized, 'offer');
    }

    // Branches list — typically /branches.html
    const branchesList = document.querySelector('[data-bind-list="branches"]');
    if (branchesList && branches) {
      const visible = branches.branches.filter(b => b.active !== false);
      const localized = visible.map(b => ({
        ...b,
        name: b['name_' + lang] || b.name_en,
        area: b['area_' + lang] || b.area_en,
        view_url: pathPrefix() + (lang === 'ar' ? 'ar/branches/' : 'branches/') + b.id + '.html',
        wa_url: 'https://wa.me/' + b.whatsapp,
        tel_url: 'tel:' + b.phone,
        // Lowercase type so filter chips (data-tags) match data-filter-chip values
        type: (b.type || 'standard').toLowerCase(),
        // hours JSON for the status pill ({open,close} per day)
        hours_json: JSON.stringify(Object.fromEntries(Object.entries(b.hours || {}).map(([k, v]) => {
          if (!v || v.toLowerCase() === 'closed') return [k, null];
          const [open, close] = v.split('-');
          return [k, { open, close }];
        })))
      }));
      renderList(branchesList, localized, 'branch');
    }

    // Testimonials list
    const testList = document.querySelector('[data-bind-list="testimonials"]');
    if (testList && testimonials) {
      const visible = testimonials.testimonials.filter(t => t.active !== false);
      const localized = visible.map(t => ({
        ...t,
        quote: t['quote_' + lang] || t.quote_en
      }));
      renderList(testList, localized, 'testimonial');
    }

    // Notify any code that wants to react to data being ready
    document.dispatchEvent(new CustomEvent('kanaan:data-ready', { detail: window.KANAAN_DATA }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
