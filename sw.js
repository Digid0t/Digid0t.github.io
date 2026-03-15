/* KI-Stammtisch Pro – Service Worker v2 */
const CACHE = 'ki-stammtisch-v2';
const SHELL = [
  './',
  './index.html',
  'https://fonts.bunny.net/css?family=inter:400,500,600,700,800&display=swap'
];

/* Install: cache app shell */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Activate: clean old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Fetch strategy:
   - API calls (openrouter.ai): always network, never cache
   - POST requests: always network
   - App shell (same origin GET): cache-first with network fallback
   - External fonts/CDN: stale-while-revalidate */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept API calls or non-GET
  if (request.method !== 'GET') return;
  if (url.hostname.includes('openrouter.ai')) return;
  if (url.hostname.includes('api.')) return;

  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res && res.ok && res.status < 400) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // External (fonts, etc.): stale-while-revalidate
  e.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
