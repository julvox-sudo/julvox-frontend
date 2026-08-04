const test = require('node:test');
const assert = require('node:assert/strict');
const { finalizeHtml } = require('../../scripts/finalize-ui-00-production-truth.js');

test('removes arbitrary score fallbacks and remains idempotent', () => {
  const source = `const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';
  function card(d) { const score = d.novadeal_score || 50; const ok = score >= 70; return score; }`;
  const result = finalizeHtml(source);
  assert.doesNotMatch(result, /novadeal_score\s*\|\|\s*50/);
  assert.match(result, /function ui00ScoreLabel/);
  assert.equal(finalizeHtml(result), result);
});
