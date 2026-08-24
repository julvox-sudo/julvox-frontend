'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { LEGACY_BLOCK, SAFE_BLOCK, hardenHtml } = require('../../scripts/reconcile-budget-detail-open-runtime');

const fixture = [
  '<html><body>',
  '<div data-budget-deal-index="0"></div>',
  '<script>',
  "const endpoint = '/budget/optimize';",
  'window.JulvoxDynamicDealTrust = {};',
  'function openDeal(id) { return id; }',
  'function renderBudgetResults(data, el) {',
  '  const trust = window.JulvoxDynamicDealTrust;',
  '  const deals = [];',
  LEGACY_BLOCK,
  '}',
  'P6_33_BUDGET_DEAL_HTML_TRUST;',
  'P6_69_BUDGET_SAVINGS_TRUTH;',
  'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH;',
  'P6_80_BUDGET_SELECTION_COPY_TRUTH;',
  'P6_82_SWIPE_HTML_TRUST;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.83 replaces the object opener with the ID-only contract exactly once', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('if (deal) openDeal(deal);'), false);
  assert.equal(hardened.includes('P6_83_BUDGET_DETAIL_OPEN_RUNTIME'), true);
  assert.equal(hardened.split('const id = deal ? trust.positiveId(deal.id) : null;').length - 1, 1);
  assert.equal(hardened.includes('openDeal(id);'), true);
});

test('P6.83 makes a Budget-only normalized deal resolvable by the existing modal', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('if (!deal || !id || !Array.isArray(allDeals)) return;'), true);
  assert.equal(hardened.includes('return trust.positiveId(item && item.id) === id;'), true);
  assert.equal(hardened.includes('if (!exists) allDeals.push(deal);'), true);
});

test('P6.83 preserves the hardened data-index boundary and previous truth lots', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('data-budget-deal-index'), true);
  assert.equal(hardened.includes('/budget/optimize'), true);
  for (const marker of [
    'P6_33_BUDGET_DEAL_HTML_TRUST',
    'P6_69_BUDGET_SAVINGS_TRUTH',
    'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH',
    'P6_80_BUDGET_SELECTION_COPY_TRUTH',
    'P6_82_SWIPE_HTML_TRUST',
  ]) assert.equal(hardened.includes(marker), true, marker);
});

test('P6.83 replacement block remains syntactically valid inside its runtime scope', () => {
  const body = [
    'const el = { querySelectorAll(){ return []; } };',
    'const deals = [];',
    'const allDeals = [];',
    'const trust = { positiveId(value){ return value; } };',
    'function openDeal(id) { return id; }',
    SAFE_BLOCK,
  ].join('\n');
  assert.doesNotThrow(() => new Function(body));
});

test('P6.83 is wired after P6.82 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p682Call = csp.indexOf('reconcileSwipeHtmlTrust();');
  const p683Call = csp.indexOf('reconcileBudgetDetailOpenRuntime();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p682Call >= 0 && p683Call > p682Call && readCall > p683Call);
});
