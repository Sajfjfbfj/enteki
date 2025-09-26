// service-worker.js（本番向け改良版）
const CACHE_NAME = "kyudo-cache-v1.0.2"; // バージョン更新
const urlsToCache = [
  "/",
  "/index.html",
  "/yadokoro.html",
  "/help.html",
  "/tools.html",
  "/css/style.css?v=1.0.2",
  "/js/matchSet.js?v=1.0.2",
  "/js/main.js?v=1.0.2",
  "/js/analysis.js?v=1.0.2",
  "/js/navbar.js?v=1.0.2",
  "/js/page.js?v=1.0.2",
  "/js/tools.js?v=1.0.2",
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

// インストール時にキャッシュ
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // 即座に新しい SW 適用
});

// 古いキャッシュ削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim(); // 即座にページに制御権を渡す
});

// fetch: ネットワーク優先 + キャッシュ fallback
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功したらキャッシュ更新
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request)) // オフライン時
  );
});
