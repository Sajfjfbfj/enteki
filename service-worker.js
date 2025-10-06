// service-worker.js（最速で最新反映対応）
const CACHE_NAME = "kyudo-cache-v1.0.7"; // 毎回更新時にバージョンを上げる
const OFFLINE_URL = "/offline.html";

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
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// --- fetch ---
self.addEventListener("fetch", event => {
  const { request } = event;

  // HTMLは絶対最新取得 → キャッシュに保存 → ページに反映
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "reload" }).then(res => {
        caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()));
        return res;
      }).catch(() =>
        caches.match(request).then(res => res || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // CSS/JS/画像も必ず最新を取得（キャッシュ優先も残す）
  event.respondWith(
    caches.match(request).then(cacheRes => {
      const fetchPromise = fetch(request, { cache: "reload" })
        .then(fetchRes => {
          if (fetchRes && fetchRes.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, fetchRes.clone()));
          }
          return fetchRes;
        }).catch(() => null);
      return fetchPromise || cacheRes || new Response("Offline", { status: 503 });
    })
  );
});

// --- ページを自動更新 ---
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
