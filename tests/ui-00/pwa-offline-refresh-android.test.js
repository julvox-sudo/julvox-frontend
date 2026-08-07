const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  applyOfflineShellToServiceWorker,
} = require('../../scripts/product-realign-01b-pwa-install-hardening.js');
const {
  APP_SHELL_URL,
  OFFLINE_SHELL_FALLBACK_HTML,
  applyOfflineRefreshHardening,
} = require('../../scripts/product-realign-01b-pwa-refresh-hardening.js');

function transformedServiceWorkerSource() {
  const source = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
  return applyOfflineRefreshHardening(applyOfflineShellToServiceWorker(source))
    .replace(
      "const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */",
      "const BACKEND_ORIGIN = 'https://backend.example';",
    );
}

function loadServiceWorker({ failAsset = null, startOnline = true } = {}) {
  const listeners = {};
  const stored = new Map();
  const added = [];
  let online = startOnline;
  let skipWaitingCalls = 0;

  const cache = {
    async add(asset) {
      added.push(asset);
      if (asset === failAsset) throw new Error(`cannot cache ${asset}`);
      stored.set(asset, new Response(`cached:${asset}`, { status: 200 }));
    },
    async put(request, response) {
      const key = typeof request === 'string' ? request : request.url;
      stored.set(key, response.clone ? response.clone() : response);
    },
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      const response = stored.get(key);
      return response?.clone ? response.clone() : response;
    },
  };

  const caches = {
    async open() { return cache; },
    async match(request) { return cache.match(request); },
    async keys() { return []; },
    async delete() { return true; },
  };

  const self = {
    location: { origin: 'https://preview.example' },
    addEventListener(type, listener) { listeners[type] = listener; },
    async skipWaiting() { skipWaitingCalls += 1; },
    clients: { claim: async () => {} },
    registration: { showNotification: async () => {} },
  };

  const fetchImpl = async request => {
    if (!online) throw new Error('airplane mode');
    if (request?.mode === 'navigate') {
      return new Response('<!doctype html><title>Julvox</title><nav>Accueil</nav>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const context = {
    console,
    module: { exports: {} },
    exports: {},
    self,
    clients: { matchAll: async () => [], openWindow: async () => {} },
    caches,
    fetch: fetchImpl,
    Request,
    Response,
    Headers,
    URL,
    setTimeout,
    clearTimeout,
    Date,
    Promise,
  };
  vm.runInNewContext(transformedServiceWorkerSource(), context, { filename: 'dist/sw.js' });

  return {
    added,
    listeners,
    stored,
    mod: context.module.exports,
    setOnline(value) { online = value; },
    skipWaitingCalls() { return skipWaitingCalls; },
  };
}

async function dispatchFetch(listener, request) {
  let responsePromise;
  listener({
    request,
    respondWith(value) { responsePromise = value; },
  });
  return responsePromise;
}

test('build output upgrades the PWA shell to interactive refresh revision 04', () => {
  const source = transformedServiceWorkerSource();
  assert.match(source, /const CACHE_REVISION = 'offline-shell-04'/);
  assert.match(source, /Promise\.allSettled\(STATIC_ASSETS\.map/);
  assert.match(source, /networkFirstNavigation\(event\.request\)/);
  assert.match(source, /offlineShellFallbackResponse\(\)/);
  assert.doesNotMatch(source, /cache\.addAll\(STATIC_ASSETS\)/);
  assert.equal((source.match(/const APP_SHELL_URL = '\/index\.html';/g) || []).length, 1);
});

test('fallback shell exposes real offline controls instead of decorative navigation labels', () => {
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /<button[^>]*data-offline-target="home"[^>]*>[\s\S]*Accueil/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /<button[^>]*data-offline-target="conversations"[^>]*>[\s\S]*Conversations/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /<button[^>]*data-offline-target="decisions"[^>]*>[\s\S]*Mes décisions/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /id="offlineMenuButton"/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /Aide \/ Informations/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /Paramètres utilisateur/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /data-offline-retry/);
  assert.doesNotMatch(OFFLINE_SHELL_FALLBACK_HTML, /<nav class="nav"[^>]*><span>/);
});

test('fallback shell can persist a local reflection for later resumption', () => {
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /julvox:decision-home:conversations:v1/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /id="offlineDraftForm"/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /Enregistrer pour plus tard/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /Réflexion enregistrée hors ligne\./);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /Reprendre avec Julvox après reconnexion\./);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /renderConversations\(\)/);
});

test('fallback shell stays network-honest and automatically returns to full Julvox on reconnection', () => {
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /window\.addEventListener\('online'/);
  assert.match(OFFLINE_SHELL_FALLBACK_HTML, /window\.location\.reload\(\)/);
  assert.doesNotMatch(OFFLINE_SHELL_FALLBACK_HTML, /fetch\s*\(/);
  assert.doesNotMatch(OFFLINE_SHELL_FALLBACK_HTML, /Application indisponible hors ligne/);
});

test('one failed secondary precache does not keep the previous service worker active', async () => {
  const loaded = loadServiceWorker({ failAsset: '/icons/icon-512.png' });
  let installPromise;
  loaded.listeners.install({ waitUntil(value) { installPromise = value; } });
  await installPromise;

  assert.ok(loaded.added.includes(APP_SHELL_URL));
  assert.ok(loaded.added.includes('/icons/icon-512.png'));
  assert.equal(loaded.skipWaitingCalls(), 1);
  assert.equal(loaded.mod.CACHE_REVISION, 'offline-shell-04');
  assert.match(loaded.mod.CACHE_STATIC, /v17-offline-shell-04$/);
});

test('Android scenario: online load is persisted then offline refresh returns Julvox shell', async () => {
  const loaded = loadServiceWorker();
  const request = {
    url: 'https://preview.example/?utm_source=pwa',
    method: 'GET',
    mode: 'navigate',
  };

  const onlineResponse = await dispatchFetch(loaded.listeners.fetch, request);
  assert.equal(onlineResponse.status, 200);
  assert.match(await onlineResponse.text(), /Julvox/);
  assert.ok(loaded.stored.has(APP_SHELL_URL), 'successful navigation must refresh /index.html in Cache Storage');

  loaded.setOnline(false);
  const offlineResponse = await dispatchFetch(loaded.listeners.fetch, request);
  assert.equal(offlineResponse.status, 200);
  const html = await offlineResponse.text();
  assert.match(html, /Julvox/);
  assert.doesNotMatch(html, /Application indisponible hors ligne/);
});

test('cold offline refresh returns the interactive Julvox shell even when Cache Storage is empty', async () => {
  const loaded = loadServiceWorker({ startOnline: false });
  const request = {
    url: 'https://preview.example/?utm_source=pwa',
    method: 'GET',
    mode: 'navigate',
  };

  const response = await dispatchFetch(loaded.listeners.fetch, request);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type') || '', /text\/html/i);
  const html = await response.text();
  assert.match(html, /Julvox/);
  assert.match(html, /Mode hors ligne/);
  assert.match(html, /data-offline-target="home"/);
  assert.match(html, /data-offline-target="conversations"/);
  assert.match(html, /data-offline-target="decisions"/);
  assert.match(html, /offlineDraftForm/);
  assert.doesNotMatch(html, /Application indisponible hors ligne/);
});
