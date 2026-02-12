const CACHE_VERSION = "cc-v5";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const STATIC_ASSETS = [
  "/cc/",
  "/cc/index.html",
  "/cc/manifest.json",
  "/cc/js/app.js",
  "/cc/js/ui.js",
  "/cc/css/tailwind.min.css",
  "/cc/css/daisyui.min.css",
  "/cc/css/custom.css",
  "/cc/icons/icon-192.svg",
  "/cc/icons/icon-512.svg",
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith("cc-") && name !== STATIC_CACHE)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't intercept cross-origin API calls — let app.js handle errors/caching
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    }),
  );
});
