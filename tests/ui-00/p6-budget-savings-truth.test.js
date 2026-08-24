'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-budget-savings-truth');

const fixture = [
  '<html><body><script>',
  "const payload = { total_saved: 42, efficiency: 21 };",
  "const totalSaved = Math.max(0, Number(payload.total_saved));",
  "const efficiency = Math.max(0, Math.min(100, Number(payload.efficiency)));",
  "const deals = [{ id: 1 }];",
  "const endpoint = API + '/budget/optimize';",
  '`<div style="font-size:12px;color:rgba(255,255,255,.6)">ÉCONOMIES</div>',
  '<div class="budget-saved">+${totalSaved.toFixed(2)}€</div>',
  '<div class="budget-efficiency">⚡ Efficacité : ${Math.round(efficiency)}% — ${deals.length} deals</div>`;',
  'P6_68_ALERT_TARGET_SELECTION_TRUTH',
  'P6_67_PROMO_STATS_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.69 frames aggregate budget gap as source-reference data, not realized savings', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('>ÉCONOMIES</div>'), false);
  assert.equal(hardened.includes('class="budget-saved">+'), false);
  assert.equal(hardened.includes('⚡ Efficacité :'), false);
  assert.equal(hardened.includes('ÉCART VS RÉFÉRENCES SOURCE'), true);
  assert.equal(hardened.includes('il ne représente pas une économie réalisée'), true);
  assert.equal(hardened.includes('Sélection : ${deals.length} offres'), true);
});

test('P6.69 preserves budget endpoint, backend fields and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes("API + '/budget/optimize'"), true);
  assert.equal(hardened.includes('payload.total_saved'), true);
  assert.equal(hardened.includes('payload.efficiency'), true);
  assert.equal(hardened.includes('P6_68_ALERT_TARGET_SELECTION_TRUTH'), true);
  assert.equal(hardened.includes('P6_67_PROMO_STATS_TRUTH'), true);
});

test('P6.69 is wired after P6.68 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p668Call = csp.indexOf('reconcileAlertTargetSelectionTruth();');
  const p669Call = csp.indexOf('reconcileBudgetSavingsTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p668Call >= 0 && p669Call > p668Call && readCall > p669Call);
});
