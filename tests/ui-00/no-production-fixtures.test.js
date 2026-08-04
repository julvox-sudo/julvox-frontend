const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanProductionTruth } = require('../../scripts/verify-production-truth.js');

function fixture(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui00-fixture-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  const files = {
    'index.html': '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>',
    'enhancements_v3.js': '',
    'api-client.js': '',
    'ui-00-production-truth.js': 'runConfirmedMutation isConfirmedServerResult data?.rgpd === true subscription.unsubscribe()',
    'sw.js': 'status: 503; status: 504;',
    ...overrides,
  };
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'dist', name), content);
  return { dir, failures: scanProductionTruth(undefined, dir) };
}

test('forbidden demo fixture is detected', () => {
  const { failures } = fixture({ 'index.html': '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>getDemoWishlist' });
  assert.ok(failures.some(value => value.includes('getDemoWishlist')));
});

test('named wishlist demo products are detected', () => {
  const { failures } = fixture({ 'index.html': '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>MacBook Air M3 PS5 Slim Nike Air Max 270' });
  assert.ok(failures.some(value => value.includes('MacBook Air M3')));
  assert.ok(failures.some(value => value.includes('PS5 Slim')));
  assert.ok(failures.some(value => value.includes('Nike Air Max 270')));
});

test('simulated history and arbitrary scores are detected', () => {
  const { failures } = fixture({ 'index.html': '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>generateSimulatedHistory(); const score = deal.novadeal_score || 50;' });
  assert.ok(failures.some(value => value.includes('generateSimulatedHistory')));
  assert.ok(failures.some(value => value.includes('arbitrary displayed score')));
});

test('random vote fallback and direct backend calls are detected', () => {
  const { failures } = fixture({ 'index.html': '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>function voteDeal(){ updateVoteUI(1,{up:Math.random()}); } fetchWithTimeout(API + "/deals");' });
  assert.ok(failures.some(value => value.includes('random vote')));
  assert.ok(failures.some(value => value.includes('direct backend fetch')));
});

test('hard-coded Railway fallback is detected', () => {
  const { failures } = fixture({ 'index.html': '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>const API = runtime || "https://example.up.railway.app";' });
  assert.ok(failures.some(value => value.includes('Railway fallback')));
});
