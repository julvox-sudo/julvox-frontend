const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LEGACY_WISHLIST_TARGET,
  SAFE_WISHLIST_TARGET,
  finalizeHtml,
} = require('../../scripts/finalize-ui-00-production-truth.js');

test('removes arbitrary score fallbacks and remains idempotent', () => {
  const source = `const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';
  function card(d) { const score = d.novadeal_score || 50; const ok = score >= 70; return score; }`;
  const result = finalizeHtml(source);
  assert.doesNotMatch(result, /novadeal_score\s*\|\|\s*50/);
  assert.match(result, /function ui00ScoreLabel/);
  assert.equal(finalizeHtml(result), result);
});

test('does not render an unknown wishlist market price as a reached target', () => {
  const source = `const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';
  function target(item) { return ${LEGACY_WISHLIST_TARGET}; }`;
  const result = finalizeHtml(source);
  assert.doesNotMatch(result, /item\.current_best_price <= item\.target_price \? '✅ ATTEINT !'/);
  assert.ok(result.includes(SAFE_WISHLIST_TARGET));

  const evaluate = new Function('item', `return ${SAFE_WISHLIST_TARGET};`);
  assert.equal(evaluate({ current_best_price: null, target_price: 100 }), 'Prix actuel non observé');
  assert.equal(evaluate({ current_best_price: 90, target_price: 100 }), '✅ ATTEINT !');
  assert.equal(evaluate({ current_best_price: 120, target_price: 100 }), '(encore 20€ à baisser)');
});
