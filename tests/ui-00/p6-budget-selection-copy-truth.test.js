'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-budget-selection-copy-truth');

const fixture = [
  '<html><body>',
  '<button onclick="openPage(\'budgetPage\')">Budget</button>',
  '<div id="budgetPage">',
  "Définissez votre budget — Julvox sélectionne automatiquement les meilleurs deals pour maximiser votre pouvoir d'achat.",
  '<button onclick="runBudgetOptimize()">Lancer</button>',
  '</div>',
  '<script>',
  "const budgetEndpoint = '/budget/optimize';",
  'P6_69_BUDGET_SAVINGS_TRUTH; P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH; P6_79_SWIPE_REFERENCE_GAP_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.80 removes the unsupported best/maximize Budget promise', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes("sélectionne automatiquement les meilleurs deals pour maximiser votre pouvoir d'achat"), false);
  assert.equal(hardened.includes('sélectionne des offres compatibles avec ce montant à partir des données disponibles'), true);
  assert.equal(hardened.includes('P6_80_BUDGET_SELECTION_COPY_TRUTH'), true);
});

test('P6.80 preserves the real Budget entry point, endpoint and prior truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes("onclick=\"openPage('budgetPage')\""), true);
  assert.equal(hardened.includes('onclick="runBudgetOptimize()"'), true);
  assert.equal(hardened.includes('/budget/optimize'), true);
  assert.equal(hardened.includes('P6_69_BUDGET_SAVINGS_TRUTH'), true);
  assert.equal(hardened.includes('P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_79_SWIPE_REFERENCE_GAP_TRUTH'), true);
});

test('P6.80 is wired after P6.79 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p679Call = csp.indexOf('reconcileSwipeReferenceGapTruth();');
  const p680Call = csp.indexOf('reconcileBudgetSelectionCopyTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p679Call >= 0 && p680Call > p679Call && readCall > p680Call);
});
