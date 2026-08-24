'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-main-grid-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<div class="hstat"><div class="hstat-v" id="statDiscount">—</div><div class="hstat-l">Réduction moy.</div></div>',
  '<button class="sort-btn" onclick="setSort(this,\'discount\')">% Remise</button>',
  '<script>',
  "if (currentSort === 'discount') return (b.discount_pct || 0) - (a.discount_pct || 0);",
  'const discounts = deals.map(deal => Number(deal.discount_pct)).filter(Number.isFinite);',
  'function dealCard(d) {',
  '  const pct    = d.discount_pct || 0;',
  "  const pOld   = d.original_price ? formatPrice(d.original_price) : '';",
  '  return `',
  '    ${pct > 0 ? `<div class="deal-pct${score>=90?\'\':\' gold\'}">−${Math.round(pct)}%</div>` : \'\'}',
  '    ${pOld ? `<span class="price-old">${pOld}</span>` : \'\'}',
  '  `;',
  '}',
  'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH; P6_71_HOME_INFLUENCE_STATE_TRUTH; P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.73 reframes main deal-grid discounts as source-reference gaps', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Réduction moy.'), false);
  assert.equal(hardened.includes('>% Remise</button>'), false);
  assert.equal(hardened.includes('>−${Math.round(pct)}%</div>'), false);
  assert.equal(hardened.includes('class="price-old">${pOld}</span>'), false);
  assert.equal(hardened.includes('Écart réf. moy.'), true);
  assert.equal(hardened.includes('>% Écart réf.</button>'), true);
  assert.equal(hardened.includes('Écart réf. ${Math.round(pct)}%'), true);
  assert.equal(hardened.includes('Réf. source ${pOld}'), true);
  assert.equal(hardened.includes('P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH'), true);
});

test('P6.73 preserves sort/calculation data and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes("if (currentSort === 'discount') return (b.discount_pct || 0) - (a.discount_pct || 0);"), true);
  assert.equal(hardened.includes('const discounts = deals.map(deal => Number(deal.discount_pct)).filter(Number.isFinite);'), true);
  assert.equal(hardened.includes('const pct    = d.discount_pct || 0;'), true);
  assert.equal(hardened.includes("const pOld   = d.original_price ? formatPrice(d.original_price) : '';"), true);
  assert.equal(hardened.includes('P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_71_HOME_INFLUENCE_STATE_TRUTH'), true);
  assert.equal(hardened.includes('P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH'), true);
});

test('P6.73 is wired after P6.72 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p672Call = csp.indexOf('reconcileDealModalReferenceGapTruth();');
  const p673Call = csp.indexOf('reconcileMainGridReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p672Call >= 0 && p673Call > p672Call && readCall > p673Call);
});
