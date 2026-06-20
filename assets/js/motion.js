/* ============================================================
   KANAAN MOTION RUNTIME — v3
   - IntersectionObserver reveals (one-shot)
   - Stagger groups
   - Heading split lines
   - Parallax via requestAnimationFrame
   - Counter tweens
   No external dependencies. ~3KB. Idempotent.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('motion-ready');

  var revealCount = 0;

  // ---------- 1. IntersectionObserver reveals + stagger ----------
  // Lower threshold + bottom rootMargin so reveals fire as soon as ANY pixel enters viewport.
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('is-in');
      revealCount++;
      if (el.hasAttribute('data-count-to')) tweenCount(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 }) : null;

  function observe(el) { if (io) io.observe(el); else el.classList.add('is-in'); }

  // Apply stagger delays to each child of a group
  document.querySelectorAll('[data-reveal-stagger]').forEach(function (group) {
    var step = parseInt(group.dataset.staggerStep || '120', 10);
    var max = parseInt(group.dataset.staggerMax || '8', 10);
    [].slice.call(group.children).forEach(function (c, i) {
      c.style.transitionDelay = (Math.min(i, max) * step) + 'ms';
    });
    observe(group);
  });

  document.querySelectorAll('[data-reveal]').forEach(observe);
  document.querySelectorAll('[data-count-to]').forEach(observe);

  // Safety net — if anything is still hidden after 3s, force-reveal it.
  setTimeout(function () {
    document.querySelectorAll('[data-reveal]:not(.is-in), [data-reveal-stagger]:not(.is-in)').forEach(function (el) {
      el.classList.add('is-in');
    });
  }, 3000);

  // ---------- 2. Split heading lines ----------
  function splitLines(el) {
    if (el.dataset.splitDone === '1') return;
    // One animated line per <br>-separated segment, preserving inline markup
    // (coloured spans, translate="no", etc.). Reading textContent here would
    // drop the <br> breaks and strip those spans, then re-deriving lines by
    // offsetTop collapses RTL headings on top of each other — so instead we
    // walk the child nodes and keep each segment's HTML intact.
    var segments = [];
    var cur = '';
    [].slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'BR') {
        segments.push(cur);
        cur = '';
      } else if (node.nodeType === 1) {
        cur += node.outerHTML;
      } else if (node.nodeType === 3) {
        cur += node.textContent;
      }
    });
    segments.push(cur);
    segments = segments
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });
    if (!segments.length) return;
    el.innerHTML = segments.map(function (seg) {
      return '<span class="split-line"><span class="split-line__inner">' + seg + '</span></span>';
    }).join('');
    el.dataset.splitDone = '1';
    [].slice.call(el.querySelectorAll('.split-line__inner')).forEach(function (inner, i) {
      inner.style.transitionDelay = (i * 100) + 'ms';
    });
    observe(el);
  }
  if (!REDUCED) {
    document.querySelectorAll('[data-split="lines"]').forEach(splitLines);
  } else {
    document.querySelectorAll('[data-split="lines"]').forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---------- 3a. CSS background-attachment: fixed parallax (DESKTOP, all browsers) ----------
  // The bulletproof classic: pull the inner <img> src up to the wrapper as a fixed background.
  // Page scrolls → bg literally stays put → undeniable parallax with zero JS scroll loop.
  // Mobile Safari ignores `fixed` so we keep the rAF translate fallback below.
  var IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!REDUCED && !IS_TOUCH) {
    document.querySelectorAll('[data-parallax="bg"]').forEach(function (el) {
      var img = el.querySelector('img');
      if (!img) return;
      function applyBg() {
        var src = img.currentSrc || img.src;
        if (!src) return;
        el.style.backgroundImage = 'url("' + src + '")';
        el.style.backgroundAttachment = 'fixed';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center center';
        el.style.backgroundRepeat = 'no-repeat';
        img.style.opacity = '0';   // hide the real img; bg shows the same picture
        img.style.pointerEvents = 'none';
      }
      if (img.complete && img.naturalWidth) applyBg();
      else img.addEventListener('load', applyBg, { once: true });
    });
  }

  // ---------- 3b. JS rAF parallax (TEXT + mobile fallback for bg) ----------
  if (!REDUCED) {
    var pxNodes = [].slice.call(document.querySelectorAll('[data-parallax]')).filter(function (el) {
      // Skip bg targets on desktop (handled by 3a). Keep them on touch (3a skipped them).
      return !(el.dataset.parallax === 'bg' && !IS_TOUCH);
    }).map(function (el) {
      var target = el;
      var baseScale = 1;
      if (el.dataset.parallax === 'bg') {
        var inner = el.querySelector('img');
        if (inner) {
          target = inner;
          baseScale = 1.10; // slight zoom hides edge gaps when translated
          el.style.overflow = 'hidden';
        }
      }
      return {
        host: el,
        target: target,
        baseScale: baseScale,
        speed: parseFloat(el.dataset.speed || '0.15'),
        kind: el.dataset.parallax || 'text'
      };
    });
    if (pxNodes.length) {
      var ticking = false;
      function update() {
        var vh = window.innerHeight;
        pxNodes.forEach(function (p) {
          var rect = p.host.getBoundingClientRect();
          if (rect.bottom < -300 || rect.top > vh + 300) return;
          var centre = rect.top + rect.height / 2;
          var sign = p.kind === 'bg' ? 1 : -1;
          var offset = (centre - vh / 2) * p.speed * sign * -1;
          // Combine translate + scale so banner images stay full while drifting
          var t = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
          if (p.baseScale !== 1) t += ' scale(' + p.baseScale + ')';
          // setProperty with priority='important' beats any other CSS rule, including animations
          p.target.style.setProperty('transform', t, 'important');
        });
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
      }, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
  }

  // ---------- 4. Counter tween ----------
  function tweenCount(el) {
    if (REDUCED) { el.textContent = el.dataset.countTo; return; }
    var to = parseFloat(el.dataset.countTo) || 0;
    var dur = parseInt(el.dataset.countDur || '1500', 10);
    var start = performance.now();
    var isAr = document.documentElement.lang === 'ar';
    function fmt(n) {
      var s = Math.round(n).toLocaleString('en');
      if (isAr) s = s.replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; });
      return s;
    }
    function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(to * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- 5. Scroll-driven text reveal (word-by-word lighting) ----------
  // Splits each [data-scroll-text] into spans, then observes each word with a tight
  // rootMargin so words light up as they cross ~50% of the viewport on scroll.
  if (!REDUCED) {
    var srtTargets = document.querySelectorAll('[data-scroll-text], [data-scroll-text-light]');
    if (srtTargets.length) {
      // Per-word IO with a narrow band so words light sequentially during scroll
      var srtIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) e.target.classList.add('is-lit');
          else e.target.classList.remove('is-lit'); // re-dim on exit (subtle, repeatable)
        });
      }, { rootMargin: '-30% 0px -45% 0px', threshold: 0 });

      srtTargets.forEach(function (host) {
        if (host.dataset.srtDone === '1') return;
        var raw = host.textContent.trim();
        if (!raw) return;
        var words = raw.split(/\s+/);
        host.innerHTML = words.map(function (w) {
          return '<span class="srt-word">' + w + '</span>';
        }).join(' ');
        host.dataset.srtDone = '1';
        host.querySelectorAll('.srt-word').forEach(function (w) { srtIO.observe(w); });
      });
    }
  }

  // ---------- 6. Diagnostic (visible in console) ----------
  if (window.console) {
    console.log('%c[Kanaan motion] ready', 'color:#C8A04A;font-weight:600;',
      '· reveals:', document.querySelectorAll('[data-reveal]').length,
      '· staggers:', document.querySelectorAll('[data-reveal-stagger]').length,
      '· splits:', document.querySelectorAll('[data-split]').length,
      '· parallax:', document.querySelectorAll('[data-parallax]').length,
      '· scroll-text:', document.querySelectorAll('[data-scroll-text]').length,
      '· reduced-motion:', REDUCED);
  }
})();
