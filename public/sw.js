// [AI] Service Worker for SentraLogis PWA (Warehouse + Driver Portal)
const CACHE_NAME = 'sentralogis-pwa-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/warehouse/portal',
  '/warehouse/portal/login',
  '/driver/portal',
  '/sentralogis_logo.png',
  '/favicon.ico'
];

// [AI] Push Notification Handler
self.addEventListener('push', (event) => {
  let data = { title: 'SentraLogis', body: 'Notifikasi baru', tag: 'sentralogis' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.warn('[SW] Push data parse error:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/sentralogis_logo.png',
    badge: data.badge || '/favicon.ico',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'sentralogis-notification',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// [AI] Notification Click Handler - opens the correct page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const jobId = notificationData.job_id;
  const joToken = notificationData.token;
  // [AI] Route to /jo/[token] if token present, otherwise /driver/portal
  const targetUrl = joToken ? `/jo/${joToken}` : (jobId ? `/driver/portal?job=${jobId}` : '/driver/portal');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // [AI] Check both /driver/portal and /jo/ pages for existing open tabs
        if ((client.url.includes('/driver/portal') || client.url.includes('/jo/')) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

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

// Network-first for navigations, cache-first for static assets
  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
      return;
    }

    const requestUrl = new URL(event.request.url);
    const isNavigation = event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') || '').includes('text/html');

    if (isNavigation) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(async () => {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            const loginPage = await caches.match('/login');
            if (loginPage) return loginPage;
            const portalRoot = await caches.match('/warehouse/portal');
            if (portalRoot) return portalRoot;
            return new Response(
              `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Login</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#fff;text-align:center;padding:1rem}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#94a3b8}.offline-form{max-width:400px;margin:2rem auto;background:#1e293b;padding:2rem;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.3)}input{width:100%;padding:12px;margin:10px 0;background:#0f172a;border:1px solid #334155;border-radius:8px;color:white}.button{width:100%;padding:12px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:10px}button:hover{background:#2563eb}button:disabled{opacity:0.5;cursor:not-allowed}</style></head><body><div class="offline-form"><h1>Akses Offline</h1><p>Pindai barcode login atau masukkan kredensial:</p><input type="text" id="offline-code" placeholder="Kode Login Offline"><button id="use-offline-code" class="button" disabled>Gunakan Kode Offline</button><p style="margin-top:1rem;font-size:0.85rem;color:#64748b">Kode offline tersedia dari admin saat pertama kali masuk dengan WiFi</p></div><script>setTimeout(() => {
  const input = document.getElementById('offline-code');
  const button = document.getElementById('use-offline-code');
  if (input && button) {
    input.addEventListener('input', () => {
      button.disabled = input.value.length < 4;
    });
  }
}, 100);</script></body></html>`,
              { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          })
      );
    } else {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) {
            fetch(event.request).then((res) => {
              if (res.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res));
              }
            }).catch(() => {});
            return cached;
          }
          return fetch(event.request).then((res) => {
            if (res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            }
            return res;
          }).catch(() => new Response('', { status: 404 }));
        })
      );
    }
  });
