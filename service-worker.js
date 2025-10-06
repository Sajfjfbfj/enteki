// service-worker.js（最速即時反映＋キャッシュ安全処理＋更新検知）
const CACHE_NAME = "kyudo-cache-v1.0.6"; // ★バージョンを上げると確実更新
const OFFLINE_URL = "/offline.html";

// === キャッシュ対象 ===
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

// === install ===
self.addEventListener("install", event => {
  self.skipWaiting(); // 即座に新SW適用
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of urlsToCache) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) await cache.put(url, res.clone());
        } catch (err) {
          console.warn("❌ キャッシュ失敗:", url);
        }
      }
    })()
  );
});

// === activate ===
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      );
      await self.clients.claim();

      // ★新バージョンが有効化されたら全タブ自動リロード！
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(client => client.navigate(client.url));
    })()
  );
});

// === fetch ===
self.addEventListener("fetch", event => {
  const { request } = event;

  // HTMLはネットワーク優先 → キャッシュ → オフライン
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(res => {
          caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // その他はキャッシュ優先＋バックグラウンド更新
  event.respondWith(
    caches.match(request).then(cacheRes => {
      const fetchPromise = fetch(request, { cache: "no-cache" })
        .then(res => {
          if (res && res.status === 200)
            caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()));
          return res;
        })
        .catch(() => null);
      return cacheRes || fetchPromise || new Response("Offline", { status: 503 });
    })
  );
});
