'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-deal-of-day-share-handler-truth');

const fixture = [
  '<html><body>',
  '<script>',
  'async function openDealOfDay() {',
  "  const res  = await window.JULVOX_API.fetchResponse(API + '/deals?min_score=90&limit=1');",
  '}',
  'function renderDealOfDay(deal, el) {',
  '  window._currentDealOfDay = deal;',
  '  el.innerHTML = `',
  '    <div onclick="shareDealById(\'twitter\')"></div>',
  '    <div onclick="shareDealById(\'whatsapp\')"></div>',
  '    <div onclick="shareDealById(\'telegram\')"></div>',
  '    <div onclick="shareDealById(\'copy\')"></div>',
  '  `;',
  '}',
  '',
  'let favorites = new Set();',
  'P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH; P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH;',
  '/* ══ ATTENTE 📷 SCAN & SQUAD — ATTENTE 1000 users ══',
  'function shareDealById(platform) {',
  '  const deal = window._currentDealOfDay;',
  '}',
  '*/',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.74 restores a reachable deal-of-day share handler outside the dormant block', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH'), true);
  assert.equal(hardened.includes('const sourceGap = Math.round(deal.discount_pct || 0);'), true);
  assert.equal(hardened.includes('(écart réf. source ${sourceGap}%)'), true);
  assert.equal(hardened.includes("window.open(urls[platform], '_blank', 'noopener,noreferrer');"), true);
  const activeMarker = hardened.indexOf('// P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH');
  const favorites = hardened.indexOf('let favorites = new Set();');
  const dormant = hardened.indexOf('/* ══ ATTENTE 📷 SCAN & SQUAD — ATTENTE 1000 users ══');
  assert.ok(activeMarker >= 0 && favorites > activeMarker && dormant > favorites);
});

test('P6.74 preserves the four visible actions, deal state and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  for (const action of ['twitter', 'whatsapp', 'telegram', 'copy']) {
    assert.equal(hardened.includes(`shareDealById('${action}')`), true);
  }
  assert.equal(hardened.includes('window._currentDealOfDay = deal;'), true);
  assert.equal(hardened.includes('P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('/* ══ ATTENTE 📷 SCAN & SQUAD — ATTENTE 1000 users ══'), true);
});

test('P6.74 is wired after P6.73 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p673Call = csp.indexOf('reconcileMainGridReferenceGapTruth();');
  const p674Call = csp.indexOf('reconcileDealOfDayShareHandlerTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p673Call >= 0 && p674Call > p673Call && readCall > p674Call);
});
