// service-worker.js（改良版：自動更新＆くるくる防止）
const CACHE_NAME = "kyudo-cache-v1.0.5"; // 新バージョン
const urlsToCache = [
  "/", "/index.html", "/yadokoro.html", "/help.html", "/tools.html",
  "/css/style.css?v=1.0.4",
  "/js/matchSet.js?v=1.0.4",
  "/js/main.js?v=1.0.4",
  "/js/analysis.js?v=1.0.4",
  "/js/navbar.js?v=1.0.4",
  "/js/page.js?v=1.0.4",
  "/js/tools.js?v=1.0.4",
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
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// --- fetch: キャッシュ最優先 + ネットワーク更新 ---
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      const fetchPromise = fetch(event.request)
        .then(fetchRes => {
          if (fetchRes && fetchRes.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchRes.clone()));
          }
          return fetchRes;
        })
        .catch(() => null); // ネットワーク失敗は無視

      // キャッシュがあれば即返す、なければネットワーク結果を待つ
      return cacheRes || fetchPromise || new Response("Offline", { status: 503 });
    })
  );
});
