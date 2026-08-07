const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  INSTALL_STATE_KEY,
  PWA_INSTALL_RUNTIME,
  RUNTIME_MARKER,
  STATIC_SHELL_ASSETS,
  applyOfflineShellToServiceWorker,
  applyPwaInstallHardening,
} = require('../../scripts/product-realign-01b-pwa-install-hardening.js');

function runtimeJavascript() {
  const match = PWA_INSTALL_RUNTIME.match(/<script[^>]*>([\s\S]*)<\/script>/);
  assert.ok(match, 'PWA runtime script must be extractable');
  return match[1];
}

function loadInstallRuntime({ standalone = false, iosStandalone = false } = {}) {
  const storage = new Map();
  const listeners = {};
  const prompt = {
    hidden: false,
    attributes: {},
    classList: { remove(name) { if (name === 'show') prompt.hidden = true; } },
    setAttribute(name, value) { prompt.attributes[name] = value; },
  };
  const badge = { textContent: '', style: {} };
  let legacyCalls = 0;
  const media = { matches: standalone, addEventListener() {} };
  const context = {
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    document: { getElementById(id) { return id === 'installPrompt' ? prompt : id === 'pwaInstallBadge' ? badge : null; } },
    navigator: { standalone: iosStandalone },
    deferredInstallPrompt: null,
  };
  context.window = {
    matchMedia() { return media; },
    showInstallPrompt() { legacyCalls += 1; },
    showToast() {},
    addEventListener(type, listener) { listeners[type] = listener; },
  };
  vm.runInNewContext(runtimeJavascript(), context, { filename: RUNTIME_MARKER });
  return { context, storage, listeners, prompt, badge, legacyCalls: () => legacyCalls };
}

function loadServiceWorker({ fetchImpl, cachedIndex, cachedStatic } = {}) {
  const listeners = {};
  let installedAssets = null;
  const cache = {
    async addAll(assets) { installedAssets = [...assets]; },
    async put() {},
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      if (cachedStatic && Object.prototype.hasOwnProperty.call(cachedStatic, key)) return cachedStatic[key];
      return undefined;
    },
  };
  const caches = {
    async open() { return cache; },
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      if (key === '/index.html' && cachedIndex) return cachedIndex;
      return cache.match(request);
    },
    async keys() { return []; },
    async delete() { return true; },
  };
  const self = {
    location: { origin: 'https://preview.example' },
    addEventListener(type, listener) { listeners[type] = listener; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    registration: { showNotification: async () => {} },
  };
  const context = {
    console,
    module: { exports: {} },
    exports: {},
    self,
    clients: { matchAll: async () => [], openWindow: async () => {} },
    caches,
    fetch: fetchImpl || (async () => new Response('{}', { status: 200 })),
    Request, Response, Headers, URL, setTimeout, clearTimeout, Date, Promise,
  };
  const source = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8')
    .replace(
      "const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */",
      "const BACKEND_ORIGIN = 'https://backend.example';",
    );
  vm.runInNewContext(source, context, { filename: 'sw.js' });
  return { listeners, installedAssets: () => installedAssets, mod: context.module.exports };
}

test('build hardening is injected once before body close', () => {
  const once = applyPwaInstallHardening('<html><body>Julvox</body></html>');
  const twice = applyPwaInstallHardening(once);
  assert.equal((once.match(new RegExp(RUNTIME_MARKER, 'g')) || []).length, 1);
  assert.equal(twice, once);
  assert.ok(once.indexOf(RUNTIME_MARKER) < once.indexOf('</body>'));
});

test('automatic install banner is suppressed when Chrome has no beforeinstallprompt', () => {
  const loaded = loadInstallRuntime();
  loaded.context.window.showInstallPrompt(false);
  assert.equal(loaded.legacyCalls(), 0);
  assert.equal(loaded.prompt.hidden, true);
});

test('appinstalled and standalone launches persist the installed state', () => {
  const loaded = loadInstallRuntime();
  loaded.listeners.appinstalled();
  assert.equal(loaded.storage.get(INSTALL_STATE_KEY), '1');
  loaded.context.window.showInstallPrompt(false);
  assert.equal(loaded.legacyCalls(), 0);
  assert.equal(loaded.badge.textContent, '✅ Installé');

  const standalone = loadInstallRuntime({ standalone: true });
  assert.equal(standalone.storage.get(INSTALL_STATE_KEY), '1');
  assert.equal(standalone.badge.textContent, '✅ Installé');

  const ios = loadInstallRuntime({ iosStandalone: true });
  assert.equal(ios.storage.get(INSTALL_STATE_KEY), '1');
});

