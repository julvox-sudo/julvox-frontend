'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-flash-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<script>',
  'async function fetchFlashDeals() {',
  "  const result = await window.JULVOX_API.get('/deals?is_flash=true&limit=8', {});",
  '}',
  'function renderFlashLive(flashDeals) {',
  '  return flashDeals.map(function(f) {',
  '    const pct = f.discount_pct ? Math.round(f.discount_pct) : 0;',
  '    return \'<div class="flash-badge">\' + (pct > 0 ? \'-\' + pct + \'%\' : \'Flash\') + \'</div>\' + \'x\';',
  '  });',
  '}',
  'function startCountdownsLive(flashDeals) {',
  "  if (!Number.isFinite(seconds) || seconds <= 0) { element.textContent = 'Expiration indisponible'; return; }",
  '}',
  'P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH; P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.76 reframes flash discount percentages as source-reference gaps', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes("(pct > 0 ? '-' + pct + '%' : 'Flash')"), false);
  assert.equal(hardened.includes("(pct > 0 ? 'Écart réf. ' + pct + '%' : 'Flash')"), true);
  assert.equal(hardened.includes('P6_76_FLASH_REFERENCE_GAP_TRUTH'), true);
});

test('P6.76 preserves real flash selection, expiry handling and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes("window.JULVOX_API.get('/deals?is_flash=true&limit=8'"), true);
  assert.equal(hardened.includes('const pct = f.discount_pct ? Math.round(f.discount_pct) : 0;'), true);
  assert.equal(hardened.includes('function startCountdownsLive(flashDeals) {'), true);
  assert.equal(hardened.includes("element.textContent = 'Expiration indisponible'"), true);
  assert.equal(hardened.includes('P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH'), true);
  assert.equal(hardened.includes('P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH'), true);
});

test('P6.76 is wired after P6.75 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p675Call = csp.indexOf('reconcileDealOfDayReferenceGapTruth();');
  const p676Call = csp.indexOf('reconcileFlashReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p675Call >= 0 && p676Call > p675Call && readCall > p676Call);
});
