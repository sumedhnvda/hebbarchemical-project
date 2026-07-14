const CACHE_NAME = 'hebbar-chem-v19';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './translations.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/header-logo.png'
];

// ── INSTALL: pre-cache every asset immediately ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())   // activate new SW straight away
  );
});

// ── ACTIVATE: wipe all old caches so stale files are gone ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // take control of all open tabs immediately
  );
});

// ── FETCH: Cache-First with background revalidation ──
// 1. Serve from cache instantly (works fully offline).
// 2. In the background, try to fetch a fresh copy and update the cache.
// 3. If there is nothing in cache AND network fails → return a simple offline fallback.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {

        // Background revalidation — update cache silently when online
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Network unavailable — silently ignored, cache will serve
          });

        // Return cached response immediately; otherwise wait for network
        return cachedResponse || networkFetch;
      })
    )
  );
});
