const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiClient, getRuntimeApiBaseUrl, resolveApiUrl } = require('../../api-client.js');

function runtime(apiBaseUrl = 'https://api.example.test') {
  return { JULVOX_RUNTIME_CONFIG: { backend: { apiBaseUrl } } };
}
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

test('uses only the own runtime apiBaseUrl property', async () => {
  let requested;
  const globalObject = runtime();
  const client = createApiClient({ globalObject, fetchImpl: async url => { requested = url; return jsonResponse({ deals: [1] }); } });
  const result = await client.get('/deals');
  assert.equal(requested, 'https://api.example.test/deals');
  assert.equal(result.kind, 'success');
  assert.equal(getRuntimeApiBaseUrl(globalObject), 'https://api.example.test');
  const inherited = Object.create({ JULVOX_RUNTIME_CONFIG: { backend: { apiBaseUrl: 'https://evil.test' } } });
  assert.equal(getRuntimeApiBaseUrl(inherited), null);
});

test('refuses missing, empty, malformed and credentialed runtime URLs without a request', async () => {
  for (const globalObject of [
    {},
    runtime(''),
    runtime('not a url'),
    runtime('ftp://api.example.test'),
    runtime('https://user:secret@api.example.test'),
    runtime('https://api.example.test/v1?token=x'),
    runtime('https://api.example.test/v1#fragment'),
  ]) {
    let called = false;
    const result = await createApiClient({ globalObject, fetchImpl: async () => { called = true; } }).get('/deals');
    assert.equal(called, false);
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'network-error');
  }
});

test('normalizes a trailing slash and preserves a configured path prefix', () => {
  assert.equal(getRuntimeApiBaseUrl(runtime('https://api.example.test/v1/')), 'https://api.example.test/v1');
  assert.equal(resolveApiUrl('/deals?q=été%20bio', runtime('https://api.example.test/v1/')), 'https://api.example.test/v1/deals?q=%C3%A9t%C3%A9%20bio');
  assert.equal(resolveApiUrl('?health=1', runtime('https://api.example.test/v1/')), 'https://api.example.test/v1?health=1');
  assert.equal(resolveApiUrl('https://api.example.test/v1/deals?limit=2', runtime('https://api.example.test/v1')), 'https://api.example.test/v1/deals?limit=2');
});

test('refuses other origins, protocols, credentials and path traversal', () => {
  const globalObject = runtime('https://api.example.test/v1');
  for (const candidate of [
    'https://api.example.test.evil.invalid/v1/deals',
    'https://other.example.test/v1/deals',
    'ftp://api.example.test/v1/deals',
    'https://user:secret@api.example.test/v1/deals',
    '../admin',
    '%2e%2e/admin',
    '%252e%252e/admin',
    '/deals\\..\\admin',
    'https://api.example.test/v2/deals',
  ]) assert.equal(resolveApiUrl(candidate, globalObject), null, candidate);
});

test('exposes GET POST PUT PATCH DELETE and preserves caller headers', async () => {
  const calls = [];
  const client = createApiClient({
    globalObject: runtime(),
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init.method, body: init.body, header: init.headers.get('X-Test'), contentType: init.headers.get('Content-Type') });
      return jsonResponse({ id: 1 });
    },
  });
  await client.get('/a', { headers: { 'X-Test': 'yes' } });
  await client.post('/b', { value: 1 });
  await client.put('/c', undefined);
  await client.patch('/d', { value: 2 });
  await client.delete('/e');
  assert.deepEqual(calls.map(call => call.method), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  assert.equal(calls[0].header, 'yes');
  assert.equal(calls[1].body, JSON.stringify({ value: 1 }));
  assert.equal(calls[1].contentType, 'application/json');
  assert.equal(calls[2].body, undefined);
});

test('preserves string and URLSearchParams request bodies', async () => {
  const bodies = [];
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async (_url, init) => { bodies.push(init.body); return jsonResponse({ ok: true }); } });
  await client.post('/text', 'raw-body', { headers: { 'Content-Type': 'text/plain' } });
  const params = new URLSearchParams({ q: 'été' });
  await client.post('/form', params);
  assert.equal(bodies[0], 'raw-body');
  assert.equal(bodies[1], params);
});

test('adds a non-empty bearer token but preserves an existing Authorization header', async () => {
  const values = [];
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async (_url, init) => { values.push(init.headers.get('Authorization')); return jsonResponse({ ok: true }); } });
  await client.get('/a', { token: ' jwt-value ' });
  await client.get('/b', { token: '' });
  await client.get('/c', { token: 'new', headers: { Authorization: 'Custom token' } });
  assert.deepEqual(values, ['Bearer jwt-value', null, 'Custom token']);
});

