const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyProductionTruth,
  HTML_MARKER,
  ENHANCEMENTS_MARKER,
  replaceNamedFunction,
} = require('../../scripts/apply-ui-00-production-truth.js');
const { finalizeHtml } = require('../../scripts/finalize-ui-00-production-truth.js');
const { finalizeResiduals } = require('../../scripts/finalize-ui-00-residuals.js');
const { composeUi00Runtime, MARKER: RUNTIME_MARKER } = require('../../scripts/compose-ui-00-runtime.js');

const removedFunctions = [
  'createAlert', 'createSmartAlertForDeal', 'deleteAlert', 'voteDeal',
  'submitCommunityDealNew', 'voteCommDeal', 'postDealComment', 'postCommComment',
  'submitReport', 'createSquad', 'joinSquad', 'addToWishlist', 'removeFromWishlist',
  'subscribeNewsletter', 'deleteAccount', 'votePromo',
  'getDemoCompareResults', 'getDemoLeaderboard', 'getDemoCommDeals', 'getDemoReport',
  'getDemoScanResult', 'getDemoWishlist', 'getDemoAchievements', 'generateSimulatedHistory',
  'localAnalyzeDeal', 'injectLocalAnalysis', 'getLocalCalendar', 'getDefaultProPlans',
  'getLocalAIResponse', 'getDefaultCbRates', 'fetchWithTimeout', 'fetchWithRetry',
  'buildDealsPrompt', 'buildPromosPrompt', 'buildFlashPrompt', 'callClaudeAI',
];
const replacedFunctions = [
  'loadWishlistItems', 'loadWishlist', '_loadAndRenderPriceChart', 'runDealAnalysis',
  'renderTrustDetail', 'loadSwipeFeed', 'loadTikTokScript', 'loadCalendar',
  'loadMyReputation', 'loadMyCommDeals', 'loadCommLeader', 'openProPage',
  'sendAIMessage', 'appendChatBubble', 'loadCashbackBalance', 'loadCashbackRates',
  'simulateCashback', 'renderDeals', 'startCountdownsLive', 'renderFlash',
  'openFlashPage', 'fetchFlashDeals', 'fetchFlashDealsFromClaude', 'renderMLRecommendations',
  'runCompareV2', 'loadProductComparison',
  'loadLeaderboard', 'loadCommDeals', 'lookupBarcodeValue', 'loadAchievements', 'enrichDealModal',
];

function sourceFixture() {
  const legacyConsumerBodies = {
    loadLeaderboard: 'return getDemoLeaderboard();',
    loadCommDeals: 'return getDemoCommDeals();',
    lookupBarcodeValue: 'return getDemoScanResult();',
    loadAchievements: 'return getDemoAchievements();',
    enrichDealModal: 'return injectLocalAnalysis();',
  };
  const functionStubs = [...removedFunctions, ...replacedFunctions, 'loadDealVotes']
    .map(name => `${name.startsWith('load') || name.startsWith('run') || name.startsWith('open') || name.startsWith('send') || name.startsWith('fetch') || name.startsWith('simulate') || name === 'enrichDealModal' ? 'async ' : ''}function ${name}(){ ${legacyConsumerBodies[name] || 'return null;'} }`)
    .join('\n');
  return `<!doctype html><html><head><script src="/runtime-config.js"></script></head><body>
    <input placeholder="Ex: MacBook Air M3, Sony WH-1000XM5…">
    <div class="live-pill"><div class="live-dot"></div>Live</div>
    <div class="live-pill"><div class="live-dot"></div>Live</div>
    <span>LIVE</span><span>deals vérifiés ✓</span>
    <script>const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';
    const FRENCH_SITES = { sample: ['x'] };
    const STORE_TRUST = { Shop: 82 };
    var _origOpenPromosPage = null;
    setTimeout(function(){ window.openPromosPage = async function(){}; }, 500);
    async function enableNotifPermission(){ return 'legacy-one'; }
    ${functionStubs}
    async function enableNotifPermission(){ return 'legacy-two'; }
    </script>
    <script src="/enhancements_v3.js" defer></script>
  </body></html>`;
}
function enhancementsFixture() {
  return `const STORE_TRUST_V3 = { Shop: 82 };\nasync function loadDynamicFlashDeals(){ return null; }\nconst label='LIVE';\nconst notificationScore='★\${deal.novadeal_score||0}';`;
}

