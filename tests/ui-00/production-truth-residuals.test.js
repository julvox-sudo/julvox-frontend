'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  hasDemoOnlyGate,
  hasHonestServiceWorkerErrors,
  scanProductionTruth,
} = require('../../scripts/verify-production-truth.js');
const {
  removeFabricatedVerificationTiming,
  removeNotificationScoreFallback,
} = require('../../scripts/ui00-transforms/stage-3.js');

const root = path.join(__dirname, '../..');

function baseFiles() {
  return {
    'index.html': `<!-- ui-00-production-truth:applied-v3 --><script src="/runtime-config.js"></script><script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script><script src="/enhancements_v3.js" defer></script>/* ui-00-final-product-truth:applied-v3 *//* ui-00-residual-product-truth:applied-v3 */function ui00ScoreLabel(value){return value;}`,
    'enhancements_v3.js': '/* ui-00-production-truth:applied-v3 */',
    'api-client.js': `configurable: false; candidate.username || candidate.password; patch: (path, body, opts = {})`,
    'ui-00-production-truth.js': `/* ui-00-runtime:composed-v1 */ JULVOX_INSTALL_UI00_MUTATIONS withMutationLock Number.isFinite(data?.votes_validate) && Number.isFinite(data?.votes_reject) Number.isFinite(data?.votes_ok) && Number.isFinite(data?.votes_ko) response?.status === 200 data?.status === 'anonymized' data?.scope === 'profile_and_covered_local_identity_graph' data?.full_erasure === false subscription.unsubscribe() CAPABILITY_SURFACES CAPABILITY_ENTRYPOINTS const runtime=()=>globalThis.JULVOX_RUNTIME_CONFIG; const isDemoMode=()=>runtime()?.runtime?.environment==='demo'; function getCapabilityStatus(definition){return VALID_CAPABILITY_STATUSES.includes(definition?.status)?definition.status:'unavailable';} function isCapabilityAvailable(status){return status!=='unavailable'&&(status!=='demo-only'||isDemoMode());}`,
    'sw.js': `function jsonError(status,error,message){return new Response(JSON.stringify({error,message}),{status,headers:{'Cache-Control':'no-store'}});} request.method !== 'GET'; request.headers?.has?.('Authorization'); request.credentials === 'include'; isCacheablePublicResponse Set-Cookie no-store|private safePublicUrl julvox-public-api-; jsonError(503,'offline','x'); jsonError(504,'offline_stale','x');`,
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
  assert.doesNotMatch(stage, /getDemoLeaderboard|getDemoCommDeals|getDemoScanResult|getDemoAchievements|injectLocalAnalysis/);
});

test('fabricated verification timing is removed deterministically and idempotently', () => {
  const source = [
    'function dealCard(ok) {',
    '  const mins   = Math.floor(Math.random() * 58 + 1);',
    '  return `',
    '      ${ok ? `<div class="deal-verified">✓ Vérifié il y a ${mins} min</div>` : \'\'}',
    '  `;',
    '}',
  ].join('\n') + '\n';
  const transformed = removeFabricatedVerificationTiming(source);
  assert.doesNotMatch(transformed, /Math\.random|Vérifié il y a|\bmins\b/);
  assert.equal(removeFabricatedVerificationTiming(transformed), transformed);
});

test('notification score fallback uses the existing bounded score primitive', () => {
  const source = `<span>★${'${deal.novadeal_score||0}'}</span>`;
  const transformed = removeNotificationScoreFallback(source);
  assert.doesNotMatch(transformed, /novadeal_score\|\|0/);
  assert.match(transformed, /ui00NumericScore\(deal\.novadeal_score\).*Score indisponible/);
  assert.equal(removeNotificationScoreFallback(transformed), transformed);
});

test('production truth accepts the current semantic demo gate and jsonError 503/504 contract', () => {
  const files = baseFiles();
  assert.equal(hasDemoOnlyGate(files['ui-00-production-truth.js']), true);
  assert.equal(hasHonestServiceWorkerErrors(files['sw.js']), true);
  assert.deepEqual(scan(), []);
});

test('demo-only bypasses and unknown statuses that do not fail unavailable are rejected', () => {
  const files = baseFiles();
  for (const broken of [
    files['ui-00-production-truth.js'].replace("environment==='demo'", "environment==='production'"),
    files['ui-00-production-truth.js'].replace("status!=='demo-only'||isDemoMode()", "status!=='demo-only'||true"),
    files['ui-00-production-truth.js'].replace("definition.status:'unavailable'", "definition.status:'supported'"),
  ]) {
    assert.equal(hasDemoOnlyGate(broken), false);
    assert.ok(scan({ 'ui-00-production-truth.js': broken }).some(value => value.includes('demo-only environment gate')));
  }
});

test('service worker status mutations to 200 or a helper that ignores status are rejected', () => {
  const files = baseFiles();
  for (const broken of [
    files['sw.js'].replace("jsonError(503,'offline'", "jsonError(200,'offline'"),
    files['sw.js'].replace("jsonError(504,'offline_stale'", "jsonError(200,'offline_stale'"),
    files['sw.js'].replace('{status,headers:', '{status:200,headers:'),
  ]) {
    assert.equal(hasHonestServiceWorkerErrors(broken), false);
    assert.ok(scan({ 'sw.js': broken }).some(value => value.includes('service worker 503/504')));
  }
});

test('renaming a demo provider does not hide known fabricated production data', () => {
  const failures = scan({
    'index.html': `${baseFiles()['index.html']}function renamedProvider(){return {uid:'julien...'};}`,
  });
  assert.ok(failures.some(value => value.includes("uid:'julien...'")));
});
