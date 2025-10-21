// service-worker.js (refactored from service-worker-v1.0.6.js)
// - Safe caching: clone response once before caching
// - Skip firebase/firestore requests
// - Only cache GET same-origin requests
// - Navigation (HTML) uses network-first with cache fallback
const CACHE_NAME = "kyudo-cache-v1.0.6";
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
  "/ms-icon-144x144.png"
];

// ===== Install: preload core assets =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => {
        // キャッシュ失敗は致命ではないがログに残す
        console.warn("SW install: cache.addAll failed", err);
      })
  );
  self.skipWaiting();
});

// ===== Activate: cleanup old caches =====
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Utility: Determine same-origin
function isSameOrigin(url) {
  try {
    const reqUrl = new URL(url);
    return reqUrl.origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

// ===== Fetch handler =====
// Strategy:
// - Skip Firebase/Firestore endpoints entirely.
// - For navigation requests -> network-first, fallback to cache (index.html).
// - For other GET requests:
//     - serve cache if available (cache-first), but still try network to update cache (stale-while-revalidate style).
// - Do not cache non-GET requests.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = request.url;

  // Skip firebase / firestore related requests entirely (do not intercept)
  if (url.includes("firestore.googleapis.com") || url.includes("firebase")) {
    return; // let the browser handle it normally
  }

  // For navigation (page loads) do network-first (so user gets latest page), fallback to cache
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        // If network response is OK and same-origin and GET, cache it
        if (networkResponse && networkResponse.ok && request.method === "GET" && isSameOrigin(url)) {
          try {
            const clone = networkResponse.clone(); // clone once for cache
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, clone).catch(e => console.warn("cache.put failed (navigate)", e));
          } catch (e) {
            console.warn("Failed to cache navigate response", e);
          }
        }
        return networkResponse;
      } catch (err) {
        // Network failed -> try cache
        const cached = await caches.match("/index.html");
        if (cached) return cached;
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })());
    return;
  }

  // For non-navigation requests:
  // - If not GET, just forward to network (don't attempt caching)
  if (request.method !== "GET") {
    event.respondWith(
      fetch(request).catch(() => new Response(null, { status: 503, statusText: "Network error" }))
    );
    return;
  }

  // GET requests: stale-while-revalidate like pattern
  event.respondWith((async () => {
    // Try cache first
    const cacheResponse = await caches.match(request);
    const networkFetch = (async () => {
      try {
        const fetchResponse = await fetch(request);
        // Only cache same-origin GET requests and successful responses
        if (fetchResponse && fetchResponse.ok && isSameOrigin(url)) {
          try {
            const responseClone = fetchResponse.clone(); // clone once for caching
            const cache = await caches.open(CACHE_NAME);
            // cache.put may reject for opaque responses depending on CORS; catch errors
            cache.put(request, responseClone).catch(e => {
              // 非致命：キャッシュに入らなくても応答自体は使える
              console.warn("cache.put failed", e);
            });
          } catch (e) {
            console.warn("Failed to clone/cache network response", e);
          }
        }
        return fetchResponse;
      } catch (e) {
        // network fail -> return null to let fallback happen
        return null;
      }
    })();

    // If we have cached response, return it immediately and still let network update cache in background
    if (cacheResponse) {
      // Kick off network fetch but don't wait
      networkFetch.then(() => {}).catch(() => {});
      return cacheResponse;
    }

    // No cache -> wait for network
    const netRes = await networkFetch;
    if (netRes) return netRes;

    // Neither cache nor network -> offline fallback
    return new Response("Offline", { status: 503, statusText: "Offline" });
  })());
});
