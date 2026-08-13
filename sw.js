/* Kanaan Service Worker — v4 (no-op / cache-clearing)

   Earlier versions cached JS/CSS in the browser, which repeatedly served
   returning visitors a STALE runtime.js after a deploy (the background image
   / code changes wouldn't show until the SW cache was manually cleared).

   This worker intentionally does the opposite:
   - On activate it WIPES every cache it finds.
   - It has NO 'fetch' handler, so the browser loads every request straight
     from the network. Nothing is served from a service-worker cache, so
     nothing can go stale. Hostinger's CDN + normal HTTP caching still handle
     performance at the edge.

   Bump CACHE only to force a fresh activate on returning visitors. */
const CACHE = 'kanaan-v25';

self.addEventListener('install', () => {
  // Take over as soon as possible.
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Delete ALL old caches (including the previous kanaan-v* shells that held
    // stale JS). After this there is no SW cache left to serve.
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Deliberately NO fetch listener — every request goes to the network directly,
// so code and content updates always appear on the next load.

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
