const CACHE_NAME = 'javaneh-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('PWA Asset cache skip:', asset, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-First with Cache Fallback to prevent stale preview/dev state
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CRITICAL: NEVER intercept APK downloads, large binaries, or API endpoints. Let browser handle them directly!
  if (
    url.pathname.endsWith('.apk') ||
    url.pathname.toLowerCase().includes('apk') ||
    url.pathname.toLowerCase().includes('javaneh') ||
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('download') ||
    event.request.headers.has('range')
  ) {
    return; // Pass through directly to network/browser
  }

  // For same-origin resources, try network first so preview is always live
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html') || caches.match('/index.html');
            }
            return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
          });
        })
    );
  }
});
