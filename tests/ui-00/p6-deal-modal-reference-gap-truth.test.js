'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-deal-modal-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<script>',
  'function openDeal(id) {',
  '  const pct   = deal.discount_pct || 0;',
  '  const saved = deal.original_price ? (deal.original_price - deal.current_price).toFixed(2) : 0;',
  '  const html = `',
  '    ${deal.original_price ? `<span class="modal-price-old">${formatPrice(deal.original_price)}</span>` : \'\'}',
  '    ${pct > 0 ? `<span class="modal-save">−${Math.round(pct)}% · Économie ${saved}€</span>` : \'\'}',
  '  `;',
  '}',
  'P6_69_BUDGET_SAVINGS_TRUTH; P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH; P6_71_HOME_INFLUENCE_STATE_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.72 reframes deal-modal original price and savings as source-reference gaps', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('class="modal-price-old"'), false);
  assert.equal(hardened.includes('· Économie ${saved}€'), false);
  assert.equal(hardened.includes('Réf. source ${formatPrice(deal.original_price)}'), true);
  assert.equal(hardened.includes('Écart réf. source ${Math.round(pct)}% · ${saved}€'), true);
  assert.equal(hardened.includes('P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH'), true);
});

test('P6.72 preserves underlying deal-modal source data and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('const pct   = deal.discount_pct || 0;'), true);
  assert.equal(hardened.includes('const saved = deal.original_price ? (deal.original_price - deal.current_price).toFixed(2) : 0;'), true);
  assert.equal(hardened.includes('function openDeal(id)'), true);
  assert.equal(hardened.includes('P6_69_BUDGET_SAVINGS_TRUTH'), true);
  assert.equal(hardened.includes('P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_71_HOME_INFLUENCE_STATE_TRUTH'), true);
});

test('P6.72 is wired after P6.71 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p671Call = csp.indexOf('reconcileHomeInfluenceStateTruth();');
  const p672Call = csp.indexOf('reconcileDealModalReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p671Call >= 0 && p672Call > p671Call && readCall > p672Call);
});
