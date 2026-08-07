// DEPLOY_MARKER_DEALSCAN_SW_V18
// ============================================================
//  Julvox — Service Worker v18 PWA
//  Cache public GET uniquement + Push Notifications
// ============================================================

const CACHE_VERSION = 'v18';
const CACHE_NAME = `dealscan-public-api-${CACHE_VERSION}`;
const CACHE_STATIC = `dealscan-static-${CACHE_VERSION}`;
const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */
const PUBLIC_ORIGIN = 'https://julvox.com';

const STATIC_ASSETS = Object.freeze([
  '/index.html',
  '/manifest.json',
  '/runtime-config.js',
  '/api-client.js',
  '/ui-00-production-truth.js',
  '/enhancements_v3.js',
  '/brand/julvox-glyph-small.svg',
  '/brand/julvox-logo-horizontal.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]);

const PUBLIC_API_PATHS = Object.freeze([
  /^\/deals(?:\/[^/]+)?\/?$/,
  /^\/deals\/trending\/?$/,
  /^\/search\/compare\/?$/,
  /^\/promos\/?$/,
  /^\/stats\/?$/,
  /^\/health\/?$/,
]);

function jsonError(status, error, message) {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isCacheablePublicApiRequest(request, backendOrigin = BACKEND_ORIGIN) {
  if (!request || request.method !== 'GET') return false;
  if (request.headers?.has?.('Authorization') || request.headers?.has?.('Cookie')) return false;
  if (request.credentials === 'include') return false;
  let url;
  try { url = new URL(request.url); } catch (_) { return false; }
  if (url.origin !== backendOrigin || url.username || url.password) return false;
  for (const key of url.searchParams.keys()) {
    if (/^(?:access_?token|auth|authorization|api_?key|key|jwt|password|session)$/i.test(key)) return false;
  }
  return PUBLIC_API_PATHS.some(pattern => pattern.test(url.pathname));
}

function isCacheablePublicResponse(response) {
  if (!response?.ok) return false;
  const cacheControl = response.headers?.get?.('Cache-Control') || '';
  const vary = response.headers?.get?.('Vary') || '';
  if (/\b(?:no-store|private)\b/i.test(cacheControl)) return false;
  if (response.headers?.has?.('Set-Cookie')) return false;
  if (/authorization|cookie/i.test(vary)) return false;
  return true;
}

function safePublicUrl(value) {
  try {
    const candidate = new URL(String(value || ''), PUBLIC_ORIGIN);
    return candidate.origin === PUBLIC_ORIGIN && !candidate.username && !candidate.password
      ? candidate.href
      : PUBLIC_ORIGIN;
  } catch (_) {
    return PUBLIC_ORIGIN;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== CACHE_STATIC)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin === BACKEND_ORIGIN) {
    event.respondWith(
      isCacheablePublicApiRequest(event.request)
        ? networkFirstPublicGet(event.request, CACHE_NAME, 60)
        : networkOnlyApi(event.request)
    );
    return;
  }
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || new Response('Application indisponible hors ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      })
    );
    return;
  }
  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
});

async function networkOnlyApi(request) {
  try {
    return await fetch(request);
  } catch (_) {
    return jsonError(503, 'offline', 'Le service est indisponible et cette requête ne peut pas utiliser de cache.');
  }
}

async function networkFirstPublicGet(request, cacheName, ttlMinutes = 60) {
  if (!isCacheablePublicApiRequest(request)) return networkOnlyApi(request);
  try {
    const response = await fetch(request.clone());
    if (isCacheablePublicResponse(response)) {
      const cache = await caches.open(cacheName);
      const timestampRequest = new Request(`${request.url}__julvox_ts`, { method: 'GET' });
      await Promise.all([
        cache.put(request, response.clone()),
        cache.put(timestampRequest, new Response(String(Date.now()), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })),
      ]);
    }
    return response;
  } catch (_) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (!cached) {
      return jsonError(503, 'offline', 'Le service est indisponible hors ligne et aucune réponse publique en cache n’est disponible.');
    }
    const timestampRequest = new Request(`${request.url}__julvox_ts`, { method: 'GET' });
    const timestampResponse = await cache.match(timestampRequest);
    if (!timestampResponse) {
      return jsonError(504, 'offline_stale', 'L’âge de la dernière réponse publique ne peut pas être vérifié.');
    }
    const timestamp = Number.parseInt(await timestampResponse.text(), 10);
    const ageMinutes = (Date.now() - timestamp) / 60_000;
    if (!Number.isFinite(timestamp) || ageMinutes > ttlMinutes) {
      return jsonError(504, 'offline_stale', 'La dernière réponse publique disponible a expiré. Reconnectez-vous puis réessayez.');
    }
    return cached;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') await (await caches.open(cacheName)).put(request, response.clone());
    return response;
  } catch (_) {
    return new Response('', { status: 503 });
  }
}

self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); }
  catch (_) { data = { title: '🔥 Julvox', body: event.data.text(), type: 'general' }; }
  const notificationType = data.type || 'general';
  const options = {
    body: data.body || 'Une nouvelle offre vous attend.',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    image: data.image || undefined,
    tag: data.tag || `julvox-${notificationType}`,
    data: { url: safePublicUrl(data.url), type: notificationType, dealId: data.deal_id },
    vibrate: [200, 100, 200],
    requireInteraction: notificationType === 'alert_price',
    actions: getActions(notificationType),
  };
  event.waitUntil(self.registration.showNotification(data.title || getTitle(notificationType), options));
});

function getTitle(type) {
  const titles = {
    deal_score90: '🏆 Offre exceptionnelle',
    alert_price: '🎯 Alerte prix déclenchée !',
    flash_deal: '⚡ Vente Flash',
    newsletter: '📬 Vos offres du jour',
    new_feature: '✨ Nouveauté Julvox',
    community: '🤝 Communauté',
  };
  return titles[type] || '🔥 Julvox';
}

function getActions(type) {
  if (type === 'alert_price') return [
    { action: 'view', title: '🛒 Voir l’offre' },
    { action: 'snooze', title: '⏰ Rappel +1h' },
    { action: 'dismiss', title: '✕ Ignorer' },
  ];
  if (type === 'flash_deal') return [
    { action: 'view', title: '⚡ Voir l’offre' },
    { action: 'dismiss', title: '✕' },
  ];
  return [
    { action: 'view', title: '🔥 Voir' },
    { action: 'dismiss', title: '✕' },
  ];
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const data = event.notification.data || {};
  let url = safePublicUrl(data.url);
  if (event.action === 'snooze') {
    const tag = data.dealId ? `snooze-deal-${data.dealId}` : 'snooze-generic';
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: event.notification.icon,
        data,
        tag,
      });
    }, 3_600_000);
    return;
  }
  if (data.dealId) url = `${PUBLIC_ORIGIN}/?deal=${encodeURIComponent(data.dealId)}`;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(PUBLIC_ORIGIN) && 'focus' in client) {
          client.postMessage({ type: 'navigate', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CACHE_VERSION,
    CACHE_NAME,
    CACHE_STATIC,
    STATIC_ASSETS,
    BACKEND_ORIGIN,
    PUBLIC_API_PATHS,
    isCacheablePublicApiRequest,
    isCacheablePublicResponse,
    safePublicUrl,
    jsonError,
    networkOnlyApi,
    networkFirstPublicGet,
    cacheFirst,
  };
}
