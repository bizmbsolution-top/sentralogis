// [AI] Service Worker for SentraLogis Driver Portal PWA Installation
const CACHE_NAME = 'sentralogis-driver-v1';
const ASSETS_TO_CACHE = [
  '/driver/portal',
  '/sentralogis_logo.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll skipped resources: ', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('[SW] Clearing old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// Cache first, fall back to network for faster offline fallback on asset requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Only handle GET requests and local assets or HTML layouts
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => { /* ignore background sync errors */ });
        
        return cachedResponse;
      }
      
      return fetch(event.request).catch((err) => {
        console.warn('[SW] Fetch failed for:', event.request.url, err);
        // If it's a page navigation request, we can serve the cached offline portal
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/driver/portal');
        }
      });
    })
  );
});
