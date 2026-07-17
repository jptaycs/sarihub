/**
 * SariHub service worker: an offline shell, not an offline database.
 *
 * - Navigations: network-first; on failure serve the last cached copy of that
 *   page (owner catalog, buyer price board), else the /offline page.
 * - Static assets (/_next/static, images, fonts): cache-first — they're
 *   content-hashed or immutable enough for a sari-sari morning.
 * - Never touches /api or /auth: money and sessions don't get cached.
 *
 * Bump VERSION to invalidate every cache on the next deploy.
 */
const VERSION = "sarihub-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline ?? Response.error();
        }),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(svg|png|jpg|jpeg|webp|gif|ico|woff2?)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