test('the full transformation is idempotent and enforces script order', () => {
  const first = applyProductionTruth({ html: sourceFixture(), enhancements: enhancementsFixture() });
  const second = applyProductionTruth(first);
  assert.equal(second.html, first.html);
  assert.equal(second.enhancements, first.enhancements);
  assert.match(first.html, new RegExp(HTML_MARKER));
  assert.match(first.enhancements, new RegExp(ENHANCEMENTS_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const runtime = first.html.indexOf('/runtime-config.js');
  const api = first.html.indexOf('/api-client.js');
  const truth = first.html.indexOf('/ui-00-production-truth.js');
  const enhancements = first.html.indexOf('/enhancements_v3.js');
  assert.ok(runtime < api && api < truth && truth < enhancements);
  assert.doesNotMatch(first.html, /function\s+enableNotifPermission\s*\(/);
  assert.doesNotMatch(first.html, /getDemoLeaderboard|getDemoCommDeals|getDemoScanResult|getDemoAchievements|injectLocalAnalysis/);
  assert.doesNotMatch(first.enhancements, /novadeal_score\|\|0/);
  assert.match(first.enhancements, /Score indisponible/);
});

test('a missing required historical function fails the build transform', () => {
  const broken = sourceFixture().replace(/async function loadSwipeFeed\(\)\{ return null; \}/, '');
  assert.throws(() => applyProductionTruth({ html: broken, enhancements: enhancementsFixture() }), /loadSwipeFeed/);
});

test('notification duplicates are an explicit two-block invariant', () => {
  const one = sourceFixture().replace("async function enableNotifPermission(){ return 'legacy-two'; }", '');
  const three = sourceFixture().replace(
    "async function enableNotifPermission(){ return 'legacy-two'; }\n    </script>",
    "async function enableNotifPermission(){ return 'legacy-two'; }\n    async function enableNotifPermission(){ return 'legacy-three'; }\n    </script>",
  );
  assert.throws(() => applyProductionTruth({ html: one, enhancements: enhancementsFixture() }), /exactly 2 function enableNotifPermission, found 1/);
  assert.throws(() => applyProductionTruth({ html: three, enhancements: enhancementsFixture() }), /exactly 2 function enableNotifPermission, found 3/);
});

test('function parser ignores regex literals containing quotes and braces', () => {
  const source = `function renderFlash(){ const value = "a'b{}".replace(/['{}]/g, ''); return value; }\nfunction neighbor(){ return true; }`;
  const replaced = replaceNamedFunction(source, 'renderFlash', 'function renderFlash(){ return []; }');
  assert.match(replaced, /function renderFlash\(\)\{ return \[\]; \}/);
  assert.match(replaced, /function neighbor\(\)/);
  assert.doesNotMatch(replaced, /replace\(\/\['\{\}\]\//);
});

test('final score and residual transforms are byte-idempotent', () => {
  const applied = applyProductionTruth({ html: sourceFixture(), enhancements: enhancementsFixture() });
  const finalized = finalizeHtml(applied.html);
  assert.equal(finalizeHtml(finalized), finalized);
  const residual = finalizeResiduals(finalized);
  assert.equal(finalizeResiduals(residual), residual);
  assert.doesNotMatch(residual, /Math\.random|score\s*\|\|\s*(?:50|75|82)/);
});

test('a partial prior transformation cannot be accepted', () => {
  assert.throws(() => applyProductionTruth({ html: `${HTML_MARKER}${sourceFixture()}`, enhancements: enhancementsFixture() }), /partial prior transformation/);
});

test('public UI-00 runtime composition is byte-idempotent', () => {
  const truth = '/* truth */ JULVOX_PRODUCTION_TRUTH';
  const installer = '/* installer */ JULVOX_INSTALL_UI00_MUTATIONS';
  const first = composeUi00Runtime(truth, installer);
  assert.equal(composeUi00Runtime(first, installer), first);
  assert.ok(first.startsWith(RUNTIME_MARKER));
  assert.ok(first.indexOf('JULVOX_INSTALL_UI00_MUTATIONS') < first.indexOf('JULVOX_PRODUCTION_TRUTH'));
});
