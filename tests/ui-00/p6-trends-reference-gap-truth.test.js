'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-trends-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<button id="bn-trends" onclick="openTrendsPage()">Tendances</button>',
  '<script>',
  'function openTrendsPage() {',
  '  const topDeals = [...allDeals].sort((a,b) => ui00ScoreSortValue(b.novadeal_score, b.score)-ui00ScoreSortValue(a.novadeal_score, a.score)).slice(0,10);',
  '  return topDeals.map(d => `',
  '    <div style="font-size:11px;color:var(--txt3)">${escHtml(d.store)} · −${Math.round(d.discount_pct||0)}%</div>',
  '  `).join(\'\');',
  '}',
  'P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH; P6_76_FLASH_REFERENCE_GAP_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.77 reframes trends discount percentages as source-reference gaps', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('${escHtml(d.store)} · −${Math.round(d.discount_pct||0)}%'), false);
  assert.equal(hardened.includes('${escHtml(d.store)} · Écart réf. ${Math.round(d.discount_pct||0)}%'), true);
  assert.equal(hardened.includes('P6_77_TRENDS_REFERENCE_GAP_TRUTH'), true);
});

test('P6.77 preserves trends entry point, score ordering and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('id="bn-trends" onclick="openTrendsPage()"'), true);
  assert.equal(hardened.includes('function openTrendsPage() {'), true);
  assert.equal(hardened.includes('const topDeals = [...allDeals].sort((a,b) => ui00ScoreSortValue(b.novadeal_score, b.score)-ui00ScoreSortValue(a.novadeal_score, a.score)).slice(0,10);'), true);
  assert.equal(hardened.includes('P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_76_FLASH_REFERENCE_GAP_TRUTH'), true);
});

test('P6.77 is wired after P6.76 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p676Call = csp.indexOf('reconcileFlashReferenceGapTruth();');
  const p677Call = csp.indexOf('reconcileTrendsReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p676Call >= 0 && p677Call > p676Call && readCall > p677Call);
});
