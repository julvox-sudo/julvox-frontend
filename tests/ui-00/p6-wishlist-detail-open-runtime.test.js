'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { LEGACY_BLOCK, SAFE_BLOCK, hardenHtml } = require('../../scripts/reconcile-wishlist-detail-open-runtime');

const fixture = [
  '<html><body>',
  '<button data-wishlist-open-deal="7">Voir le deal</button>',
  '<script>',
  'window.JulvoxDynamicDealTrust = Object.freeze({});',
  'function openDeal(id) { return id; }',
  LEGACY_BLOCK,
  'P6_34_WISHLIST_HTML_TRUST;',
  'P6_41_FAVORITES_LOCAL_TRUTH;',
  'P6_83_BUDGET_DETAIL_OPEN_RUNTIME;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.84 replaces Wishlist object opening with the ID-only modal contract', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('if (data.id) openDeal(data);'), false);
  assert.equal(hardened.includes('P6_84_WISHLIST_DETAIL_OPEN_RUNTIME'), true);
  assert.equal(hardened.includes('openDeal(resolvedId);'), true);
});

test('P6.84 normalizes fetched detail and binds it to the requested positive ID', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes("trust.positiveId(dealId)"), true);
  assert.equal(hardened.includes('trust.normalizeDeal(data, true);'), true);
  assert.equal(hardened.includes('resolvedId !== requestedId'), true);
});

test('P6.84 refreshes or inserts only the normalized fetched deal in allDeals', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('allDeals.findIndex(function(item)'), true);
  assert.equal(hardened.includes('allDeals[existingIndex] = deal;'), true);
  assert.equal(hardened.includes('else allDeals.push(deal);'), true);
});

test('P6.84 preserves the P6.34 Wishlist handler boundary and prior local-favorites truth', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('data-wishlist-open-deal'), true);
  assert.equal(hardened.includes('P6_34_WISHLIST_HTML_TRUST'), true);
  assert.equal(hardened.includes('P6_41_FAVORITES_LOCAL_TRUTH'), true);
  assert.equal(hardened.includes('P6_83_BUDGET_DETAIL_OPEN_RUNTIME'), true);
});

test('P6.84 safe opener block is syntactically valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(SAFE_BLOCK));
});

test('P6.84 is wired after P6.83 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p683Call = csp.indexOf('reconcileBudgetDetailOpenRuntime();');
  const p684Call = csp.indexOf('reconcileWishlistDetailOpenRuntime();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p683Call >= 0 && p684Call > p683Call && readCall > p684Call);
});
