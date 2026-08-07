const APP_SHELL_URL = '/index.html';
const OFFLINE_SHELL_FALLBACK_HTML = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#FCF9F4"><title>Julvox — hors ligne</title><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#FCF9F4;color:#0B1D34;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh;display:flex;flex-direction:column}.top{height:72px;display:flex;align-items:center;padding:0 22px;border-bottom:1px solid rgba(11,29,52,.1);background:#fffdf9}.brand{font-size:26px;font-weight:750;letter-spacing:-.6px}.main{flex:1;display:grid;place-items:center;padding:34px 22px;text-align:center}.card{width:min(680px,100%);padding:36px 24px;border:1px solid rgba(11,29,52,.1);border-radius:26px;background:#fffdf9;box-shadow:0 18px 50px rgba(43,34,23,.08)}.status{display:inline-block;margin-bottom:18px;padding:8px 12px;border-radius:999px;background:#e7f3ef;color:#0b6764;font-size:13px;font-weight:700}h1{margin:0 0 16px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(38px,8vw,62px);line-height:1.03;font-weight:500;color:#0d3b37}p{margin:0 auto;max-width:520px;color:#52616b;font-size:16px;line-height:1.55}.nav{display:grid;grid-template-columns:repeat(3,1fr);min-height:68px;border-top:1px solid rgba(11,29,52,.1);background:#fffdf9}.nav span{display:grid;place-items:center;padding:10px 4px;color:#52616b;font-size:12px;font-weight:650}.nav span:first-child{color:#0b6764}</style></head><body><header class="top"><div class="brand">Julvox</div></header><main class="main"><section class="card"><div class="status">Mode hors ligne</div><h1>Que veux-tu décider aujourd’hui&nbsp;?</h1><p>Julvox reste disponible pour l’essentiel. Les contenus qui nécessitent le réseau seront de nouveau accessibles dès la reconnexion.</p></section></main><nav class="nav" aria-label="Navigation Julvox"><span>Accueil</span><span>Conversations</span><span>Mes décisions</span></nav></body></html>';
const CACHE_REVISION_FROM = "const CACHE_REVISION = 'offline-shell-01';";
const CACHE_REVISION_TO = "const CACHE_REVISION = 'offline-shell-03';";

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

const RESILIENT_RUNTIME = `const OFFLINE_SHELL_FALLBACK_HTML = ${JSON.stringify(OFFLINE_SHELL_FALLBACK_HTML)};

function offlineShellFallbackResponse() {
  return new Response(OFFLINE_SHELL_FALLBACK_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function precacheStaticShell() {
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
    if (response?.ok) {
      try {
        const responseUrl = response.url ? new URL(response.url) : null;
        if (!responseUrl || responseUrl.origin === self.location.origin) {
          const cache = await caches.open(CACHE_STATIC);
          await cache.put(APP_SHELL_URL, response.clone());
        }
      } catch (cacheError) {
        console.warn('[Julvox SW] impossible de rafraîchir le shell HTML', cacheError);
      }
    }
    return response;
  } catch (_) {
    const cache = await caches.open(CACHE_STATIC);
    const cached = await cache.match(APP_SHELL_URL)
      || await caches.match(request, { ignoreSearch: true })
      || await caches.match(APP_SHELL_URL, { ignoreSearch: true });
    return cached || offlineShellFallbackResponse();
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
  if (source.includes("const CACHE_REVISION = 'offline-shell-03';") && source.includes('networkFirstNavigation(event.request)')) {
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
  OFFLINE_SHELL_FALLBACK_HTML,
  applyOfflineRefreshHardening,
};
