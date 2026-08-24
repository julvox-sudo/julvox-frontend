'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-promo-points-truth');

const fixture = [
  '<html><body>',
  'async function submitPromoCode()',
  'window.JULVOX_API.fetchResponse(`${API}/promos`,',
  "method: 'POST'",
  'showToast(`🏷️ Code "${code}" ajouté ! +10 pts`);',
  'await loadAndRenderPromos();',
  'P6_59_LEGACY_PRICE_COMPARISON_TRUTH',
  '</body></html>',
].join('\n');

test('P6.60 removes only the unpersisted promo points promise', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('+10 pts'), false);
  assert.equal(hardened.includes('Code "${code}" ajouté !'), true);
  assert.equal(hardened.includes('P6_60_PROMO_POINTS_TRUTH'), true);
});

test('P6.60 preserves the real promo submission boundary', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('async function submitPromoCode()'), true);
  assert.equal(hardened.includes('window.JULVOX_API.fetchResponse(`${API}/promos`,'), true);
  assert.equal(hardened.includes("method: 'POST'"), true);
  assert.equal(hardened.includes('await loadAndRenderPromos();'), true);
  assert.equal(hardened.includes('P6_59_LEGACY_PRICE_COMPARISON_TRUTH'), true);
});

test('P6.60 is wired after P6.59 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p659Call = csp.indexOf('reconcileLegacyPriceComparisonTruth();');
  const p660Call = csp.indexOf('reconcilePromoPointsTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p659Call >= 0 && p660Call > p659Call && readCall > p660Call);
});
