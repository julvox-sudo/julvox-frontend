'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-budget-card-reference-gap-truth');

const fixture = [
  '<html><body><script>',
  "const endpoint = API + '/budget/optimize';",
  'const discount = finite(deal.discount_pct, 0);',
  '`<div>',
  '${discount > 0 ? `<div style="font-size:11px;color:var(--green)">-${Math.round(Math.min(100, discount))}%</div>` : \'\'}',
  '</div>`;',
  'P6_69_BUDGET_SAVINGS_TRUTH',
  'P6_68_ALERT_TARGET_SELECTION_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.70 labels the budget-card percentage as a source-reference gap', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('color:var(--green)">-${Math.round'), false);
  assert.equal(hardened.includes('Écart réf. source ${Math.round(Math.min(100, discount))}%'), true);
  assert.equal(hardened.includes('P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH'), true);
});

test('P6.70 preserves raw discount data, budget endpoint and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('const discount = finite(deal.discount_pct, 0);'), true);
  assert.equal(hardened.includes("API + '/budget/optimize'"), true);
  assert.equal(hardened.includes('P6_69_BUDGET_SAVINGS_TRUTH'), true);
  assert.equal(hardened.includes('P6_68_ALERT_TARGET_SELECTION_TRUTH'), true);
});

test('P6.70 is wired after P6.69 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p669Call = csp.indexOf('reconcileBudgetSavingsTruth();');
  const p670Call = csp.indexOf('reconcileBudgetCardReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p669Call >= 0 && p670Call > p669Call && readCall > p670Call);
});
