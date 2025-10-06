const CACHE_NAME = "kyudo-cache-v1.0.6"; // 新バージョン
const urlsToCache = [
  "/", "/index.html", "/yadokoro.html", "/help.html", "/tools.html",
  "/css/style.css?v=1.0.6",
  "/js/matchSet.js?v=1.0.6",
  "/js/main.js?v=1.0.6",
  "/js/analysis.js?v=1.0.6",
  "/js/navbar.js?v=1.0.6",
  "/js/page.js?v=1.0.6",
  "/js/tools.js?v=1.0.6",
  "/img/target1.png",
  "/apple-icon-57x57.png",
  "/apple-icon-60x60.png",
  "/apple-icon-72x72.png",
  "/apple-icon-76x76.png",
  "/apple-icon-114x114.png",
  "/apple-icon-120x120.png",
  "/apple-icon-144x144.png",
  "/apple-icon-152x152.png",
  "/apple-icon-180x180.png",
  "/android-icon-192x192.png",
  "/favicon-32x32.png",
  "/favicon-96x96.png",
  "/favicon-16x16.png",
  "/manifest.json",
  "/ms-icon-144x144.png"
];

// --- インストール ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// --- 古いキャッシュ削除 ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

// --- fetch: キャッシュ優先 + ネットワーク更新 ---
self.addEventListener("fetch", event => {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);

    try {
      const fetchResponse = await fetch(event.request);
      if (fetchResponse && fetchResponse.status === 200) {
        await cache.put(event.request, fetchResponse.clone());
      }
      return cachedResponse || fetchResponse;
    } catch (err) {
      // ネットワーク失敗時
      return cachedResponse || new Response("Offline", { status: 503 });
    }
  })());
});
