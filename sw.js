const CACHE_NAME = "ki-stammtisch-shell-v1";
const OFFLINE_URLS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(OFFLINE_URLS);
      } catch (e) {
        console.error("SW install cache error", e);
      }
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    if (event.request.method !== "GET") return;
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.ok) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        } catch (e) {
          const fallback = await cache.match("./index.html");
          return fallback || Response.error();
        }
      })()
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
