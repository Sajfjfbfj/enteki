// service-worker.js
const CACHE_NAME = "kyudo-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/yadokoro.html",
  "/help.html",
  "/tools.html",
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
  "/ms-icon-144x144.png"
  // 必要なファイルを追加
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
