'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanProductionTruth } = require('../../scripts/verify-production-truth.js');

const root = path.join(__dirname, '../..');

function baseFiles() {
  return {
    'index.html': `<!-- ui-00-production-truth:applied-v3 --><script src="/runtime-config.js"></script><script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script><script src="/enhancements_v3.js" defer></script>/* ui-00-final-product-truth:applied-v3 *//* ui-00-residual-product-truth:applied-v3 */function ui00ScoreLabel(value){return value;}`,
    'enhancements_v3.js': '/* ui-00-production-truth:applied-v3 */',
    'api-client.js': `configurable: false; candidate.username || candidate.password; patch: (path, body, opts = {})`,
    'ui-00-production-truth.js': `/* ui-00-runtime:composed-v1 */ JULVOX_INSTALL_UI00_MUTATIONS withMutationLock Number.isFinite(data?.votes_validate) && Number.isFinite(data?.votes_reject) Number.isFinite(data?.votes_ok) && Number.isFinite(data?.votes_ko) response?.status === 204 || data?.rgpd === true subscription.unsubscribe() CAPABILITY_SURFACES CAPABILITY_ENTRYPOINTS const runtime=()=>globalThis.JULVOX_RUNTIME_CONFIG; const isDemoMode=()=>runtime()?.runtime?.environment==='demo'; function getCapabilityStatus(definition){return VALID_CAPABILITY_STATUSES.includes(definition?.status)?definition.status:'unavailable';} function isCapabilityAvailable(status){return status!=='unavailable'&&(status!=='demo-only'||isDemoMode());}`,
    'sw.js': `function jsonError(status,error,message){return new Response(JSON.stringify({error,message}),{status,headers:{'Cache-Control':'no-store'}});} request.method !== 'GET'; request.headers?.has?.('Authorization'); request.credentials === 'include'; isCacheablePublicResponse Set-Cookie no-store|private safePublicUrl dealscan-public-api-; jsonError(503,'offline','x'); jsonError(504,'offline_stale','x');`,
  };
}

function scan(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui00-production-residuals-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  for (const [name, content] of Object.entries({ ...baseFiles(), ...overrides })) {
    fs.writeFileSync(path.join(dir, 'dist', name), content);
  }
  return scanProductionTruth(undefined, dir);
}

test('all five historical demo consumers have explicit production transformations', () => {
  const stage = fs.readFileSync(path.join(root, 'scripts/ui00-transforms/stage-2.js'), 'utf8');
  for (const name of ['loadLeaderboard', 'loadCommDeals', 'lookupBarcodeValue', 'loadAchievements', 'enrichDealModal']) {
    assert.match(stage, new RegExp(`replaceNamedFunction\\(html, '${name}'`), name);
  }
});

test('production transforms explicitly remove fabricated verification time and the notification score fallback', () => {
  const stages = [3, 5].map(number => fs.readFileSync(path.join(root, `scripts/ui00-transforms/stage-${number}.js`), 'utf8')).join('\n');
  assert.match(stages, /random verification duration/);
  assert.match(stages, /new deal notification score fallback/);
});

test('production truth accepts the current semantic demo gate and jsonError 503\/504 contract', () => {
  const failures = scan();
  assert.equal(failures.some(value => value.includes('demo-only environment gate')), false, failures.join('\n'));
  assert.equal(failures.some(value => value.includes('service worker 503\/504')), false, failures.join('\n'));
});