test('a real beforeinstallprompt preserves the native installation path and clears stale state', () => {
  const loaded = loadInstallRuntime();
  loaded.listeners.appinstalled();
  assert.equal(loaded.storage.get(INSTALL_STATE_KEY), '1');
  loaded.listeners.beforeinstallprompt();
  assert.equal(loaded.storage.has(INSTALL_STATE_KEY), false);
  loaded.context.deferredInstallPrompt = { prompt() {} };
  loaded.context.window.showInstallPrompt(false);
  assert.equal(loaded.legacyCalls(), 1);
});

test('service worker atomically precaches the essential app shell', async () => {
  const loaded = loadServiceWorker();
  let promise;
  loaded.listeners.install({ waitUntil(value) { promise = value; } });
  await promise;
  const assets = loaded.installedAssets();
  assert.ok(Array.isArray(assets));
  for (const asset of STATIC_SHELL_ASSETS) {
    assert.ok(assets.includes(asset), `missing shell asset ${asset}`);
  }
  assert.equal(assets.some(asset => /fonts\.googleapis\.com/.test(asset)), false);
  assert.equal(loaded.mod.CACHE_VERSION, 'v17');
  assert.equal(loaded.mod.CACHE_REVISION, 'offline-shell-01');
  assert.match(loaded.mod.CACHE_STATIC, /v17-offline-shell-01$/);
});

test('offline navigation returns cached Julvox shell instead of the 503 fallback', async () => {
  const cachedIndex = new Response('<!doctype html><title>Julvox</title><nav>Accueil</nav>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  const loaded = loadServiceWorker({
    cachedIndex,
    fetchImpl: async () => { throw new Error('airplane mode'); },
  });
  let responsePromise;
  loaded.listeners.fetch({
    request: { url: 'https://preview.example/?utm_source=pwa', method: 'GET', mode: 'navigate' },
    respondWith(value) { responsePromise = value; },
  });
  const response = await responsePromise;
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Julvox/);
});

test('same-origin static resources are served from cache while offline', async () => {
  const cachedScript = new Response('window.JULVOX_RUNTIME_CONFIG={};', { status: 200 });
  const loaded = loadServiceWorker({
    cachedStatic: { 'https://preview.example/runtime-config.js': cachedScript },
    fetchImpl: async () => { throw new Error('airplane mode'); },
  });
  let responsePromise;
  loaded.listeners.fetch({
    request: { url: 'https://preview.example/runtime-config.js', method: 'GET', mode: 'same-origin' },
    respondWith(value) { responsePromise = value; },
  });
  const response = await responsePromise;
  assert.equal(response.status, 200);
  assert.match(await response.text(), /JULVOX_RUNTIME_CONFIG/);
});

test('post-brand service-worker hardening restores the full offline shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
  const branded = source.replace(
    /const STATIC_ASSETS = \[[\s\S]*?\];/,
    `const STATIC_ASSETS = ${JSON.stringify([
      '/manifest.json',
      '/brand/julvox-logo-horizontal.svg',
      '/brand/julvox-logo-horizontal-negative.svg',
      '/brand/julvox-glyph-small.svg',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/julvox-favicon-16-transparent.png',
      '/icons/julvox-favicon-32-transparent.png',
      'https://fonts.googleapis.com/css?family=Inter',
    ], null, 2)};`,
  );
  const hardened = applyOfflineShellToServiceWorker(branded);
  for (const asset of STATIC_SHELL_ASSETS) assert.ok(hardened.includes(`"${asset}"`));
  const block = hardened.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(block);
  assert.doesNotMatch(block[1], /fonts\.googleapis\.com/);
});

test('manifest, frontend contract and service-worker cache major stay aligned', () => {
  const sw = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
  const contract = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/runtime-contract.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../../manifest.json'), 'utf8'));
  const expectedCacheVersion = `v${contract.application.frontend_version.split('.')[0]}`;
  assert.equal(contract.pwa.cache_version, expectedCacheVersion);
  assert.match(sw, new RegExp(`const CACHE_VERSION = '${contract.pwa.cache_version}'`));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  assert.match(manifest.start_url, /^\//);
});
