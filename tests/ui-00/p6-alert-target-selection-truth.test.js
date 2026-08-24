'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-alert-target-selection-truth');

const fixture = [
  '<html><body><script>',
  'P6_66_ALERT_ONBOARDING_TARGET_TRUTH',
  'P6_67_PROMO_STATS_TRUTH',
  "const ONBOARD_STEPS = [{ emoji:'🔔', title:'Alertes prix personnalisées', text:'Depuis une offre affichée, crée une alerte au prix observé. Julvox peut ensuite envoyer un email si une offre correspondante répond aux conditions de l’alerte.' /* P6_66_ALERT_ONBOARDING_TARGET_TRUTH */ }];",
  'function findDeal(id) { return { id, name: "Produit", current_price: 100 }; }',
  'function text(value) { return String(value); }',
  "function createAlertFromDeal(id) {\n    var deal = findDeal(id);\n    if (deal && typeof window.createAlert === 'function') window.createAlert(text(deal.name, 300), Number(deal.current_price));\n  }\n",
  '</script></body></html>',
].join('\n');

test('P6.68 requires an explicit target below the observed current price', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Number(deal.current_price));'), false);
  assert.equal(hardened.includes('window.prompt('), true);
  assert.equal(hardened.includes('targetPrice >= currentPrice'), true);
  assert.equal(hardened.includes('window.createAlert(text(deal.name, 300), targetPrice)'), true);
  assert.equal(hardened.includes('P6_68_ALERT_TARGET_SELECTION_TRUTH'), true);
});

test('P6.68 aligns onboarding copy with the explicit target selection flow', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('crée une alerte au prix observé'), false);
  assert.equal(hardened.includes('choisis un prix cible inférieur au prix observé'), true);
  assert.equal(hardened.includes('peut ensuite envoyer un email'), true);
  assert.equal(hardened.includes('P6_66_ALERT_ONBOARDING_TARGET_TRUTH'), true);
  assert.equal(hardened.includes('P6_67_PROMO_STATS_TRUTH'), true);
});

test('P6.68 is wired after P6.67 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p667Call = csp.indexOf('reconcilePromoStatsTruth();');
  const p668Call = csp.indexOf('reconcileAlertTargetSelectionTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p667Call >= 0 && p668Call > p667Call && readCall > p668Call);
});