test('classifies success, empty JSON and 204 correctly', async () => {
  const responses = [jsonResponse({ deals: [{ id: 1 }] }), jsonResponse({ deals: [] }), new Response(null, { status: 204 })];
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => responses.shift() });
  assert.equal((await client.get('/deals', { isEmpty: data => data.deals.length === 0 })).kind, 'success');
  assert.equal((await client.get('/deals', { isEmpty: data => data.deals.length === 0 })).kind, 'empty');
  const empty = await client.delete('/resource');
  assert.equal(empty.kind, 'empty');
  assert.equal(empty.status, 204);
});

test('requires explicit business confirmation for 204 and incomplete 200 responses', async () => {
  const responses = [new Response(null, { status: 204 }), new Response(null, { status: 204 }), jsonResponse({ message: 'ok' })];
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async () => responses.shift() });
  assert.equal((await client.delete('/a', { confirm: () => false })).kind, 'parse-error');
  assert.equal((await client.delete('/b', { confirm: (_data, response) => response.status === 204 })).ok, true);
  assert.equal((await client.post('/c', {}, { confirm: data => Number.isInteger(data.alert_id) })).kind, 'parse-error');
});

for (const status of [304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504]) {
  test(`preserves HTTP status ${status} without exposing backend details`, async () => {
    const response = status === 304
      ? new Response(null, { status })
      : jsonResponse({ detail: 'Traceback: /secret/path token=abc' }, status, status === 429 ? { 'Retry-After': '30' } : {});
    const result = await createApiClient({ globalObject: runtime(), fetchImpl: async () => response }).get('/failure');
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'http-error');
    assert.equal(result.status, status);
    assert.doesNotMatch(result.message, /Traceback|secret|token=abc/);
    assert.equal(result.data, null);
    if (status === 429) assert.equal(result.retryAfter, '30');
  });
}

test('classifies invalid JSON, text response and body read failure honestly', async () => {
  const invalid = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response('{bad', { status: 200 }) });
  assert.equal((await invalid.get('/bad-json')).kind, 'parse-error');
  const text = createApiClient({ globalObject: runtime(), fetchImpl: async () => new Response('plain text', { status: 200 }) });
  assert.equal((await text.get('/text')).kind, 'parse-error');
  const brokenResponse = { ok: true, status: 200, headers: new Headers(), text: async () => { throw new Error('stream secret'); } };
  const broken = createApiClient({ globalObject: runtime(), fetchImpl: async () => brokenResponse });
  const result = await broken.get('/broken');
  assert.equal(result.kind, 'network-error');
  assert.doesNotMatch(result.message, /stream secret/);
});

test('classifies network failure, timeout and caller cancellation separately', async () => {
  const network = createApiClient({ globalObject: runtime(), fetchImpl: async () => { throw new Error('socket secret'); } });
  const networkResult = await network.get('/network');
  assert.equal(networkResult.kind, 'network-error');
  assert.equal(networkResult.timedOut, false);
  assert.equal(networkResult.aborted, false);

  const hangingFetch = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  const timed = createApiClient({ globalObject: runtime(), timeoutMs: 5, fetchImpl: hangingFetch });
  const timeoutResult = await timed.get('/slow');
  assert.equal(timeoutResult.timedOut, true);
  assert.equal(timeoutResult.aborted, false);

  const controller = new AbortController();
  const cancelled = createApiClient({ globalObject: runtime(), timeoutMs: 500, fetchImpl: hangingFetch });
  const pending = cancelled.get('/cancel', { signal: controller.signal });
  controller.abort('user');
  const cancelledResult = await pending;
  assert.equal(cancelledResult.timedOut, false);
  assert.equal(cancelledResult.aborted, true);
});

test('fetchResponse supports legacy timeout and does not leak internal options to fetch', async () => {
  let init;
  const client = createApiClient({ globalObject: runtime(), fetchImpl: async (_url, value) => { init = value; return jsonResponse({ ok: true }); } });
  await client.fetchResponse('/raw', { token: 'abc', confirm: () => true, isEmpty: () => false, timeoutMs: 50 }, 1000);
  assert.equal(init.headers.get('Authorization'), 'Bearer abc');
  assert.equal('confirm' in init, false);
  assert.equal('isEmpty' in init, false);
  assert.equal('timeoutMs' in init, false);
});
