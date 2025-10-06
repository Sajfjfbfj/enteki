// service-worker.js（強制反映対応）
const CACHE_NAME = "kyudo-cache-v1.0.6"; // バージョンを上げる
const OFFLINE_URL = "/offline.html";

// キャッシュ対象リスト（変更なし）
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
  self.skipWaiting(); // すぐに新しい SW をアクティブ化
});

// --- 有効化（古いキャッシュ削除） ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim(); // ページに即座に反映
});

// --- fetch ---
self.addEventListener("fetch", event => {
  const { request } = event;

  // HTMLはネットワーク優先
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

  // CSS/JS/画像はキャッシュ優先
  event.respondWith(
    caches.match(request).then(cacheRes => {
      const fetchPromise = fetch(request, { cache: "reload" }) // 強制更新
        .then(fetchRes => {
          if (fetchRes && fetchRes.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, fetchRes.clone()));
          }
          return fetchRes;
        }).catch(() => null);
      return cacheRes || fetchPromise || new Response("Offline", { status: 503 });
    })
  );
});
