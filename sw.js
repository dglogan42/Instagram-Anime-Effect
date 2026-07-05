const CACHE = "anime-filter-v2";

function basePath() {
  const path = self.location.pathname;
  return path.endsWith("sw.js") ? path.slice(0, -"sw.js".length) : path;
}

const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/shaders.js",
  "./js/anime-filter.js",
  "./js/recorder.js",
  "./js/pwa.js",
  "./js/main.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  const root = basePath();
  const urls = ASSETS.map((asset) => root + asset.replace(/^\.\//, ""));
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(urls)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});