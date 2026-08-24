'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  DEAL_TRUST_AUTHORITY,
  EXPECTED_CARD_SHA256,
  hardenCardBlock,
} = require('../../scripts/reconcile-swipe-html-trust');

const LEGACY_CARD = `function buildSwipeCard(deal, isTop) {
  const score    = ui00ResolveScore(deal.novadeal_score);
  const discount = deal.discount_pct ? \`Écart réf. \${Math.round(deal.discount_pct)}%\` : '';
  const scColor  = score >= 85 ? '#00D084' : score >= 65 ? '#FFB800' : '#FF5C2B';

  const card = document.createElement('div');
  card.className = 'swipe-card';
  card.innerHTML = \`
    <div class="swipe-img">\${(deal.image_url && deal.image_url.startsWith('http')) ? \`<img src="\${deal.image_url}" alt="\${deal.name}" onerror="this.style.display='none';this.parentNode.textContent='\${getCatEmoji(deal.category)}'"/>\` : getCatEmoji(deal.category)}</div>
    <div class="swipe-name">\${deal.name}</div>
    <div>\${deal.store || ''}</div>
    <div>\${deal.current_price}€</div>
    \${deal.original_price ? \`<div>Réf. source \${deal.original_price}€</div>\` : ''}<!-- P6_79_SWIPE_REFERENCE_GAP_TRUTH -->
    \${deal.is_fake ? '<span>suspect</span>' : ''}
  \`;
  return card;
}

`;

test('P6.82 keeps the exact P6.81 Swipe card calibration hash', () => {
  assert.equal(
    EXPECTED_CARD_SHA256,
    '873cc6e5ef20ced512bc409da3f17b0960447d8c5a34b978d304a48960e77722',
  );
});

test('P6.82 normalizes and escapes dynamic Swipe deal fields before innerHTML', () => {
  const hardened = hardenCardBlock(LEGACY_CARD);
  assert.equal(hardened.includes("trust.normalizeDeal(deal, true)"), true);
  assert.equal(hardened.includes("const safeName = trust.html(safeDeal.name);"), true);
  assert.equal(hardened.includes("const safeStore = trust.html(safeDeal.store || '');"), true);
  assert.equal(hardened.includes("const safeImage = trust.html(safeDeal.image_url || '');"), true);
  assert.equal(hardened.includes("const safeEmoji = trust.html(getCatEmoji(safeDeal.category));"), true);
  assert.equal(hardened.includes('src="${safeImage}"'), true);
  assert.equal(hardened.includes('alt="${safeName}"'), true);
  assert.equal(hardened.includes('<div class="swipe-name">${safeName}</div>'), true);
  assert.equal(hardened.includes('${safeStore}'), true);
});

test('P6.82 removes raw Swipe text and URL sinks and avoids recursive safeEmoji rewrite', () => {
  const hardened = hardenCardBlock(LEGACY_CARD);
  for (const forbidden of [
    'src="${deal.image_url}"',
    'alt="${deal.name}"',
    '<div class="swipe-name">${deal.name}</div>',
    "${deal.store || ''}",
    'trust.html(safeEmoji)',
  ]) {
    assert.equal(hardened.includes(forbidden), false, forbidden);
  }
  assert.equal(hardened.includes('P6_79_SWIPE_REFERENCE_GAP_TRUTH'), true);
  assert.doesNotThrow(() => new Function(hardened));
});

test('P6.82 reuses the concrete P6.28 deal trust authority instead of defining a second one', () => {
  const finalizer = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'reconcile-swipe-html-trust.js'),
    'utf8',
  );
  assert.equal(DEAL_TRUST_AUTHORITY, 'window.JulvoxDynamicDealTrust = Object.freeze({');
  assert.equal(finalizer.includes(DEAL_TRUST_AUTHORITY), true);
  assert.equal(finalizer.includes('window.JulvoxSwipeTrust ='), false);
  assert.equal(finalizer.includes("swipeTrust.normalizeDeal(deal, true)"), true);
});

test('P6.82 is wired after P6.81 and before CSP hashing', () => {
  const csp = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'),
    'utf8',
  );
  const p681Call = csp.indexOf('reconcileSwipeRuntimeActions();');
  const p682Call = csp.indexOf('reconcileSwipeHtmlTrust();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p681Call >= 0 && p682Call > p681Call && readCall > p682Call);
});
