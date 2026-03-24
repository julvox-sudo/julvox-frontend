// ============================================================
//  DealScan — Service Worker v7 PWA
//  Cache offline-first + Push Notifications par catégorie
// ============================================================

const CACHE_VERSION = 'v7';
const CACHE_NAME    = `dealscan-${CACHE_VERSION}`;
const CACHE_STATIC  = `dealscan-static-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== CACHE_STATIC)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API Railway → Network first
  if (url.hostname.includes('railway.app') || url.hostname.includes('julvox-dealscan')) {
    event.respondWith(networkFirst(event.request, CACHE_NAME, 60));
    return;
  }

  // Fonts → Cache first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // Navigation HTML → Network first avec fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, CACHE_STATIC, 300));
    return;
  }

  // Reste → Network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/index.html'))
  );
});

async function networkFirst(request, cacheName, ttl = 60) {
  try {
    const res = await fetch(request.clone());
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch(e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', deals: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(cacheName)).put(request, res.clone());
    return res;
  } catch(e) {
    return new Response('', { status: 503 });
  }
}

// ── Push Notifications ───────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch(e) { data = { title: '🔥 DealScan', body: event.data.text(), type: 'general' }; }

  // Vérifier les préférences utilisateur (stockées via postMessage)
  const notifType = data.type || 'general';

  const notifOptions = {
    body:    data.body    || 'Un nouveau deal vous attend !',
    icon:    data.icon    || '/icon-192.png',
    badge:   '/badge-72.png',
    image:   data.image   || undefined,
    tag:     data.tag     || `dealscan-${notifType}`,
    data:    { url: data.url || 'https://julvox.com', type: notifType, dealId: data.deal_id },
    vibrate: [200, 100, 200],
    requireInteraction: notifType === 'alert_price', // Les alertes prix restent jusqu'au clic
    actions: _getActions(notifType),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || _getTitle(notifType), notifOptions)
  );
});

function _getTitle(type) {
  const titles = {
    deal_score90: '🏆 Deal exceptionnel',
    alert_price:  '🎯 Alerte prix déclenchée !',
    flash_deal:   '⚡ Vente Flash',
    newsletter:   '📬 Tes deals du jour',
    new_feature:  '✨ Nouveauté DealScan',
    community:    '🤝 Communauté',
  };
  return titles[type] || '🔥 DealScan';
}

function _getActions(type) {
  if (type === 'alert_price') return [
    { action: 'view',    title: '🛒 Voir le deal' },
    { action: 'snooze',  title: '⏰ Rappel +1h' },
    { action: 'dismiss', title: '✕ Ignorer' },
  ];
  if (type === 'flash_deal') return [
    { action: 'view',    title: '⚡ Saisir l\'offre' },
    { action: 'dismiss', title: '✕' },
  ];
  return [
    { action: 'view',    title: '🔥 Voir' },
    { action: 'dismiss', title: '✕' },
  ];
}

// ── Notification click ───────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const notifData = event.notification.data || {};
  let url = notifData.url || 'https://julvox.com';

  // Snooze : re-notify dans 1h
  if (event.action === 'snooze') {
    const data = event.notification.data;
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: event.notification.icon,
        data,
        tag: (data.tag || 'snooze') + '-snoozed',
      });
    }, 3600000);
    return;
  }

  if (notifData.dealId) url = `https://julvox.com/?deal=${notifData.dealId}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) {
        if (c.url.startsWith('https://julvox.com') && 'focus' in c) {
          c.postMessage({ type: 'navigate', url });
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Background Sync (retry failed API calls) ─────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncPendingVotes());
  }
  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncPendingAlerts());
  }
});

async function syncPendingVotes() {
  // Les votes en attente sont envoyés quand la connexion revient
  try {
    const cache = await caches.open('dealscan-pending');
    const keys  = await cache.keys();
    for (const req of keys) {
      try {
        const res = await fetch(req);
        if (res.ok) await cache.delete(req);
      } catch(e) {}
    }
  } catch(e) {}
}

async function syncPendingAlerts() {
  // Idem pour les alertes
}

// ── Message from page ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
