const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourceTemplate = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/runtime-contract.json'), 'utf8'));
const backendOrigin = new URL(contract.backend.api_base_url).origin;
const SOURCE_ANCHOR = "const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */";
const source = sourceTemplate.replace(SOURCE_ANCHOR, `const BACKEND_ORIGIN = '${backendOrigin}';`);
if (source === sourceTemplate) throw new Error('Service worker backend build anchor is missing from the test source');

function loadServiceWorker(overrides = {}) {
  const listeners = {};
  const cacheStores = new Map();
  const deleted = [];
  const caches = overrides.caches || {
    async open(name) {
      if (!cacheStores.has(name)) {
        const values = new Map();
        cacheStores.set(name, {
          values,
          async put(request, response) { values.set(typeof request === 'string' ? request : request.url, response); },
          async match(request) { return values.get(typeof request === 'string' ? request : request.url); },
          async addAll() {},
        });
      }
      return cacheStores.get(name);
    },
    async match(request) {
      for (const cache of cacheStores.values()) {
        const value = await cache.match(request);
        if (value) return value;
      }
      return undefined;
    },
    async keys() { return ['dealscan-v17', 'dealscan-static-v16', 'other-cache']; },
    async delete(key) { deleted.push(key); return true; },
  };
  const self = {
    addEventListener(type, listener) { listeners[type] = listener; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    registration: { showNotification: async () => {} },
  };
  const context = {
    console, module: { exports: {} }, exports: {},
    self, clients: { matchAll: async () => [], openWindow: async () => {} },
    caches,
    fetch: overrides.fetch || (async () => new Response('{}', { status: 200 })),
    Request, Response, Headers, URL, setTimeout, clearTimeout, Date, Promise,
  };
  vm.runInNewContext(source, context, { filename: 'sw.js' });
  return { mod: context.module.exports, listeners, cacheStores, deleted, context };
}

test('only unauthenticated public GET requests are cacheable', () => {
  const { mod } = loadServiceWorker();
  assert.equal(mod.isCacheablePublicApiRequest(new Request(`${backendOrigin}/deals?limit=2`)), true);
  assert.equal(mod.isCacheablePublicApiRequest(new Request(`${backendOrigin}/deals`, { method: 'POST' })), false);
  assert.equal(mod.isCacheablePublicApiRequest(new Request(`${backendOrigin}/deals`, { headers: { Authorization: 'Bearer secret' } })), false);
  assert.equal(mod.isCacheablePublicApiRequest(new Request(`${backendOrigin}/deals?access_token=x`)), false);
  assert.equal(mod.isCacheablePublicApiRequest(new Request(`${backendOrigin}/deals`, { credentials: 'include' })), false);
  assert.equal(mod.isCacheablePublicApiRequest(new Request(`${backendOrigin}/account/profile`)), false);
  assert.equal(mod.isCacheablePublicApiRequest(new Request('https://other.test/deals')), false);
});

test('a public GET is cached but a mutation and authenticated GET are network-only', async () => {
  let fetches = 0;
  const loaded = loadServiceWorker({ fetch: async request => { fetches += 1; return new Response(JSON.stringify({ url: request.url }), { status: 200 }); } });
  const publicRequest = new Request(`${backendOrigin}/deals`);
  await loaded.mod.networkFirstPublicGet(publicRequest, loaded.mod.CACHE_NAME, 60);
  const cache = loaded.cacheStores.get(loaded.mod.CACHE_NAME);
  assert.ok(await cache.match(publicRequest));

  const mutation = new Request(`${backendOrigin}/deals/1/vote`, { method: 'POST' });
  const authenticated = new Request(`${backendOrigin}/deals`, { headers: { Authorization: 'Bearer x' } });
  assert.equal((await loaded.mod.networkOnlyApi(mutation)).status, 200);
  assert.equal((await loaded.mod.networkOnlyApi(authenticated)).status, 200);
  assert.equal(fetches, 3);
  assert.equal(await cache.match(mutation), undefined);
  assert.equal(cache.values.size, 2, 'only the public GET and its timestamp are cached');
});

test('offline API failure is 503 and never fabricates an empty deals list', async () => {
  const { mod } = loadServiceWorker({ fetch: async () => { throw new Error('offline'); } });
  const response = await mod.networkOnlyApi(new Request(`${backendOrigin}/account/profile`));
  assert.equal(response.status, 503);
  assert.match(response.headers.get('Content-Type'), /application\/json/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const data = await response.json();
  assert.equal(data.error, 'offline');
  assert.equal('deals' in data, false);
});

test('expired or unverifiable public cache is returned as 504, not 200', async () => {
  const loaded = loadServiceWorker({ fetch: async () => { throw new Error('offline'); } });
  const request = new Request(`${backendOrigin}/deals`);
  const cache = await loaded.context.caches.open(loaded.mod.CACHE_NAME);
  await cache.put(request, new Response('{"deals":[{"id":1}]}', { status: 200 }));
  let response = await loaded.mod.networkFirstPublicGet(request, loaded.mod.CACHE_NAME, 60);
  assert.equal(response.status, 504);
  await cache.put(new Request(`${request.url}__julvox_ts`), new Response(String(Date.now() - 120 * 60_000)));
  response = await loaded.mod.networkFirstPublicGet(request, loaded.mod.CACHE_NAME, 60);
  assert.equal(response.status, 504);
});


test('private responses and external notification URLs are rejected', () => {
  const { mod } = loadServiceWorker();
  assert.equal(mod.isCacheablePublicResponse(new Response('{}', { status: 200, headers: { 'Cache-Control': 'private' } })), false);
  assert.equal(mod.isCacheablePublicResponse(new Response('{}', { status: 200, headers: { Vary: 'Authorization' } })), false);
  assert.equal(mod.isCacheablePublicResponse(new Response('{}', { status: 200 })), true);
  assert.equal(mod.safePublicUrl('https://evil.invalid/phish'), 'https://julvox.com');
  assert.equal(mod.safePublicUrl('/?deal=1'), 'https://julvox.com/?deal=1');
});

test('activation removes legacy and unrelated caches while keeping current caches', async () => {
  const loaded = loadServiceWorker();
  let promise;
  loaded.listeners.activate({ waitUntil(value) { promise = value; } });
  await promise;
  assert.deepEqual(new Set(loaded.deleted), new Set(['dealscan-v17', 'dealscan-static-v16', 'other-cache']));
  assert.equal(loaded.deleted.includes(loaded.mod.CACHE_NAME), false);
  assert.equal(loaded.deleted.includes(loaded.mod.CACHE_STATIC), false);
});
