// service-worker.js（更新版）
const CACHE_NAME = "kyudo-cache-v1.0.0"; // バージョン更新で古いキャッシュを削除
const urlsToCache = [
  "/", 
  "/index.html",
  "/yadokoro.html",
  "/help.html",
  "/tools.html",
  "/css/style.css?v=1.0.0",
  "/css/styles.css?v=1.0.0",
  "/js/matchSet.js?v=1.0.0",
  "/js/main.js?v=1.0.0",
  "/js/analysis.js?v=1.0.0",
  "/js/navbar.js?v=1.0.0",
  "/js/page.js?v=1.0.0",
  "/js/tools.js?v=1.0.0",
  "/img/target1.png",
  "/manifest.json",
  // 必要なファイルを追加
];

// インストール時：必ずキャッシュ
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// アクティベート時：古いキャッシュ削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時：ネットワーク優先
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 必要ならキャッシュ更新
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
