// خدمة محسّنة: تخزن الملفات الأساسية محلياً لفتح فوري، وتحدّث بالخلفية بهدوء
const CACHE_NAME = "delivery-app-v2";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// استراتيجية: كاش أولاً للفتح الفوري، مع تحديث الكاش بالخلفية من الشبكة في كل مرة
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkFetch;
        return cached;
      }

      const networkResponse = await networkFetch;
      return networkResponse || cached;
    })
  );
});
