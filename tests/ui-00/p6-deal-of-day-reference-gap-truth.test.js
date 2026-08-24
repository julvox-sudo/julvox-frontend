'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-deal-of-day-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<script>',
  'function renderDealOfDay(deal, el) {',
  '  window._currentDealOfDay = deal;',
  '  const discount = deal.discount_pct ? Math.round(deal.discount_pct) : 0;',
  '  el.innerHTML = `',
  '    ${deal.original_price ? `<div style="font-size:16px;text-decoration:line-through;color:rgba(255,255,255,.4);margin-bottom:4px">${deal.original_price}€</div>` : \'\'}',
  '    ${discount ? `<div style="background:var(--accent);color:#fff;font-size:13px;font-weight:700;padding:3px 10px;border-radius:8px;margin-bottom:2px">-${discount}%</div>` : \'\'}',
  '  `;',
  '}',
  'P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH;',
  '// P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH',
  'const sourceGap = Math.round(deal.discount_pct || 0);',
  'const text = `★ ${deal.name} à ${deal.current_price}€ (écart réf. source ${sourceGap}%) — Score Julvox`;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.75 reframes deal-of-day reference price and discount badge', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('text-decoration:line-through;color:rgba(255,255,255,.4)'), false);
  assert.equal(hardened.includes('>-${discount}%</div>'), false);
  assert.equal(hardened.includes('Réf. source ${deal.original_price}€'), true);
  assert.equal(hardened.includes('Écart réf. ${discount}%'), true);
  assert.equal(hardened.includes('P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH'), true);
});

test('P6.75 preserves deal-of-day data, P6.74 sharing and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('const discount = deal.discount_pct ? Math.round(deal.discount_pct) : 0;'), true);
  assert.equal(hardened.includes('window._currentDealOfDay = deal;'), true);
  assert.equal(hardened.includes('P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH'), true);
  assert.equal(hardened.includes('(écart réf. source ${sourceGap}%)'), true);
  assert.equal(hardened.includes('P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH'), true);
});

test('P6.75 is wired after P6.74 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p674Call = csp.indexOf('reconcileDealOfDayShareHandlerTruth();');
  const p675Call = csp.indexOf('reconcileDealOfDayReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p674Call >= 0 && p675Call > p674Call && readCall > p675Call);
});
