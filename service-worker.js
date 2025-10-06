// service-worker.js（完全版：自動更新＋クルクル防止＋柔軟キャッシュ）
const CACHE_NAME = "kyudo-cache-v1.0.5"; // バージョン更新でキャッシュ切替
const OFFLINE_URL = "/offline.html";     // オフライン時に表示するページ

// キャッシュ対象リスト
const urlsToCache = [
  "/", "/index.html", "/yadokoro.html", "/help.html", "/tools.html",
  "/css/style.css",
  "/js/matchSet.js",
  "/js/main.js",
  "/js/analysis.js",
  "/js/navbar.js",
  "/js/page.js",
  "/js/tools.js",
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
  "/ms-icon-144x144.png",
  OFFLINE_URL
];

// --- インストール ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// --- 有効化（古いキャッシュ削除） ---
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

// --- fetch ---
self.addEventListener("fetch", event => {
  const { request } = event;

  // HTMLファイルは「ネットワーク優先 → キャッシュ → オフラインページ」
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(res => {
        caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()));
        return res;
      }).catch(() =>
        caches.match(request).then(res => res || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // CSS/JS/画像は「キャッシュ優先 → ネットワーク更新」
  event.respondWith(
    caches.match(request).then(cacheRes => {
      const fetchPromise = fetch(request).then(fetchRes => {
        if (fetchRes && fetchRes.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, fetchRes.clone()));
        }
        return fetchRes;
      }).catch(() => null);

      return cacheRes || fetchPromise || new Response("Offline", { status: 503 });
    })
  );
});
