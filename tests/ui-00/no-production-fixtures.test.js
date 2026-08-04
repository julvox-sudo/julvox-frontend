const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanProductionTruth } = require('../../scripts/verify-production-truth.js');

function baseFiles() {
  return {
    'index.html': `<!-- ui-00-production-truth:applied-v3 --><script src="/runtime-config.js"></script><script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script><script src="/enhancements_v3.js" defer></script>/* ui-00-final-product-truth:applied-v3 *//* ui-00-residual-product-truth:applied-v3 */function ui00ScoreLabel(value){return value;}`,
    'enhancements_v3.js': '/* ui-00-production-truth:applied-v3 */',
    'api-client.js': `configurable: false; candidate.username || candidate.password; patch: (path, body, opts = {})`,
    'ui-00-production-truth.js': `/* ui-00-runtime:composed-v1 */ JULVOX_INSTALL_UI00_MUTATIONS withMutationLock Number.isFinite(data?.votes_validate) && Number.isFinite(data?.votes_reject) Number.isFinite(data?.votes_ok) && Number.isFinite(data?.votes_ko) response?.status === 204 || data?.rgpd === true subscription.unsubscribe() CAPABILITY_SURFACES CAPABILITY_ENTRYPOINTS runtime.runtime.environment === 'demo'`,
    'sw.js': `request.method !== 'GET'; request.headers?.has?.('Authorization'); request.credentials === 'include'; isCacheablePublicResponse Set-Cookie no-store|private safePublicUrl dealscan-public-api-; status: 503; status: 504; 'Cache-Control': 'no-store';`,
  };
}
function fixture(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui00-fixture-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  for (const [name, content] of Object.entries({ ...baseFiles(), ...overrides })) fs.writeFileSync(path.join(dir, 'dist', name), content);
  return scanProductionTruth(undefined, dir);
}

test('known and renamed demo fixtures are detected', () => {
  for (const token of ['getDemoWishlist', 'MacBook Air M3', 'generateSimulatedHistory', 'getLocalAIResponse', 'getDefaultProPlans']) {
    const failures = fixture({ 'index.html': baseFiles()['index.html'] + token });
    assert.ok(failures.some(value => value.includes(token)), token);
  }
});

test('random business data, arbitrary scores and direct calls are detected', () => {
  const failures = fixture({ 'index.html': baseFiles()['index.html'] + `function voteDeal(){updateVoteUI(1,{up:Math.random()});} const score=deal.score||75; fetchWithRetry(API + '/deals');` });
  assert.ok(failures.some(value => value.includes('random')));
  assert.ok(failures.some(value => value.includes('score')));
  assert.ok(failures.some(value => value.includes('fetch')));
});

test('wrong script order and unsafe service worker behavior are detected', () => {
  const files = baseFiles();
  const wrong = files['index.html'].replace('<script src="/ui-00-production-truth.js" defer></script><script src="/enhancements_v3.js" defer></script>', '<script src="/enhancements_v3.js" defer></script><script src="/ui-00-production-truth.js" defer></script>');
  let failures = fixture({ 'index.html': wrong });
  assert.ok(failures.some(value => value.includes('load order')));
  failures = fixture({ 'sw.js': 'status: 503; status: 504;' });
  assert.ok(failures.some(value => value.includes('mutations') || value.includes('authenticated')));
});
