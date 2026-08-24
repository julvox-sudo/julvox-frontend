'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-community-reference-gap-truth');

const fixture = [
  '<html><body>',
  '<button class="bn-item" id="bn-community" onclick="openCommunityPage()">Communauté</button>',
  '<script>',
  "const communityEndpoint = '/community/deals?status=approved&sort=';",
  'function renderCommDealCard(d) {',
  '  const pct = d.original_price && d.price ? Math.max(0, Math.min(100, Math.round((1 - d.price / d.original_price) * 100))) : 0;',
  '  const scoreLabel = \'👥 Déclaration communautaire · non vérifiée\';',
  '  return `',
  '    ${d.original_price !== null ? `<div style="font-size:11px;color:var(--txt3);text-decoration:line-through">${formatPrice(d.original_price)}</div>` : \'\'}',
  '    ${pct > 0 ? `<span class="comm-pct-badge">−${pct}%</span>` : \'\'}',
  '  `;',
  '}',
  'P6_35_COMMUNITY_CLAIM_CONTRACT_DOM_TRUST; P6_77_TRENDS_REFERENCE_GAP_TRUTH;',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.78 reframes community claimed reference prices without asserting a discount', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('text-decoration:line-through">${formatPrice(d.original_price)}'), false);
  assert.equal(hardened.includes('class="comm-pct-badge">−${pct}%'), false);
  assert.equal(hardened.includes('Réf. communautaire ${formatPrice(d.original_price)}'), true);
  assert.equal(hardened.includes('Écart réf. communautaire ${pct}%'), true);
  assert.equal(hardened.includes('P6_78_COMMUNITY_REFERENCE_GAP_TRUTH'), true);
});

test('P6.78 preserves claim status, percentage calculation, community entry point and prior truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('const pct = d.original_price && d.price ? Math.max(0, Math.min(100, Math.round((1 - d.price / d.original_price) * 100))) : 0;'), true);
  assert.equal(hardened.includes('Déclaration communautaire · non vérifiée'), true);
  assert.equal(hardened.includes('/community/deals?status=approved&sort='), true);
  assert.equal(hardened.includes('id="bn-community" onclick="openCommunityPage()"'), true);
  assert.equal(hardened.includes('P6_35_COMMUNITY_CLAIM_CONTRACT_DOM_TRUST'), true);
  assert.equal(hardened.includes('P6_77_TRENDS_REFERENCE_GAP_TRUTH'), true);
});

test('P6.78 is wired after P6.77 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p677Call = csp.indexOf('reconcileTrendsReferenceGapTruth();');
  const p678Call = csp.indexOf('reconcileCommunityReferenceGapTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p677Call >= 0 && p678Call > p677Call && readCall > p678Call);
});
