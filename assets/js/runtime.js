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

  /* Try Supabase's content_sections table first, fall back to the JSON file.
     Each admin-managed section (offers, branches, testimonials, site, banners)
     lives as one JSONB row keyed by its name. Public read; admin write.
     Returns the same shape as loadJSON(file). */
  async function loadSection(key, jsonFile) {
    const cfg = window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase;
    if (cfg && cfg.url && cfg.anonKey) {
      try {
        const r = await fetch(
          cfg.url + '/rest/v1/content_sections?select=data&key=eq.' + encodeURIComponent(key),
          { headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey } }
        );
        if (r.ok) {
          const rows = await r.json();
          if (rows && rows[0] && rows[0].data) return rows[0].data;
          // Empty row OR no row — fall through to JSON file (admin hasn't saved yet).
        }
      } catch (e) {
        console.warn('[KANAAN runtime] section', key, 'Supabase fetch failed, falling back to JSON', e);
      }
    }
    return await loadJSON(jsonFile);
  }

  /* Blog posts live in Supabase (admin-managed via /admin/blog.html).
     Read with the anon key — RLS policy "public read published" restricts
     anon SELECTs to rows where active = true, so drafts stay hidden.
     Falls back to content/blog.json on any network/config failure. */
  async function loadBlogPosts() {
    const cfg = window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase;
    if (cfg && cfg.url && cfg.anonKey) {
      try {
        const r = await fetch(
          cfg.url + '/rest/v1/blog_posts?select=*&active=eq.true&order=publish_date.desc.nullslast,created_at.desc',
          { headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey } }
        );
        if (r.ok) {
          const rows = await r.json();
          if (Array.isArray(rows)) return { posts: rows };
        }
        throw new Error('HTTP ' + r.status);
      } catch (e) {
        console.warn('[KANAAN runtime] blog Supabase fetch failed, falling back to JSON', e);
      }
    }
    return await loadJSON('blog.json');
  }

  function applyBindings(root, ctx) {
    // Walk both the root element and its descendants so bindings on a list
    // template's *root* element (e.g. `<a data-bind-attr-href="book_url">`) are
    // honoured — `querySelectorAll('*')` skips the root itself.
    const all = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : Array.from(root.querySelectorAll('*'));

    // Plain text bindings
    all.forEach(el => {
      if (el.hasAttribute && el.hasAttribute('data-bind')) {
        const v = get(ctx, el.getAttribute('data-bind'));
        if (v != null) el.textContent = v;
      }
    });
    // HTML bindings (use sparingly — never with user input)
    all.forEach(el => {
      if (el.hasAttribute && el.hasAttribute('data-bind-html')) {
        const v = get(ctx, el.getAttribute('data-bind-html'));
        if (v != null) el.innerHTML = v;
      }
    });
    // Attribute bindings — collect all data-bind-attr-* on each element
    all.forEach(el => {
      if (!el.attributes) return;
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
    const [site, offers, branches, testimonials, blog] = await Promise.all([
      loadSection('site', 'site.json'),
      loadSection('offers', 'offers.json'),
      loadSection('branches', 'branches.json'),
      loadSection('testimonials', 'testimonials.json'),
      loadBlogPosts()
    ]);

    // Stash on window for ad-hoc access
    window.KANAAN_DATA = { site, offers, branches, testimonials, blog };

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
        book_url: pathPrefix() + 'book?offer=' + encodeURIComponent(o.id),
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
        view_url: pathPrefix() + (lang === 'ar' ? 'ar/branches/' : 'branches/') + b.id + '',
        book_url: pathPrefix() + (lang === 'ar' ? 'ar/book?branch=' : 'book?branch=') + b.id,
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
      // Notify main.js so it can run the Open/Closed status check on the
      // newly-added cards. Without this, the `data-hours` attribute is set
      // after main.js already finished its one-time scan, so the pills stay
      // stuck on "Checking…".
      document.dispatchEvent(new CustomEvent('branches:rendered'));
    }

    // Blog posts — /blog.html index lists every active post
    const postsList = document.querySelector('[data-bind-list="posts"]');
    if (postsList && blog && Array.isArray(blog.posts)) {
      const visible = blog.posts
        .filter(p => p.active !== false)
        .sort((a, b) => (b.publish_date || '').localeCompare(a.publish_date || ''));
      const localized = visible.map(p => ({
        ...p,
        view_url: pathPrefix() + (lang === 'ar' ? 'ar/blog/' : 'blog/') + p.slug,
        meta_line: (p.category || '') + (p.read_minutes ? ' · ' + p.read_minutes + ' min read' : '')
      }));
      renderList(postsList, localized, 'post');
    }

    // Single blog post — when the page has any [data-blog-*] markers, look the
    // post up in blog.json by URL slug and fill the markers. This lets admin
    // edits to title / hero / lede / tldr / body reach the live page after
    // re-uploading blog.json, without anyone touching the HTML file.
    if (blog && Array.isArray(blog.posts) &&
        document.querySelector('[data-blog-body],[data-blog-title],[data-blog-hero],[data-blog-lede],[data-blog-tldr],[data-blog-meta]')) {
      const m = location.pathname.match(/\/blog\/([^/]+?)(?:\.html)?\/?$/);
      const slug = m && m[1];
      const post = slug && blog.posts.find(p => p.slug === slug || p.id === slug);
      if (post) {
        const setText = (sel, val) => {
          document.querySelectorAll(sel).forEach(el => { if (val != null) el.textContent = val; });
        };
        const setHTML = (sel, val) => {
          document.querySelectorAll(sel).forEach(el => { if (val != null) el.innerHTML = val; });
        };
        setText('[data-blog-title]', post.title);
        setText('[data-blog-lede]', post.lede);
        setText('[data-blog-tldr]', post.tldr);
        setText('[data-blog-meta]',
          (post.category || '') + (post.read_minutes ? ' · ' + post.read_minutes + ' min read' : ''));
        setHTML('[data-blog-body]', post.body_html);
        document.querySelectorAll('[data-blog-hero]').forEach(el => {
          if (el.tagName === 'IMG' && post.hero_image) {
            el.src = post.hero_image;
            if (post.hero_alt) el.alt = post.hero_alt;
          }
        });
        // Reveal a hidden TL;DR block only if the post actually has one
        document.querySelectorAll('[data-blog-tldr-wrap]').forEach(el => {
          el.hidden = !post.tldr;
        });
        // Update document title + meta description so SEO + browser tab match
        if (post.title && /\/blog\/_post/.test(location.pathname) === false) {
          // Only override on a real post URL — leaves the static title intact
          // on the generic template when it's loaded raw (no slug)
        }
        if (post.title) document.title = post.title + ' | Kanaan Blog';
      }
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
