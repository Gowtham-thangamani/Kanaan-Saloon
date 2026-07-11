/* Kanaan Service Worker — v2
   - Cache-bust: bumping CACHE name nukes the old cache on next visit.
   - JSON content is network-first (so site/branches/offers updates propagate instantly).
   - HTML is network-first (always fresh).
   - Fonts + photos are cache-first (rarely change). */
const CACHE = 'kanaan-v23'; /* bump on every deploy to force-evict stale assets for returning visitors */
const SHELL = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/css/motion.css?v=18',
  '/assets/css/fonts.css',
  '/assets/js/main.js',
  '/assets/js/runtime.js',
  '/assets/js/motion.js?v=18',
  '/assets/js/quickbook.js',
  '/assets/js/calendar.js',
  '/assets/js/config.js',
  '/assets/img/favicon.svg',
  '/assets/img/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {/* one missing file shouldn't kill install */}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

function isJSON(url) { return /\.json($|\?)/.test(url.pathname); }
function isFont(url) { return /\.(woff2?|ttf|otf|eot)($|\?)/.test(url.pathname); }
function isPhoto(url) { return /\/assets\/img\/photos\//.test(url.pathname); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // don't intercept cross-origin

  // HTML & JSON: NETWORK-FIRST (always fresh, fall back to cache offline)
  if (
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html') ||
    isJSON(url)
  ) {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then(m => m || caches.match('/index.html')))
    );
    return;
  }

  // Photos & fonts & css/js: CACHE-FIRST (these have versioned filenames/?v= cache busters)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return r;
    }))
  );
});

// Allow page to ask the worker to skipWaiting and activate immediately
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
