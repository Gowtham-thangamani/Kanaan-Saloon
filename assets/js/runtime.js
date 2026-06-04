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

  /* Per-page override: if the current path has a row in public.pages, swap
     the [data-page-body] region with the DB body_html. The check is keyed by
     normalised path ("services/hair-beard", "about", "branches/al-ain" — no
     leading slash, no .html, no trailing slash). Missing row -> page stays
     as the bundled HTML, so this is fully additive and safe. */
  function currentPagePath() {
    let p = (location.pathname || '/').replace(/^\/+/, '').replace(/\/+$/, '');
    p = p.replace(/\.html$/i, '');
    if (p === '' || p === 'index') return 'index';
    return p;
  }
  async function applyPageOverride() {
    const target = document.querySelector('[data-page-body]');
    if (!target) return;
    const cfg = window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase;
    if (!cfg || !cfg.url || !cfg.anonKey) return;
    const path = currentPagePath();
    try {
      const r = await fetch(
        cfg.url + '/rest/v1/pages?select=body_html,title,meta_description&path=eq.' + encodeURIComponent(path),
        { headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey } }
      );
      if (!r.ok) return;
      const rows = await r.json();
      if (!rows || !rows[0]) return;
      const page = rows[0];
      if (page.body_html) target.innerHTML = page.body_html;
      if (page.title) document.title = page.title;
      if (page.meta_description) {
        let m = document.querySelector('meta[name="description"]');
        if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
        m.setAttribute('content', page.meta_description);
      }
    } catch (e) { /* fall through to hard-coded HTML */ }
  }

  /* Per-post SEO + social + JSON-LD update for the blog single-post page.
     Reads the CMS fields (meta_title, meta_description, focus_keyword,
     canonical_url, og_*, schema_type, noindex) and falls back gracefully
     to title / excerpt / hero_image / /blog/<slug> when a field is empty.
     Creates missing <meta>/<link>/<script> tags so the static template
     doesn't need to predeclare every one of them. */
  function applyBlogPostSeo(post) {
    if (!post) return;
    const siteOrigin = 'https://kanaanspa.ae';
    const slug = post.slug || post.id || '';
    const url = post.canonical_url || (siteOrigin + '/blog/' + slug);
    const title       = (post.meta_title || post.title || '').trim();
    const description = (post.meta_description || post.excerpt || post.lede || '').replace(/\s+/g, ' ').trim().slice(0, 320);
    const ogTitle     = (post.og_title || post.meta_title || post.title || '').trim();
    const ogDesc      = (post.og_description || post.meta_description || post.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 320);
    const ogImage     = post.og_image || post.hero_image || (siteOrigin + '/assets/img/og-default.svg');
    const fullOgImage = /^https?:\/\//i.test(ogImage) ? ogImage : (siteOrigin + (ogImage.startsWith('/') ? '' : '/') + ogImage);
    const ogImageAlt  = post.og_image_alt || post.hero_alt || title;
    const schemaType  = post.schema_type || 'BlogPosting';
    const tags        = Array.isArray(post.tags) ? post.tags
                       : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    const keywords    = (tags.length ? tags.join(', ') : (post.focus_keyword || '')) || undefined;

    if (title) document.title = title + (/\| Kanaan/i.test(title) ? '' : ' | Kanaan Blog');

    function ensureMeta(attr, key, value) {
      if (!value) return;
      let m = document.querySelector('meta[' + attr + '="' + key + '"]');
      if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
      m.setAttribute('content', value);
    }
    function ensureLink(rel, href, extraAttrs) {
      if (!href) return;
      let l = document.querySelector('link[rel="' + rel + '"]' + (extraAttrs && extraAttrs.hreflang ? '[hreflang="' + extraAttrs.hreflang + '"]' : ''));
      if (!l) { l = document.createElement('link'); l.setAttribute('rel', rel); document.head.appendChild(l); }
      l.setAttribute('href', href);
      if (extraAttrs) Object.keys(extraAttrs).forEach(k => l.setAttribute(k, extraAttrs[k]));
    }

    ensureMeta('name', 'description', description);
    ensureMeta('name', 'robots', post.noindex ? 'noindex,nofollow' : 'index,follow');
    ensureLink('canonical', url);
    // hreflang self-reference + x-default — gives Google the canonical language
    ensureLink('alternate', url, { hreflang: 'en' });
    ensureLink('alternate', url, { hreflang: 'x-default' });

    ensureMeta('property', 'og:type',        'article');
    ensureMeta('property', 'og:title',       ogTitle);
    ensureMeta('property', 'og:description', ogDesc);
    ensureMeta('property', 'og:url',         url);
    ensureMeta('property', 'og:image',       fullOgImage);
    ensureMeta('property', 'og:image:alt',   ogImageAlt);
    if (post.og_image_width)  ensureMeta('property', 'og:image:width',  String(post.og_image_width));
    if (post.og_image_height) ensureMeta('property', 'og:image:height', String(post.og_image_height));
    ensureMeta('property', 'og:site_name',   'Kanaan Gents Salon & Spa');
    if (post.publish_date) ensureMeta('property', 'article:published_time', post.publish_date);
    if (post.updated_at)   ensureMeta('property', 'article:modified_time',  post.updated_at);
    if (post.author)       ensureMeta('property', 'article:author',         post.author);
    if (post.category)     ensureMeta('property', 'article:section',        post.category);
    tags.forEach(t => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'article:tag');
      m.setAttribute('content', t);
      document.head.appendChild(m);
    });

    ensureMeta('name', 'twitter:card',        'summary_large_image');
    ensureMeta('name', 'twitter:title',       ogTitle);
    ensureMeta('name', 'twitter:description', ogDesc);
    ensureMeta('name', 'twitter:image',       fullOgImage);
    ensureMeta('name', 'twitter:image:alt',   ogImageAlt);

    // Compute word count + dynamic reading time from the rendered body so the
    // Article schema declares an accurate wordCount even if the editor forgot it.
    const bodyEl = document.querySelector('[data-blog-body]');
    const bodyText = bodyEl ? (bodyEl.textContent || '') : '';
    const words = (bodyText.match(/[A-Za-z؀-ۿ][A-Za-z0-9؀-ۿ'\-]*/g) || []).length;
    const readingTime = post.read_minutes || (words ? Math.max(1, Math.round(words / 220)) : undefined);

    // Build a full ImageObject so Google can verify the OG image dimensions.
    const imageObj = {
      '@type': 'ImageObject',
      'url':   fullOgImage,
      'contentUrl': fullOgImage
    };
    if (post.og_image_width)  imageObj.width  = Number(post.og_image_width);
    if (post.og_image_height) imageObj.height = Number(post.og_image_height);
    if (ogImageAlt) imageObj.caption = ogImageAlt;

    // === JSON-LD #1 — Article ===
    const articleLd = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      'headline': post.title || title,
      'name': post.title || title,
      'description': description,
      'image': imageObj,
      'author': { '@type': 'Person', 'name': post.author || 'Kanaan Editorial' },
      'publisher': {
        '@type': 'Organization',
        'name': 'Kanaan Gents Salon & Spa',
        'logo': { '@type': 'ImageObject', 'url': siteOrigin + '/assets/img/logo.svg' }
      },
      'datePublished': post.publish_date || null,
      'dateModified':  post.updated_at  || post.publish_date || null,
      'mainEntityOfPage': { '@type': 'WebPage', '@id': url },
      'articleSection': post.category || undefined,
      'keywords': keywords,
      'inLanguage': 'en',
      'wordCount': words || undefined,
      'timeRequired': readingTime ? ('PT' + readingTime + 'M') : undefined
    };
    function setJsonLd(marker, payload) {
      let el = document.querySelector('script[type="application/ld+json"][' + marker + ']');
      if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.setAttribute(marker, '');
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(payload, (_, v) => v == null ? undefined : v);
    }
    setJsonLd('data-blog-jsonld', articleLd);

    // === JSON-LD #2 — Breadcrumb ===
    setJsonLd('data-blog-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteOrigin + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': siteOrigin + '/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': post.title || title, 'item': url }
      ]
    });

    // === JSON-LD #3 — Speakable (voice search / Siri / Alexa) ===
    setJsonLd('data-blog-speakable', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': post.title || title,
      'speakable': {
        '@type': 'SpeakableSpecification',
        'cssSelector': ['[data-blog-title]', '[data-blog-lede]', '[data-blog-tldr]']
      }
    });

    // === Auto-IDs on H2/H3 + Table of Contents on long posts ===
    if (bodyEl) {
      const headings = bodyEl.querySelectorAll('h2, h3');
      const seen = new Set();
      function slugify(s) {
        return (s || '').toLowerCase()
          .replace(/[^\w\s\-؀-ۿ]/g, '')
          .trim().replace(/\s+/g, '-').slice(0, 60);
      }
      const tocItems = [];
      headings.forEach(h => {
        if (!h.id) {
          let base = slugify(h.textContent || h.innerText || 'section');
          let cand = base, i = 1;
          while (seen.has(cand) || document.getElementById(cand)) { cand = base + '-' + (++i); }
          h.id = cand;
        }
        seen.add(h.id);
        if (h.tagName === 'H2') tocItems.push({ id: h.id, text: (h.textContent || '').trim() });
      });
      // Inject a Table of Contents above the body when 3+ H2s exist.
      if (tocItems.length >= 3 && !document.querySelector('[data-blog-toc]')) {
        const toc = document.createElement('nav');
        toc.setAttribute('aria-label', 'Table of contents');
        toc.setAttribute('data-blog-toc', '');
        toc.style.cssText = 'margin: 0 0 32px; padding: 20px 24px; background: rgba(200,160,74,0.06); border-left: 3px solid var(--c-gold, #C8A04A);';
        toc.innerHTML = '<p style="margin:0 0 10px; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color: var(--c-stone, #6b6b6b);">In this post</p>'
          + '<ol style="margin:0; padding-left: 18px; line-height:1.7; font-size:14px;">'
          + tocItems.map(t => '<li><a href="#' + t.id + '" style="color: inherit; text-decoration: none; border-bottom: 1px solid transparent;">' + (t.text || 'Section') + '</a></li>').join('')
          + '</ol>';
        bodyEl.insertBefore(toc, bodyEl.firstChild);
      }
    }
  }

  /* Branch detail live-bind. Static HTML for each branch was generated at build
     time from content/branches.json. Admin edits go to Supabase but were
     never reaching these pages. This function bridges the gap by patching
     phone, WhatsApp, working hours, maps, and JSON-LD on page load.
     Safe to call on any page — short-circuits when not a branch detail page. */
  function applyBranchDetail(branches) {
    if (!branches || !Array.isArray(branches.branches)) return;
    const m = location.pathname.match(/\/(?:ar\/)?branches\/([a-z0-9-]+?)(?:\.html)?\/?$/i);
    const slug = m && m[1];
    if (!slug) return;
    const b = branches.branches.find(br => br.id === slug);
    if (!b) return;

    const tel     = b.phone || '';
    const wa      = b.whatsapp || '';
    const address = b['address_' + lang] || b.address_en || '';

    /* Phone links — utility-bar + contact section. Update href universally.
       Update visible text only if it's recognisably a phone string (preserves
       icon prefixes like ☏). */
    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
      if (tel) a.href = 'tel:' + tel;
      const txt = (a.textContent || '').trim();
      if (tel && (/^[+\d\s☇-]+$/.test(txt) || a.dataset.track === 'call_click')) {
        const lead = txt.match(/^[^+\d]+/);
        a.textContent = (lead ? lead[0] : '') + tel;
      }
    });

    /* WhatsApp links. Skip pre-filled share links (wa.me/?text=...) — those
       are "share this page" buttons, not the branch contact. */
    document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
      if (!wa) return;
      const href = a.getAttribute('href') || '';
      if (href.includes('wa.me/?text=')) return;
      a.href = 'https://wa.me/' + wa;
    });

    /* Status-pill data-hours JSON (drives the "Open now / Closed" badge).
       main.js reads this attribute on the `branches:rendered` event. */
    const pill = document.querySelector('.status-pill[data-hours]');
    if (pill && b.hours) {
      const hoursJson = Object.fromEntries(Object.entries(b.hours).map(([k, v]) => {
        if (!v || String(v).toLowerCase() === 'closed') return [k, null];
        const parts = String(v).split('-');
        return [k, { open: (parts[0] || '').trim(), close: (parts[1] || '').trim() }];
      }));
      pill.setAttribute('data-hours', JSON.stringify(hoursJson));
    }

    /* Working hours table. The static HTML has an <h3>Working hours</h3>
       followed by a <div> with seven day rows. We rewrite that div in place.
       Stored format is 24h ("09:00-23:00"); we display 12h ("9:00 AM — 11:00 PM"
       in EN, "٩:٠٠ ص — ١١:٠٠ م" in AR) regardless of how the admin saved it. */
    if (b.hours) {
      const dayLabels = isAr
        ? { sat:'السبت', sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة' }
        : { sat:'Sat', sun:'Sun', mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri' };
      const order = ['sat','sun','mon','tue','wed','thu','fri'];
      const closedLabel = isAr ? 'مغلق' : 'Closed';
      const arDigit = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' };
      function to12h(raw) {
        if (!raw) return '';
        const s = String(raw).trim();
        // Already 12h? Normalise.
        const m12 = s.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
        let h, mm, period;
        if (m12) {
          h = parseInt(m12[1], 10); mm = m12[2] || '00';
          period = /p/i.test(m12[3]) ? 'PM' : 'AM';
        } else {
          const m24 = s.match(/^\s*(\d{1,2}):(\d{2})/);
          if (!m24) return s;
          h = parseInt(m24[1], 10); mm = m24[2];
          period = h >= 12 ? 'PM' : 'AM';
          h = h % 12; if (h === 0) h = 12;
        }
        let out = h + ':' + mm + ' ' + period;
        if (isAr) {
          out = out.replace(/AM/, 'ص').replace(/PM/, 'م').replace(/[0-9]/g, d => arDigit[d]);
        }
        return out;
      }
      const rowsHtml = order.map(d => {
        const v = b.hours[d];
        let display;
        if (!v || String(v).toLowerCase() === 'closed') {
          display = closedLabel;
        } else {
          const parts = String(v).split('-');
          display = to12h(parts[0]) + ' — ' + to12h(parts[1] || '');
        }
        return '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--hairline); font-size:14px;">'
             +   '<span class="muted">' + dayLabels[d] + '</span>'
             +   '<span>' + display + '</span>'
             + '</div>';
      }).join('');
      document.querySelectorAll('h3').forEach(h3 => {
        if (/working hours|ساعات العمل/i.test(h3.textContent || '')) {
          const next = h3.nextElementSibling;
          if (next && next.tagName === 'DIV') next.innerHTML = rowsHtml;
        }
      });
    }

    /* Maps iframe — rebuild src from maps_query (coords or place query). */
    if (b.maps_query) {
      const q = encodeURIComponent(b.maps_query);
      document.querySelectorAll('iframe[src*="google.com/maps"]').forEach(iframe => {
        iframe.src = 'https://www.google.com/maps?q=' + q + '&output=embed';
      });
    }

    /* JSON-LD updates: telephone, geo, address.streetAddress, openingHoursSpecification.
       Only touch the LocalBusiness/HairSalon block — leave BreadcrumbList/FAQPage alone. */
    const dayMapJsonld = { sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday' };
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      let data;
      try { data = JSON.parse(s.textContent || '{}'); } catch (e) { return; }
      if (!data || typeof data !== 'object') return;
      const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
      const isBusiness = types.some(t => t === 'LocalBusiness' || t === 'HairSalon' || t === 'BeautySalon');
      if (!isBusiness) return;
      if (tel) data.telephone = tel.startsWith('+') ? tel : ('+' + tel);
      if (address) {
        data.address = data.address || { '@type': 'PostalAddress' };
        data.address.streetAddress = address;
      }
      if (b.lat != null && b.lng != null) {
        data.geo = { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng };
      }
      if (b.hours) {
        data.openingHoursSpecification = Object.entries(b.hours)
          .filter(([_, v]) => v && String(v).toLowerCase() !== 'closed' && String(v).includes('-'))
          .map(([d, v]) => {
            const [opens, closes] = String(v).split('-').map(x => x.trim());
            return { '@type': 'OpeningHoursSpecification', dayOfWeek: dayMapJsonld[d], opens, closes };
          });
      }
      s.textContent = JSON.stringify(data, null, 2);
    });

    /* === Per-branch SEO + social + JSON-LD enrichment ===
       Mirrors applyBlogPostSeo: the admin can override meta title / description /
       canonical / OG image, set a noindex flag, and pin a focus keyword without
       editing any HTML. Falls back to the static <title> / branch.image / built
       canonical when fields are empty. Also injects a Breadcrumb + Speakable
       JSON-LD per branch page. */
    (function applyBranchSeo() {
      const siteOrigin = 'https://kanaanspa.ae';
      const isAr = (document.documentElement.lang || '').toLowerCase().startsWith('ar') ||
                   document.body.classList.contains('lang-ar');
      const langPrefix = isAr ? '/ar' : '';
      const url = b.seo_canonical || (siteOrigin + langPrefix + '/branches/' + b.id);
      const branchNameStr = (b['name_' + lang] || b.name_en || '').trim();
      const branchAreaStr = (b['area_' + lang] || b.area_en || '').trim();
      const defaultTitle = 'Kanaan ' + branchNameStr + (branchAreaStr ? ' | ' + branchAreaStr : '');
      const title = (b.seo_meta_title || defaultTitle).trim();
      const description = (b.seo_meta_description || b['address_' + lang] || b.address_en || '').replace(/\s+/g, ' ').trim().slice(0, 320);
      const ogTitle = (b.seo_og_title || b.seo_meta_title || title).trim();
      const ogDesc  = (b.seo_og_description || b.seo_meta_description || description).replace(/\s+/g, ' ').trim().slice(0, 320);
      const ogImageRaw = b.seo_og_image || b.image || (siteOrigin + '/assets/img/og-default.svg');
      const fullOg = /^https?:\/\//i.test(ogImageRaw) ? ogImageRaw
                    : siteOrigin + (ogImageRaw.startsWith('/') ? '' : '/') + ogImageRaw;

      function ensureMeta(attr, key, value) {
        if (!value) return;
        let m = document.querySelector('meta[' + attr + '="' + key + '"]');
        if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
        m.setAttribute('content', value);
      }
      function ensureLink(rel, href, extraAttrs) {
        if (!href) return;
        let l = document.querySelector('link[rel="' + rel + '"]' + (extraAttrs && extraAttrs.hreflang ? '[hreflang="' + extraAttrs.hreflang + '"]' : ''));
        if (!l) { l = document.createElement('link'); l.setAttribute('rel', rel); document.head.appendChild(l); }
        l.setAttribute('href', href);
        if (extraAttrs) Object.keys(extraAttrs).forEach(k => l.setAttribute(k, extraAttrs[k]));
      }
      function setJsonLd(marker, payload) {
        let el = document.querySelector('script[type="application/ld+json"][' + marker + ']');
        if (!el) {
          el = document.createElement('script');
          el.type = 'application/ld+json';
          el.setAttribute(marker, '');
          document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(payload, (_, v) => v == null ? undefined : v);
      }

      if (title) document.title = title + (/\| Kanaan/i.test(title) ? '' : ' | Kanaan');
      ensureMeta('name', 'description', description);
      ensureMeta('name', 'robots', b.seo_noindex ? 'noindex,nofollow' : 'index,follow');
      ensureLink('canonical', url);
      // hreflang pair — link the English and Arabic mirrors for the same branch.
      const otherUrl = siteOrigin + (isAr ? '' : '/ar') + '/branches/' + b.id;
      ensureLink('alternate', url, { hreflang: isAr ? 'ar' : 'en' });
      ensureLink('alternate', otherUrl, { hreflang: isAr ? 'en' : 'ar' });
      ensureLink('alternate', siteOrigin + '/branches/' + b.id, { hreflang: 'x-default' });

      ensureMeta('property', 'og:type',        'business.business');
      ensureMeta('property', 'og:title',       ogTitle);
      ensureMeta('property', 'og:description', ogDesc);
      ensureMeta('property', 'og:url',         url);
      ensureMeta('property', 'og:image',       fullOg);
      ensureMeta('property', 'og:locale',      isAr ? 'ar_AE' : 'en_US');
      ensureMeta('property', 'og:site_name',   'Kanaan Gents Salon & Spa');
      ensureMeta('name', 'twitter:card',        'summary_large_image');
      ensureMeta('name', 'twitter:title',       ogTitle);
      ensureMeta('name', 'twitter:description', ogDesc);
      ensureMeta('name', 'twitter:image',       fullOg);

      // Breadcrumb JSON-LD per branch page.
      setJsonLd('data-branch-breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': isAr ? 'الرئيسية' : 'Home',     'item': siteOrigin + langPrefix + '/' },
          { '@type': 'ListItem', 'position': 2, 'name': isAr ? 'الفروع'  : 'Branches', 'item': siteOrigin + langPrefix + '/branches' },
          { '@type': 'ListItem', 'position': 3, 'name': 'Kanaan ' + branchNameStr,     'item': url }
        ]
      });
      // Speakable for voice assistants.
      setJsonLd('data-branch-speakable', {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': 'Kanaan ' + branchNameStr,
        'speakable': {
          '@type': 'SpeakableSpecification',
          'cssSelector': ['.page-hero__title', '.lede', '[data-bind="address"]']
        }
      });
    })();

    /* Re-run the "Open now / Closed" pill check on the freshly-updated data-hours. */
    document.dispatchEvent(new CustomEvent('branches:rendered'));
  }

  // ============================================================
  // BOOTSTRAP — load all data, then bind page-specific blocks.
  // ============================================================
  async function init() {
    // Fire-and-forget page override; doesn't block the rest of init.
    applyPageOverride();

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

    // Branch detail page — when the URL is /branches/<slug>.html (EN) or
    // /ar/branches/<slug>.html (AR), live-bind the branch's editable fields
    // (phone, WhatsApp, working hours, maps, JSON-LD) from Supabase so that
    // admin edits in /admin/branches reach the page without a redeploy.
    // The branch HTML stays static — this function patches the DOM in place.
    applyBranchDetail(branches);

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
        // Update document title + every SEO/social/JSON-LD signal so an
        // admin can fully control how the post appears in search results
        // and social shares without anyone touching the HTML file.
        applyBlogPostSeo(post);
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
