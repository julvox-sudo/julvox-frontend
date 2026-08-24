'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-home-influence-state-truth');

const fixture = [
  '<html><body>',
  '<div id="julvoxDecisionHome" data-product-realign="01B">',
  '<div class="pr01b-influence-copy"><strong>Aucun changement important confirmé pour le moment.</strong>',
  '<span>Julvox affichera ici uniquement les informations vérifiées susceptibles de modifier une décision en cours.</span></div>',
  '</div>',
  '<script>P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH; P6_69_BUDGET_SAVINGS_TRUTH;</script>',
  '</body></html>',
].join('\n');

test('P6.71 stops claiming a verified no-change state without an actual check', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Aucun changement important confirmé pour le moment.'), false);
  assert.equal(hardened.includes('Aucun suivi de changement n’est affiché ici pour le moment.'), true);
  assert.equal(hardened.includes('issues d’un suivi réel'), true);
  assert.equal(hardened.includes('P6_71_HOME_INFLUENCE_STATE_TRUTH'), true);
});

test('P6.71 preserves the PR01B home and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('data-product-realign="01B"'), true);
  assert.equal(hardened.includes('pr01b-influence-copy'), true);
  assert.equal(hardened.includes('P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_69_BUDGET_SAVINGS_TRUTH'), true);
});

test('P6.71 is wired after P6.70 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p670Call = csp.indexOf('reconcileBudgetCardReferenceGapTruth();');
  const p671Call = csp.indexOf('reconcileHomeInfluenceStateTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p670Call >= 0 && p671Call > p670Call && readCall > p671Call);
});
