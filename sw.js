// ============================================================
//  DealScan — Service Worker v5
//  Cache offline-first pour une expérience fluide même sans réseau
// ============================================================

const CACHE_NAME   = 'dealscan-v6';
const CACHE_STATIC = 'dealscan-static-v6';

// Ressources à mettre en cache immédiatement à l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
];

// ── Install : mise en cache des assets statiques ─────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silencieux si un asset échoue (ex: fonts offline)
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate : nettoyage des anciens caches ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== CACHE_STATIC)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie selon le type de ressource ─────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. API Railway → Network first (données fraîches), fallback cache
  if (url.hostname.includes('railway.app')) {
    event.respondWith(networkFirstWithCache(event.request, CACHE_NAME, 60));
    return;
  }

  // 2. Fonts Google → Cache first (ne changent jamais)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // 3. Page HTML principale → Network first, fallback cache
  if (event.request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(networkFirstWithCache(event.request, CACHE_STATIC, 300));
    return;
  }

  // 4. Tout le reste → Network only (pas de cache)
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match('/index.html');
  }));
});

// ── Stratégie Network First ────────────────────────────────────
async function networkFirstWithCache(request, cacheName, ttlSeconds = 60) {
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      // Ajouter header d'expiration
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch(e) {
    // Réseau indisponible → essayer le cache
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = cached.headers.get('sw-cached-at');
      // Vérifier TTL
      if (cachedAt && (Date.now() - parseInt(cachedAt)) < ttlSeconds * 1000) {
        return cached;
      }
      if (cachedAt) return cached; // Retourner cache expiré plutôt que rien
    }
    return new Response(JSON.stringify({ error: 'offline', deals: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── Stratégie Cache First ─────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch(e) {
    return new Response('', { status: 503 });
  }
}

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } 
  catch(e) { data = { title: '🔥 DealScan', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || '🔥 DealScan', {
      body:    data.body || 'Un nouveau deal vous attend !',
      icon:    '/icon-192.png',
      badge:   '/badge-72.png',
      tag:     data.tag || 'dealscan-notif',
      data:    { url: data.url || 'https://julvox.com' },
      actions: [
        { action: 'view',    title: '🔥 Voir le deal' },
        { action: 'dismiss', title: '✕ Ignorer' },
      ],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || 'https://julvox.com';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
