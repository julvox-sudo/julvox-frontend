const APP_SHELL_URL = '/index.html';
const CACHE_REVISION_FROM = "const CACHE_REVISION = 'offline-shell-01';";
const CACHE_REVISION_TO = "const CACHE_REVISION = 'offline-shell-02';";

const INSTALL_HANDLER_FROM = `self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});`;

const NAVIGATION_HANDLER_FROM = `  if (event.request.mode === 'navigate') {
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
  }`;

const RESILIENT_RUNTIME = `async function precacheStaticShell() {
  const cache = await caches.open(CACHE_STATIC);
  const results = await Promise.allSettled(STATIC_ASSETS.map(async asset => {
    await cache.add(asset);
    return asset;
  }));
  const failures = results
    .map((result, index) => result.status === 'rejected' ? STATIC_ASSETS[index] : null)
    .filter(Boolean);
  if (failures.length) {
    console.warn('[Julvox SW] shell precache partiel; navigation runtime utilisable', failures);
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const contentType = response?.headers?.get?.('Content-Type') || '';
    if (response?.ok && /text\\/html/i.test(contentType)) {
      try {
        const cache = await caches.open(CACHE_STATIC);
        await cache.put(APP_SHELL_URL, response.clone());
      } catch (cacheError) {
        console.warn('[Julvox SW] impossible de rafraîchir le shell HTML', cacheError);
      }
    }
    return response;
  } catch (_) {
    const cache = await caches.open(CACHE_STATIC);
    const cached = await cache.match(APP_SHELL_URL)
      || await caches.match(APP_SHELL_URL, { ignoreSearch: true });
    return cached || new Response('Application indisponible hors ligne.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    precacheStaticShell()
      .then(() => self.skipWaiting())
  );
});`;

const NAVIGATION_HANDLER_TO = `  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }`;

function replaceExactlyOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`PWA refresh hardening failed: ${label} anchor missing`);
  if (source.indexOf(from, first + from.length) >= 0) {
    throw new Error(`PWA refresh hardening failed: ${label} anchor is ambiguous`);
  }
  return `${source.slice(0, first)}${to}${source.slice(first + from.length)}`;
}

function applyOfflineRefreshHardening(input) {
  let source = String(input);
  if (source.includes("const CACHE_REVISION = 'offline-shell-02';") && source.includes('networkFirstNavigation(event.request)')) {
    return source;
  }

  source = replaceExactlyOnce(source, CACHE_REVISION_FROM, CACHE_REVISION_TO, 'cache revision');
  source = replaceExactlyOnce(
    source,
    'const STATIC_ASSETS = [',
    `const APP_SHELL_URL = '${APP_SHELL_URL}';\n\nconst STATIC_ASSETS = [`,
    'app shell declaration',
  );
  source = replaceExactlyOnce(source, INSTALL_HANDLER_FROM, RESILIENT_RUNTIME, 'install handler');
  source = replaceExactlyOnce(source, NAVIGATION_HANDLER_FROM, NAVIGATION_HANDLER_TO, 'navigation handler');
  return source;
}

module.exports = {
  APP_SHELL_URL,
  applyOfflineRefreshHardening,
};
