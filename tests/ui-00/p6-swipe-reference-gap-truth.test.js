'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-swipe-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<script>',
  "if (openTarget === 'swipe')    openSwipePage();",
  "const path = '/deals/feed/swipe?limit=20' + (category ? '&category=' + encodeURIComponent(category) : '');",
  'function buildSwipeCard(deal, isTop) {',
  '  const score    = ui00ResolveScore(deal.novadeal_score);',
  "  const discount = deal.discount_pct ? `-${Math.round(deal.discount_pct)}%` : '';",
  '  return `',
  '    ${discount ? `<span style="background:rgba(255,92,43,.15);color:var(--accent);font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">${discount}</span>` : \'\'}',
  '    ${deal.original_price ? `<div style="font-size:14px;color:var(--txt3);text-decoration:line-through;margin-bottom:3px">${deal.original_price}€</div>` : \'\'}',
  '  `;',
  '}',
  'P6_78_COMMUNITY_REFERENCE_GAP_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.79 reframes Swipe discount and old-price signals as source-reference gaps', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes("const discount = deal.discount_pct ? `-${Math.round(deal.discount_pct)}%` : '';"), false);
  assert.equal(hardened.includes('background:rgba(255,92,43,.15);color:var(--accent)'), false);
  assert.equal(hardened.includes('text-decoration:line-through;margin-bottom:3px">${deal.original_price}€'), false);
  assert.equal(hardened.includes('const discount = deal.discount_pct ? `Écart réf. ${Math.round(deal.discount_pct)}%`'), true);
  assert.equal(hardened.includes('Réf. source ${deal.original_price}€'), true);
  assert.equal(hardened.includes('P6_79_SWIPE_REFERENCE_GAP_TRUTH'), true);
});

test('P6.79 preserves Swipe deep-link, authenticated feed, score and P6.78 boundary', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes("if (openTarget === 'swipe')    openSwipePage();"), true);
  assert.equal(hardened.includes('/deals/feed/swipe?limit=20'), true);
  assert.equal(hardened.includes('function buildSwipeCard(deal, isTop) {'), true);
  assert.equal(hardened.includes('const score    = ui00ResolveScore(deal.novadeal_score);'), true);
  assert.equal(hardened.includes('P6_78_COMMUNITY_REFERENCE_GAP_TRUTH'), true);
});

test('P6.79 is wired after P6.78 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p678Call = csp.indexOf('reconcileCommunityReferenceGapTruth();');
  const p679Call = csp.indexOf('reconcileSwipeReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p678Call >= 0 && p679Call > p678Call && readCall > p679Call);
});
