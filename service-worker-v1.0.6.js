// service-worker-v1.0.6.js（Firebase通信除外＋くるくる防止）
const CACHE_NAME = "kyudo-cache-v1.0.6";
const urlsToCache = [
  "/", "/index.html", "/yadokoro.html", "/help.html", "/tools.html",
  "/css/style.css",
  "/js/matchSet.js",
  "/js/main.js",
  "/js/analysis.js",
  "/js/navbar.js",
  "/js/page.js",
  "/js/tools.js?",
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

// --- fetch: Firestore除外 + キャッシュ優先 + ネット更新 ---
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // ✅ Firestore・Firebase通信はキャッシュ処理をスキップ
  if (url.includes("firestore.googleapis.com") || url.includes("firebase")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      const fetchPromise = fetch(event.request)
        .then(fetchRes => {
          if (fetchRes && fetchRes.status === 200) {
            const cloned = fetchRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return fetchRes;
        })
        .catch(() => null);

      // キャッシュがあれば即返す、なければネットワーク結果を待つ
      return cacheRes || fetchPromise || new Response("Offline", { status: 503 });
    })
  );
});