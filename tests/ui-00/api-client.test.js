const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiClient, getRuntimeApiBaseUrl, resolveApiUrl } = require('../../api-client.js');

function runtime() {
  return { JULVOX_RUNTIME_CONFIG: { backend: { apiBaseUrl: 'https://api.example.test' } } };
}
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

test('uses only the runtime API URL', async () => {
  let requested;
  const globalObject = runtime();
  const client = createApiClient({ globalObject, fetchImpl: async url => { requested = url; return jsonResponse({ deals: [1] }); } });
  const result = await client.get('/deals');
  assert.equal(requested, 'https://api.example.test/deals');
  assert.equal(result.kind, 'success');
  assert.equal(getRuntimeApiBaseUrl(globalObject), 'https://api.example.test');
});

test('refuses a missing runtime URL without fallback', async () => {
  let called = false;
  const client = createApiClient({ globalObject: {}, fetchImpl: async () => { called = true; } });
  const result = await client.get('/deals');
  assert.equal(called, false);
  assert.deepEqual({ ok: result.ok, status: result.status, kind: result.kind }, { ok: false, status: 0, kind: 'network-error' });
});

test('refuses an absolute URL outside the configured backend', () => {
  assert.equal(resolveApiUrl('https://api.example.test.evil.invalid/deals', runtime()), null);
  assert.equal(resolveApiUrl('https://other.example.test/deals', runtime()), null);
});

test('preserves a configured backend path prefix', () => {
  const globalObject = { JULVOX_RUNTIME_CONFIG: { backend: { apiBaseUrl: 'https://api.example.test/v1' } } };
  assert.equal(resolveApiUrl('/deals', globalObject), 'https://api.example.test/v1/deals');
  assert.equal(resolveApiUrl('https://api.example.test/v2/deals', globalObject), null);
});

test('classifies 200 with data as success', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => jsonResponse({ deals: [{ id: 1 }] }) });
  const result = await client.get('/deals', { isEmpty: data => data.deals.length === 0 });
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'success');
  assert.equal(result.status, 200);
});

test('classifies 200 without data as empty', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => jsonResponse({ deals: [] }) });
  const result = await client.get('/deals', { isEmpty: data => data.deals.length === 0 });
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'empty');
});

test('classifies 204 as empty', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response(null, { status: 204 }) });
  const result = await client.delete('/resource');
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'empty');
  assert.equal(result.status, 204);
});

test('requires explicit confirmation even for a 204 mutation', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response(null, { status: 204 }) });
  const rejected = await client.delete('/resource', { confirm: () => false });
  const accepted = await client.delete('/resource', { confirm: (_data, response) => response.status === 204 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.kind, 'parse-error');
  assert.equal(accepted.ok, true);
  assert.equal(accepted.kind, 'empty');
});

test('requires explicit confirmation for an empty 200 mutation response', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response('', { status: 200 }) });
  const result = await client.post('/resource', {}, { confirm: () => false });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'parse-error');
});

for (const status of [400, 401, 403, 404, 500]) {
  test(`preserves HTTP status ${status} without exposing server detail`, async () => {
    const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => jsonResponse({ detail: 'Traceback: secret path' }, status) });
    const result = await client.get('/failure');
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'http-error');
    assert.equal(result.status, status);
    assert.doesNotMatch(result.message, /Traceback|secret path/);
    assert.equal(result.data, null);
  });
}

test('preserves Retry-After for 429', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => jsonResponse({ detail: 'slow down' }, 429, { 'Retry-After': '30' }) });
  const result = await client.get('/limited');
  assert.equal(result.kind, 'http-error');
  assert.equal(result.status, 429);
  assert.equal(result.retryAfter, '30');
});

test('classifies a network failure', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => { throw new Error('socket secret'); } });
  const result = await client.get('/deals');
  assert.equal(result.kind, 'network-error');
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.message, /socket secret/);
});

test('classifies a timeout as network-error and marks it', async () => {
  const client = createApiClient({
    globalObject: runtime(),
    timeoutMs: 10,
    fetchImpl: (_url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }),
  });
  const result = await client.get('/slow');
  assert.equal(result.kind, 'network-error');
  assert.equal(result.timedOut, true);
});

test('classifies invalid JSON as parse-error', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response('{bad', { status: 200 }) });
  const result = await client.get('/bad-json');
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'parse-error');
});

test('classifies a non-JSON body as parse-error', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response('<html>error</html>', { status: 200 }) });
  const result = await client.get('/html');
  assert.equal(result.kind, 'parse-error');
});

test('sends the bearer token when provided', async () => {
  let authorization;
  const client = createApiClient({
    globalObject: runtime(),
    fetchImpl: async (_url, init) => {
      authorization = init.headers.get('Authorization');
      return jsonResponse({ message: 'ok' });
    },
  });
  await client.post('/alerts', { product_name: 'Produit' }, { token: 'jwt-value' });
  assert.equal(authorization, 'Bearer jwt-value');
});

test('rejects a mutation without minimum business confirmation', async () => {
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => jsonResponse({ message: 'ok' }) });
  const result = await client.post('/alerts', {}, { confirm: data => Number.isInteger(data.alert_id) });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'parse-error');
});
